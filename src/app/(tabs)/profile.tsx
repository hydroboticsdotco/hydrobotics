import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { shortAddress, useApp, type Contribution } from "../../store";
import { colors, font, radius, spacing } from "../../theme";
import { Card, PrimaryButton, Screen } from "../../ui";

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
  const { address, contributions, totalTokens, disconnect, refresh } = useApp();
  const [copied, setCopied] = useState(false);

  const onDisconnect = async () => {
    await disconnect();
    router.replace("/");
  };

  const onCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My dashboard</Text>
      </View>

      <FlatList
        data={contributions}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={false}
        contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.sm }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            {/* Wallet */}
            <Card style={styles.walletCard}>
              <Text style={styles.walletLabel}>Your wallet</Text>
              <View style={styles.walletRow}>
                <View style={styles.dot} />
                <Text style={styles.wallet}>
                  {address ? shortAddress(address) : "Not connected"}
                </Text>
                {address ? (
                  <Pressable onPress={onCopy} hitSlop={8}>
                    <Text style={styles.copy}>{copied ? "Copied ✓" : "Copy"}</Text>
                  </Pressable>
                ) : null}
              </View>
              {address ? (
                <Text style={styles.walletFull} numberOfLines={1}>
                  {address}
                </Text>
              ) : null}
            </Card>

            {/* Stats */}
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

            <Text style={styles.section}>My contributions</Text>
          </View>
        }
        renderItem={({ item }) => <Row item={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No contributions yet.</Text>
            <PrimaryButton title="Start a task" onPress={() => router.push("/tasks")} />
          </View>
        }
        ListFooterComponent={
          address ? (
            <Pressable onPress={onDisconnect} style={styles.disconnectBtn}>
              <Text style={styles.disconnect}>Disconnect</Text>
            </Pressable>
          ) : null
        }
      />
    </Screen>
  );
}

function Row({ item }: { item: Contribution }) {
  const rewarded = item.status === "rewarded";
  const rejected = item.status === "rejected";
  const hasScore = typeof item.aiScore === "number";
  return (
    <Card style={styles.row}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{item.taskName}</Text>
          <Text style={styles.rowMeta}>
            {item.durationSec}s · {timeAgo(item.createdAt)}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text
            style={[
              styles.rowReward,
              rejected && { color: colors.danger },
              !rewarded && !rejected && { color: colors.textFaint },
            ]}
          >
            {rewarded ? `+${item.reward}` : rejected ? "0" : "…"}
          </Text>
          <StatusPill status={item.status} />
        </View>
      </View>

      {hasScore ? (
        <View style={styles.aiBox}>
          <View style={styles.aiBarRow}>
            <Text style={styles.aiLabel}>AI quality</Text>
            <Text style={styles.aiScore}>{item.aiScore}/100</Text>
          </View>
          <View style={styles.aiTrack}>
            <View
              style={[
                styles.aiFill,
                {
                  width: `${Math.max(0, Math.min(100, item.aiScore ?? 0))}%`,
                  backgroundColor: rejected ? colors.danger : colors.success,
                },
              ]}
            />
          </View>
          {item.aiReason ? <Text style={styles.aiReason}>{item.aiReason}</Text> : null}
        </View>
      ) : null}
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    rewarded: { label: "Rewarded", color: colors.success, bg: "rgba(48,209,88,0.16)" },
    rejected: { label: "Rejected", color: colors.danger, bg: "rgba(255,69,58,0.16)" },
    pending_review: { label: "Reviewing", color: colors.warning, bg: "rgba(255,214,10,0.16)" },
  };
  const s = map[status] ?? { label: status, color: colors.textDim, bg: colors.surfaceAlt };
  return (
    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.sm, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: font.title, fontWeight: "800" },
  walletCard: { gap: spacing.sm },
  walletLabel: { color: colors.textDim, fontSize: font.small, fontWeight: "600" },
  walletRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  wallet: { color: colors.text, fontSize: font.heading, fontWeight: "700", flex: 1 },
  copy: { color: colors.primary, fontSize: font.small, fontWeight: "700" },
  walletFull: { color: colors.textFaint, fontSize: font.tiny },
  stats: { flexDirection: "row", gap: spacing.md },
  statCard: { flex: 1, alignItems: "center", gap: 4, paddingVertical: spacing.lg },
  statNum: { color: colors.text, fontSize: 30, fontWeight: "800" },
  statLabel: { color: colors.textDim, fontSize: font.small },
  balanceNote: {
    color: colors.textFaint,
    fontSize: font.tiny,
    textAlign: "center",
    marginTop: -spacing.xs,
  },
  section: {
    color: colors.textDim,
    fontSize: font.small,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  empty: { alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  emptyText: { color: colors.textDim, fontSize: font.body },
  row: { gap: spacing.sm },
  rowTop: { flexDirection: "row", alignItems: "center" },
  rowName: { color: colors.text, fontSize: font.body, fontWeight: "600" },
  rowMeta: { color: colors.textFaint, fontSize: font.small, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  rowReward: { color: colors.success, fontSize: font.heading, fontWeight: "800" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  statusText: { fontSize: font.tiny, fontWeight: "700" },
  aiBox: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  aiBarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  aiLabel: { color: colors.textDim, fontSize: font.small, fontWeight: "600" },
  aiScore: { color: colors.text, fontSize: font.small, fontWeight: "700" },
  aiTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  aiFill: { height: 6, borderRadius: radius.pill },
  aiReason: { color: colors.textFaint, fontSize: font.tiny, lineHeight: 16 },
  disconnectBtn: { alignItems: "center", paddingVertical: spacing.lg, marginTop: spacing.md },
  disconnect: { color: colors.textDim, fontSize: font.body, fontWeight: "600" },
});
