import { TASKS as LOCAL_TASKS, type Task } from "../data/tasks";
import { supabase } from "./supabase";

export type ContributionRow = {
  id: string;
  taskId: string;
  taskName: string;
  reward: number;
  durationSec: number;
  status: string;
  txHash: string | null;
  videoPath: string | null;
  createdAt: number;
};

/** Task list — real Supabase table, falls back to local seed if unconfigured. */
export async function fetchTasks(): Promise<Task[]> {
  if (!supabase) return LOCAL_TASKS;
  const { data, error } = await supabase
    .from("tasks")
    .select("id,name,category,duration_sec,reward,prompt")
    .eq("active", true)
    .order("sort", { ascending: true });
  if (error || !data) return LOCAL_TASKS;
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    durationSec: r.duration_sec,
    reward: r.reward,
    prompt: r.prompt,
  }));
}

export async function upsertWallet(userId: string, wallet: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .upsert({ id: userId, wallet_address: wallet, updated_at: new Date().toISOString() });
}

export async function fetchContributions(userId: string): Promise<ContributionRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("contributions")
    .select("id,task_id,duration_sec,reward,status,tx_hash,video_path,created_at,tasks(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    taskId: r.task_id,
    taskName: r.tasks?.name ?? r.task_id,
    reward: r.reward,
    durationSec: r.duration_sec,
    status: r.status,
    txHash: r.tx_hash,
    videoPath: r.video_path,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

/** Uploads the recorded video file to private storage: recordings/<uid>/<file>. */
export async function uploadRecording(
  userId: string,
  taskId: string,
  uri: string
): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const res = await fetch(uri);
  const bytes = await res.arrayBuffer();
  const ext = uri.split(".").pop()?.split("?")[0] || "mov";
  const path = `${userId}/${taskId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("recordings").upload(path, bytes, {
    contentType: ext === "mp4" ? "video/mp4" : "video/quicktime",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function createContribution(params: {
  userId: string;
  taskId: string;
  wallet: string | null;
  videoPath: string | null;
  durationSec: number;
}): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("contributions")
    .insert({
      user_id: params.userId,
      task_id: params.taskId,
      wallet_address: params.wallet,
      video_path: params.videoPath,
      duration_sec: params.durationSec,
      status: "pending_review",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Triggers the on-chain reward. The `reward` Edge Function (service role)
 * validates the contribution, transfers $HYDRO from the treasury wallet on
 * Base, and updates the row with reward + tx_hash. Returns {reward, txHash}.
 */
export async function requestReward(
  contributionId: string
): Promise<{ reward: number; txHash: string | null }> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke("reward", {
    body: { contribution_id: contributionId },
  });
  if (error) throw error;
  return { reward: data?.reward ?? 0, txHash: data?.tx_hash ?? null };
}
