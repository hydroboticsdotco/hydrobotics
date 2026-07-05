import { useLocalSearchParams, useRouter } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { getTask } from "../data/tasks";
import {
  createContribution,
  requestReward,
  uploadFrame,
  uploadRecording,
} from "../lib/api";
import { useApp } from "../store";
import { colors, font, radius, spacing } from "../theme";
import { Card, HydroMark, Pill, PrimaryButton, Screen } from "../ui";

type Phase = "confirm" | "extracting" | "uploading" | "reviewing" | "done" | "error";

export default function Upload() {
  const router = useRouter();
  const { taskId, duration, uri } = useLocalSearchParams<{
    taskId: string;
    duration: string;
    uri: string;
  }>();
  const task = getTask(taskId);
  const durationSec = Number(duration) || 0;
  const videoUri = uri && uri.length > 0 ? uri : null;

  const { userId, address, supabaseReady, refresh, addLocalContribution } = useApp();

  const [phase, setPhase] = useState<Phase>("confirm");
  const [earned, setEarned] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const tooShort = durationSec > 0 && durationSec < 3;
  const busy = phase === "extracting" || phase === "uploading" || phase === "reviewing";

  useEffect(() => {
    if (phase !== "uploading") return;
    progress.stopAnimation();
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 0.92,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [phase]);

  const finishBar = () => {
    Animated.timing(progress, { toValue: 1, duration: 300, useNativeDriver: false }).start();
  };

  const extractFrames = async (videoUriIn: string): Promise<string[]> => {
    const fractions = [0.15, 0.5, 0.85];
    const frames: string[] = [];
    for (const f of fractions) {
      const t = durationSec > 0 ? Math.floor(f * durationSec * 1000) : Math.floor(f * 3000);
      try {
        const { uri: frameUri } = await VideoThumbnails.getThumbnailAsync(videoUriIn, {
          time: t,
          quality: 0.6,
        });
        frames.push(frameUri);
      } catch {
        // skip a frame we couldn't grab
      }
    }
    return frames;
  };

  const run = async () => {
    setErr(null);
    try {
      if (supabaseReady && userId && videoUri) {
        // 1. Extract frames on device for the AI reviewer.
        setPhase("extracting");
        const frameUris = await extractFrames(videoUri);

        // 2. Upload video + frames.
        setPhase("uploading");
        const videoPath = await uploadRecording(userId, task!.id, videoUri);
        const framePaths: string[] = [];
        for (let i = 0; i < frameUris.length; i++) {
          try {
            framePaths.push(await uploadFrame(userId, task!.id, frameUris[i], i));
          } catch {
            // a failed frame upload is non-fatal
          }
        }
        const contribId = await createContribution({
          userId,
          taskId: task!.id,
          wallet: address,
          videoPath,
          framePaths,
          durationSec,
        });
        finishBar();

        // 3. AI review + reward decision.
        setPhase("reviewing");
        const res = await requestReward(contribId, framePaths);
        setEarned(res.reward);
        setStatus(res.status);
        setAiScore(res.aiScore);
        setAiReason(res.aiReason);
        await refresh();
        setPhase("done");
      } else if (supabaseReady && userId && !videoUri) {
        // No real video (e.g. simulator): store it, but never auto-reward.
        setPhase("uploading");
        const contribId = await createContribution({
          userId,
          taskId: task!.id,
          wallet: address,
          videoPath: null,
          framePaths: [],
          durationSec,
        });
        void contribId;
        setStatus("pending_review");
        setEarned(0);
        setAiReason("No video was captured to analyze (simulated run).");
        finishBar();
        setPhase("done");
      } else {
        // Supabase not configured — local demo fallback.
        setPhase("uploading");
        await new Promise((r) => setTimeout(r, 1400));
        const entry = await addLocalContribution(task!, durationSec);
        setEarned(entry.reward);
        setStatus("rewarded");
        finishBar();
        setPhase("done");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong. Please try again.");
      setPhase("error");
    }
  };

  if (!task) {
    return (
      <Screen style={{ justifyContent: "center" }}>
        <Text style={styles.h1}>Task not found.</Text>
        <PrimaryButton title="Back to tasks" onPress={() => router.replace("/tasks")} />
      </Screen>
    );
  }

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  if (phase === "done") {
    const rewarded = status === "rewarded" && earned > 0;
    const rejected = status === "rejected";
    return (
      <Screen style={styles.wrap}>
        <View style={styles.center}>
          {rejected ? (
            <View style={styles.errIcon}>
              <Text style={styles.errMark}>✕</Text>
            </View>
          ) : (
            <HydroMark size={72} />
          )}

          <Text style={styles.congrats}>
            {rewarded ? "Approved & rewarded!" : rejected ? "Not approved" : "Submitted"}
          </Text>

          {rewarded ? (
            <>
              <View style={styles.rewardBig}>
                <Text style={styles.rewardBigNum}>+{earned}</Text>
                <Text style={styles.rewardBigLabel}>$HYDRO</Text>
              </View>
              <Text style={styles.doneSub}>
                Our AI reviewed your clip and confirmed it shows “{task.name}”.
                Added to your in-app balance — claimable at token launch.
              </Text>
            </>
          ) : rejected ? (
            <Text style={styles.doneSub}>
              {aiReason ??
                "The AI couldn’t confirm this clip clearly shows the task. No reward this time — please re-record following the instructions."}
            </Text>
          ) : (
            <Text style={styles.doneSub}>
              {aiReason ?? "Your contribution was submitted and is queued for review."}
            </Text>
          )}

          {typeof aiScore === "number" ? (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeLabel}>AI quality score</Text>
              <Text
                style={[
                  styles.scoreBadgeNum,
                  { color: rejected ? colors.danger : colors.success },
                ]}
              >
                {aiScore}/100
              </Text>
            </View>
          ) : null}

          <View style={styles.doneBtns}>
            {rejected ? (
              <PrimaryButton
                title="Re-record"
                onPress={() =>
                  router.replace({ pathname: "/record", params: { taskId: task.id } })
                }
              />
            ) : (
              <PrimaryButton title="Back to tasks" onPress={() => router.replace("/tasks")} />
            )}
            <PrimaryButton
              title="View my dashboard"
              variant="ghost"
              onPress={() => router.replace("/profile")}
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === "error") {
    return (
      <Screen style={styles.wrap}>
        <View style={styles.center}>
          <View style={styles.errIcon}>
            <Text style={styles.errMark}>!</Text>
          </View>
          <Text style={styles.congrats}>Upload failed</Text>
          <Text style={styles.doneSub}>{err}</Text>
          <View style={styles.doneBtns}>
            <PrimaryButton title="Retry" onPress={run} />
            <PrimaryButton
              title="Re-record"
              variant="ghost"
              onPress={() => router.replace({ pathname: "/record", params: { taskId: task.id } })}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const busyLabel =
    phase === "extracting"
      ? "Preparing your clip…"
      : phase === "uploading"
        ? "Uploading to Hydro…"
        : "AI is reviewing your video…";

  return (
    <Screen style={styles.wrap}>
      <Text style={styles.h1}>Review your recording</Text>

      <Card style={styles.preview}>
        <View style={styles.thumb}>
          <Text style={styles.thumbIcon}>▶</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.previewName}>{task.name}</Text>
          <Pill label={task.category} />
          <Text style={styles.previewMeta}>
            Length: {durationSec}s{videoUri ? "" : " · simulated"}
          </Text>
        </View>
      </Card>

      <Card style={styles.checks}>
        <Text style={styles.checksTitle}>Before you submit</Text>
        <CheckRow ok={!!videoUri} label={videoUri ? "Recording captured" : "No video file (simulated)"} />
        <CheckRow ok={!tooShort} label={tooShort ? "Clip is very short (<3s)" : "Length looks good"} />
        <CheckRow ok label="AI will verify it matches the task" />
      </Card>

      {busy ? (
        <View style={styles.uploadBox}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width }]} />
          </View>
          <Text style={styles.pct}>{busyLabel}</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <PrimaryButton title="Confirm & submit" onPress={run} />
          <PrimaryButton
            title="Re-record"
            variant="ghost"
            onPress={() => router.replace({ pathname: "/record", params: { taskId: task.id } })}
          />
        </View>
      )}
    </Screen>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.checkRow}>
      <View style={[styles.checkDot, { backgroundColor: ok ? colors.success : colors.warning }]}>
        <Text style={styles.checkMark}>{ok ? "✓" : "!"}</Text>
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.lg, gap: spacing.lg },
  h1: { color: colors.text, fontSize: font.title, fontWeight: "800", marginTop: spacing.sm },
  preview: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbIcon: { color: colors.primary, fontSize: 26 },
  previewName: { color: colors.text, fontSize: font.heading, fontWeight: "700" },
  previewMeta: { color: colors.textDim, fontSize: font.small },
  checks: { gap: spacing.sm },
  checksTitle: { color: colors.text, fontSize: font.body, fontWeight: "700", marginBottom: 2 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#04121f", fontSize: 12, fontWeight: "900" },
  checkLabel: { color: colors.textDim, fontSize: font.body },
  actions: { gap: spacing.md, marginTop: "auto" },
  uploadBox: { marginTop: "auto", gap: spacing.sm },
  barTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  barFill: { height: 12, borderRadius: radius.pill, backgroundColor: colors.primary },
  pct: { color: colors.textDim, fontSize: font.body, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  congrats: { color: colors.text, fontSize: font.title, fontWeight: "800", marginTop: spacing.sm },
  rewardBig: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  rewardBigNum: { color: colors.success, fontSize: 52, fontWeight: "900" },
  rewardBigLabel: { color: colors.success, fontSize: font.title, fontWeight: "800" },
  doneSub: {
    color: colors.textDim,
    fontSize: font.body,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  scoreBadgeLabel: { color: colors.textDim, fontSize: font.small },
  scoreBadgeNum: { fontSize: font.heading, fontWeight: "800" },
  doneBtns: { alignSelf: "stretch", gap: spacing.md, marginTop: spacing.lg },
  errIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,69,58,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  errMark: { color: colors.danger, fontSize: 34, fontWeight: "900" },
});
