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
  aiScore: number | null;
  aiReason: string | null;
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
    .select(
      "id,task_id,duration_sec,reward,status,tx_hash,video_path,ai_score,ai_reason,created_at,tasks(name)"
    )
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
    aiScore: r.ai_score ?? null,
    aiReason: r.ai_reason ?? null,
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

/** Uploads a single extracted video frame (jpeg) for AI review. */
export async function uploadFrame(
  userId: string,
  taskId: string,
  uri: string,
  index: number
): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const res = await fetch(uri);
  const bytes = await res.arrayBuffer();
  const path = `${userId}/frames/${taskId}-${Date.now()}-${index}.jpg`;
  const { error } = await supabase.storage.from("recordings").upload(path, bytes, {
    contentType: "image/jpeg",
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
  framePaths: string[];
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
      frame_paths: params.framePaths,
      duration_sec: params.durationSec,
      status: "pending_review",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export type RewardResult = {
  reward: number;
  txHash: string | null;
  status: string; // rewarded | rejected
  aiScore: number | null;
  aiReason: string | null;
};

/**
 * Triggers AI review + reward. The `reward` Edge Function (service role)
 * downloads the uploaded frames, asks a vision model whether the clip truly
 * shows the task, and only credits $HYDRO if it passes. Returns the verdict.
 */
export async function requestReward(
  contributionId: string,
  framePaths: string[]
): Promise<RewardResult> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke("reward", {
    body: { contribution_id: contributionId, frame_paths: framePaths },
  });
  if (error) throw error;
  return {
    reward: data?.reward ?? 0,
    txHash: data?.tx_hash ?? null,
    status: data?.status ?? "pending_review",
    aiScore: data?.ai_score ?? null,
    aiReason: data?.ai_reason ?? null,
  };
}
