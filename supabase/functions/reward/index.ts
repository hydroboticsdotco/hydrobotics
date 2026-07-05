// Hydro reward Edge Function
//
// Flow: authenticate caller -> load contribution + task -> download the
// uploaded video frames -> ask an OpenAI vision model whether the clip really
// shows the task -> only credit $HYDRO if it passes. Optionally pays on-chain
// if a treasury is configured (off by default for MVP1).
//
// Auto-injected secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Required secret:        OPENAI_API_KEY
// Optional (on-chain):    BASE_RPC_URL, HYDRO_TOKEN_ADDRESS, TREASURY_PRIVATE_KEY, HYDRO_DECIMALS

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const APPROVE_THRESHOLD = 55;

type Verdict = { approved: boolean; score: number; reason: string };

async function reviewWithOpenAI(
  apiKey: string,
  taskName: string,
  taskPrompt: string,
  imageDataUrls: string[]
): Promise<Verdict> {
  const system =
    "You are a strict data-quality reviewer for a robotics training dataset. " +
    "You are shown a few frames sampled from a short user-recorded video that is " +
    "supposed to demonstrate a specific real-world manipulation task. Judge whether " +
    "the frames genuinely show a person performing THAT task, with the relevant hands " +
    "and objects clearly visible. Reject blank/black frames, screenshots, selfies, " +
    "unrelated scenes, or clips where the described action is not actually happening. " +
    'Respond ONLY as JSON: {"approved": boolean, "score": number (0-100), "reason": string (max 25 words)}.';

  const userContent: any[] = [
    {
      type: "text",
      text:
        `Task: "${taskName}".\nInstructions given to the user: "${taskPrompt}".\n` +
        "Do these frames show this task being performed? Be strict.",
    },
    ...imageDataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  const score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));
  const approved = Boolean(parsed.approved) && score >= APPROVE_THRESHOLD;
  const reason = String(parsed.reason ?? "No reason provided.").slice(0, 240);
  return { approved, score, reason };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { contribution_id, frame_paths } = await req.json();
    if (!contribution_id) return json({ error: "contribution_id required" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    // 1. Identify caller.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);

    // 2. Load contribution + task (service role bypasses RLS).
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: contrib, error: cErr } = await admin
      .from("contributions")
      .select("id,user_id,status,duration_sec,wallet_address,task_id,frame_paths,tasks(name,prompt,reward)")
      .eq("id", contribution_id)
      .single();
    if (cErr || !contrib) return json({ error: "contribution not found" }, 404);
    if (contrib.user_id !== uid) return json({ error: "forbidden" }, 403);
    if (contrib.status === "rewarded") return json({ error: "already rewarded" }, 409);

    const task = (contrib as any).tasks;
    const rewardAmount = task?.reward ?? 0;
    const wallet = contrib.wallet_address as string | null;

    // 3. Duration sanity.
    const dur = contrib.duration_sec ?? 0;
    if (dur < 3 || dur > 90) {
      await admin
        .from("contributions")
        .update({ status: "rejected", reward: 0, ai_reason: "Clip length out of range." })
        .eq("id", contribution_id);
      return json({ status: "rejected", reward: 0, ai_score: null, ai_reason: "Clip length out of range." }, 200);
    }

    // 4. Gather frame paths (from body or the stored row).
    const paths: string[] =
      (Array.isArray(frame_paths) && frame_paths.length > 0
        ? frame_paths
        : (contrib as any).frame_paths) ?? [];

    if (!OPENAI_API_KEY || paths.length === 0) {
      // Can't run AI review — never auto-reward; leave for manual review.
      const reason = !OPENAI_API_KEY
        ? "AI reviewer not configured yet."
        : "No frames available to analyze.";
      await admin
        .from("contributions")
        .update({ status: "pending_review", reward: 0, ai_reason: reason })
        .eq("id", contribution_id);
      return json({ status: "pending_review", reward: 0, ai_score: null, ai_reason: reason }, 200);
    }

    // 5. Download frames -> base64 data URLs.
    const dataUrls: string[] = [];
    for (const p of paths.slice(0, 4)) {
      const { data: blob, error: dErr } = await admin.storage.from("recordings").download(p);
      if (dErr || !blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      dataUrls.push(`data:image/jpeg;base64,${encodeBase64(bytes)}`);
    }
    if (dataUrls.length === 0) {
      await admin
        .from("contributions")
        .update({ status: "pending_review", reward: 0, ai_reason: "Could not read frames." })
        .eq("id", contribution_id);
      return json({ status: "pending_review", reward: 0, ai_score: null, ai_reason: "Could not read frames." }, 200);
    }

    // 6. AI review.
    const verdict = await reviewWithOpenAI(
      OPENAI_API_KEY,
      task?.name ?? contrib.task_id,
      task?.prompt ?? "",
      dataUrls
    );

    if (!verdict.approved) {
      await admin
        .from("contributions")
        .update({
          status: "rejected",
          reward: 0,
          ai_score: verdict.score,
          ai_reason: verdict.reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", contribution_id);
      return json(
        { status: "rejected", reward: 0, ai_score: verdict.score, ai_reason: verdict.reason },
        200
      );
    }

    // 7. Approved — optional on-chain payment (off unless treasury configured).
    let txHash: string | null = null;
    const pk = Deno.env.get("TREASURY_PRIVATE_KEY");
    const token = Deno.env.get("HYDRO_TOKEN_ADDRESS");
    const rpc = Deno.env.get("BASE_RPC_URL");
    if (pk && token && rpc && wallet) {
      try {
        const { createPublicClient, createWalletClient, http, parseUnits, getContract } =
          await import("https://esm.sh/viem@2.21.0");
        const { privateKeyToAccount } = await import("https://esm.sh/viem@2.21.0/accounts");
        const { base, baseSepolia } = await import("https://esm.sh/viem@2.21.0/chains");
        const ERC20_ABI = [
          {
            type: "function",
            name: "transfer",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ] as const;
        const chain = rpc.includes("sepolia") ? baseSepolia : base;
        const account = privateKeyToAccount(pk as `0x${string}`);
        const walletClient = createWalletClient({ account, chain, transport: http(rpc) });
        const publicClient = createPublicClient({ chain, transport: http(rpc) });
        const decimals = Number(Deno.env.get("HYDRO_DECIMALS") ?? "18");
        const contract = getContract({ address: token as `0x${string}`, abi: ERC20_ABI, client: walletClient });
        txHash = await contract.write.transfer([
          wallet as `0x${string}`,
          parseUnits(String(rewardAmount), decimals),
        ]);
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      } catch (_e) {
        txHash = null; // fall back to off-chain accounting
      }
    }

    // 8. Record the reward.
    await admin
      .from("contributions")
      .update({
        status: "rewarded",
        reward: rewardAmount,
        tx_hash: txHash,
        ai_score: verdict.score,
        ai_reason: verdict.reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", contribution_id);

    return json({
      status: "rewarded",
      reward: rewardAmount,
      tx_hash: txHash,
      ai_score: verdict.score,
      ai_reason: verdict.reason,
    });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
