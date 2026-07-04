import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getTask } from "../data/tasks";
import { colors, font, radius, spacing } from "../theme";
import { PrimaryButton, Screen } from "../ui";

const MAX_SEC = 60; // spec: cap clips at 60s to keep uploads fast

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Record() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const task = getTask(taskId);

  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const secondsRef = useRef(0);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  // Auto-open the camera on entry: request permissions immediately (spec: page 3).
  useEffect(() => {
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) requestCam();
    if (micPerm && !micPerm.granted && micPerm.canAskAgain) requestMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camPerm?.granted, micPerm?.granted]);

  // Auto-stop at the 60s cap.
  useEffect(() => {
    if (recording && seconds >= MAX_SEC) onStop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);

  if (!task) {
    return (
      <Screen style={{ justifyContent: "center" }}>
        <Text style={styles.msg}>Task not found.</Text>
        <PrimaryButton title="Back" onPress={() => router.back()} variant="ghost" />
      </Screen>
    );
  }

  const permsGranted = camPerm?.granted && micPerm?.granted;

  const requestAll = async () => {
    await requestCam();
    await requestMic();
  };

  const finish = (durationSec: number, uri: string | null) => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    router.replace({
      pathname: "/upload",
      params: { taskId: task.id, duration: String(durationSec), uri: uri ?? "" },
    });
  };

  const startTimer = () => {
    setSeconds(0);
    secondsRef.current = 0;
    timer.current = setInterval(
      () =>
        setSeconds((s) => {
          const n = s + 1;
          secondsRef.current = n;
          return n;
        }),
      1000
    );
  };

  const onStart = async () => {
    setRecording(true);
    startTimer();
    try {
      // Resolves with the file URI when stopRecording() is called or maxDuration hits.
      const video = await cameraRef.current?.recordAsync({ maxDuration: MAX_SEC });
      finish(secondsRef.current, video?.uri ?? null);
    } catch {
      // Camera can't actually record (e.g. iOS Simulator) — simulate a full clip.
      finish(Math.max(secondsRef.current, task.durationSec), null);
    }
  };

  const onStop = () => {
    // Triggers recordAsync() above to resolve, which navigates onward.
    try {
      cameraRef.current?.stopRecording();
    } catch {
      // ignore
    }
  };

  const onSimulate = () => {
    finish(Math.max(secondsRef.current, task.durationSec), null);
  };

  return (
    <Screen style={styles.wrap}>
      <View style={styles.cameraWrap}>
        {permsGranted ? (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" />
            {!recording && (
              <Pressable
                style={styles.flipBtn}
                onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
              >
                <Text style={styles.flipIcon}>⟲</Text>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.permBox}>
            <Text style={styles.permTitle}>Camera access needed</Text>
            <Text style={styles.permSub}>
              Hydro records first-person video to train robots.
            </Text>
            <PrimaryButton title="Allow camera & mic" onPress={requestAll} />
            <Pressable onPress={onSimulate}>
              <Text style={styles.simulate}>Camera unavailable? Simulate a recording</Text>
            </Pressable>
          </View>
        )}

        {/* Top task banner */}
        <View style={styles.banner} pointerEvents="box-none">
          <Text style={styles.bannerTask}>{task.name}</Text>
          <Text style={styles.bannerPrompt} numberOfLines={2}>
            {task.prompt}
          </Text>
        </View>

        {recording && (
          <View style={styles.timerPill}>
            <View style={styles.recDot} />
            <Text style={styles.timerText}>{fmt(seconds)}</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {permsGranted ? (
          !recording ? (
            <Pressable style={styles.recBtnOuter} onPress={onStart}>
              <View style={styles.recBtnInner} />
            </Pressable>
          ) : (
            <Pressable style={styles.recBtnOuter} onPress={onStop}>
              <View style={styles.stopSquare} />
            </Pressable>
          )
        ) : (
          <Text style={styles.hint}>Grant access above to start recording</Text>
        )}
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 0 },
  cameraWrap: {
    flex: 1,
    margin: spacing.md,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: "#000",
    justifyContent: "center",
  },
  permBox: { padding: spacing.xl, gap: spacing.md, alignItems: "center" },
  permTitle: { color: colors.text, fontSize: font.heading, fontWeight: "700" },
  permSub: {
    color: colors.textDim,
    fontSize: font.body,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  simulate: {
    color: colors.textFaint,
    fontSize: font.small,
    textDecorationLine: "underline",
    marginTop: spacing.sm,
  },
  flipBtn: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(6,11,20,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipIcon: { color: "#fff", fontSize: 22, fontWeight: "700" },
  banner: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(6,11,20,0.6)",
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  bannerTask: { color: "#fff", fontSize: font.body, fontWeight: "700" },
  bannerPrompt: { color: "rgba(255,255,255,0.8)", fontSize: font.small, marginTop: 2 },
  timerPill: {
    position: "absolute",
    top: spacing.md,
    alignSelf: "center",
    marginTop: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(6,11,20,0.75)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  timerText: { color: "#fff", fontSize: font.body, fontWeight: "700", fontVariant: ["tabular-nums"] },
  controls: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  recBtnOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  recBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.danger },
  stopSquare: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.danger },
  hint: { color: colors.textDim, fontSize: font.body },
  cancel: { color: colors.textDim, fontSize: font.body },
  msg: { color: colors.text, fontSize: font.heading, textAlign: "center", marginBottom: spacing.lg },
});
