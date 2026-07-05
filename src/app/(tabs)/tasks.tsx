import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { type Task } from "../../data/tasks";
import { fetchTasks } from "../../lib/api";
import { useApp } from "../../store";
import { colors, font, radius, spacing } from "../../theme";
import { Pill, Screen } from "../../ui";

export default function Tasks() {
  const router = useRouter();
  const { totalTokens } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = await fetchTasks();
      if (alive) {
        setTasks(t);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hi}>Choose a task</Text>
          <Text style={styles.sub}>Record it well, earn $HYDRO.</Text>
        </View>
        <Pressable style={styles.balance} onPress={() => router.push("/profile")}>
          <Text style={styles.balanceNum}>{totalTokens}</Text>
          <Text style={styles.balanceLabel}>$HYDRO</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.md }}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => router.push({ pathname: "/record", params: { taskId: item.id } })}
            />
          )}
        />
      )}
    </Screen>
  );
}

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardTop}>
        <Pill label={task.category} />
        <View style={styles.reward}>
          <Text style={styles.rewardNum}>+{task.reward}</Text>
          <Text style={styles.rewardLabel}>$HYDRO</Text>
        </View>
      </View>
      <Text style={styles.name}>{task.name}</Text>
      <Text style={styles.prompt} numberOfLines={2}>
        {task.prompt}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.meta}>~{task.durationSec}s</Text>
        <Text style={styles.go}>Record →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  hi: { color: colors.text, fontSize: font.title, fontWeight: "800" },
  sub: { color: colors.textDim, fontSize: font.body, marginTop: 2 },
  balance: {
    backgroundColor: "rgba(10,132,255,0.16)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
  },
  balanceNum: { color: colors.primary, fontSize: font.heading, fontWeight: "800" },
  balanceLabel: { color: colors.primary, fontSize: font.tiny, fontWeight: "600" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reward: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  rewardNum: { color: colors.success, fontSize: font.heading, fontWeight: "800" },
  rewardLabel: { color: colors.success, fontSize: font.tiny, fontWeight: "700" },
  name: { color: colors.text, fontSize: font.heading, fontWeight: "700" },
  prompt: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  meta: { color: colors.textFaint, fontSize: font.small },
  go: { color: colors.primary, fontSize: font.body, fontWeight: "700" },
});
