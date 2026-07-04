// Hydro reward Edge Function
// Validates a contribution and pays $HYDRO on Base from the treasury wallet.
//
// Required function secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-available in Edge runtime)
//   BASE_RPC_URL            e.g. https://mainnet.base.org  (or Base Sepolia)
//   HYDRO_TOKEN_ADDRESS     0x... ERC-20 $HYDRO contract on Base
//   TREASURY_PRIVATE_KEY    0x... funded wallet that holds $HYDRO + gas
//   HYDRO_DECIMALS          token decimals (default 18)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  getContract,
} from "https://esm.sh/viem@2.21.0";
import { privateKeyToAccount } from "https://esm.sh/viem@2.21.0/accounts";
import { base, baseSepolia } from "https://esm.sh/viem@2.21.0/chains";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { contribution_id } = await req.json();
    if (!contribution_id) return json({ error: "contribution_id required" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Identify caller from their JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);

    // 2. Service client bypasses RLS for verified writes.
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: contrib, error: cErr } = await admin
      .from("contributions")
      .select("id,user_id,status,duration_sec,wallet_address,task_id,tasks(reward)")
      .eq("id", contribution_id)
      .single();
    if (cErr || !contrib) return json({ error: "contribution not found" }, 404);
    if (contrib.user_id !== uid) return json({ error: "forbidden" }, 403);
    if (contrib.status === "rewarded") {
      return json({ error: "already rewarded" }, 409);
    }

    // 3. Simple L1 rule validation (spec: duration in a sensible range).
    const dur = contrib.duration_sec ?? 0;
    if (dur < 3 || dur > 60) {
      await admin.from("contributions").update({ status: "rejected" }).eq("id", contribution_id);
      return json({ error: "clip length out of range", status: "rejected" }, 422);
    }

    const reward = (contrib as any).tasks?.reward ?? 0;
    const wallet = contrib.wallet_address as string | null;

    // 4. Pay on-chain if a wallet + treasury are configured.
    let txHash: string | null = null;
    const pk = Deno.env.get("TREASURY_PRIVATE_KEY");
    const token = Deno.env.get("HYDRO_TOKEN_ADDRESS");
    const rpc = Deno.env.get("BASE_RPC_URL");
    if (pk && token && rpc && wallet) {
      const chain = rpc.includes("sepolia") ? baseSepolia : base;
      const account = privateKeyToAccount(pk as `0x${string}`);
      const walletClient = createWalletClient({ account, chain, transport: http(rpc) });
      const publicClient = createPublicClient({ chain, transport: http(rpc) });
      const decimals = Number(Deno.env.get("HYDRO_DECIMALS") ?? "18");
      const contract = getContract({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        client: walletClient,
      });
      txHash = await contract.write.transfer([
        wallet as `0x${string}`,
        parseUnits(String(reward), decimals),
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
    }

    // 5. Record the result.
    await admin
      .from("contributions")
      .update({ status: "rewarded", reward, tx_hash: txHash })
      .eq("id", contribution_id);

    return json({ reward, tx_hash: txHash, status: "rewarded" });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
