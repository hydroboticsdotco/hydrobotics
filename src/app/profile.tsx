import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { shortAddress, useApp, type Contribution } from "../store";
import { colors, font, radius, spacing } from "../theme";
import { Card, PrimaryButton, Screen } from "../ui";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Profile() {
  const router = useRouter();
  const { address, contributions, totalTokens, disconnect } = useApp();

  const onDisconnect = async () => {
    await disconnect();
    router.replace("/");
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>My contributions</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Done</Text>
        </Pressable>
      </View>

      {address && (
        <Card style={styles.walletRow}>
          <View style={styles.dot} />
          <Text style={styles.wallet}>{shortAddress(address)}</Text>
          <Text style={styles.disconnect} onPress={onDisconnect}>
            Disconnect
          </Text>
        </Card>
      )}

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Text style={styles.statNum}>{contributions.length}</Text>
          <Text style={styles.statLabel}>Uploads</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: colors.success }]}>{totalTokens}</Text>
          <Text style={styles.statLabel}>$HYDRO earned</Text>
        </Card>
      </View>
      <Text style={styles.balanceNote}>
        In-app Hydro balance · claimable to your wallet at token launch
      </Text>

      <Text style={styles.section}>Recent</Text>
      {contributions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No contributions yet.</Text>
          <PrimaryButton title="Start a task" onPress={() => router.replace("/tasks")} />
        </View>
      ) : (
        <FlatList
          data={contributions.slice(0, 5)}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          renderItem={({ item }) => <Row item={item} />}
        />
      )}
    </Screen>
  );
}

function Row({ item }: { item: Contribution }) {
  const rewarded = item.status === "rewarded";
  return (
    <Card style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{item.taskName}</Text>
        <Text style={styles.rowMeta}>
          {item.durationSec}s · {timeAgo(item.createdAt)}
          {rewarded ? "" : ` · ${item.status.replace("_", " ")}`}
        </Text>
      </View>
      <Text style={[styles.rowReward, !rewarded && { color: colors.textFaint }]}>
        {rewarded ? `+${item.reward}` : "…"}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: font.title, fontWeight: "800" },
  back: { color: colors.primary, fontSize: font.body, fontWeight: "600" },
  walletRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  wallet: { color: colors.text, fontSize: font.body, fontWeight: "600", flex: 1 },
  disconnect: { color: colors.textDim, fontSize: font.small },
  stats: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, alignItems: "center", gap: 4, paddingVertical: spacing.lg },
  statNum: { color: colors.text, fontSize: 30, fontWeight: "800" },
  statLabel: { color: colors.textDim, fontSize: font.small },
  balanceNote: { color: colors.textFaint, fontSize: font.tiny, textAlign: "center", marginBottom: spacing.lg, marginTop: -spacing.sm },
  section: { color: colors.textDim, fontSize: font.small, fontWeight: "700", marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 1 },
  empty: { alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  emptyText: { color: colors.textDim, fontSize: font.body },
  row: { flexDirection: "row", alignItems: "center" },
  rowName: { color: colors.text, fontSize: font.body, fontWeight: "600" },
  rowMeta: { color: colors.textFaint, fontSize: font.small, marginTop: 2 },
  rowReward: { color: colors.success, fontSize: font.heading, fontWeight: "800" },
});
