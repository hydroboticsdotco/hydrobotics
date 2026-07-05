import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { TASKS } from "../data/tasks";
import { shortAddress, useApp } from "../store";
import { colors, font, spacing } from "../theme";
import { Card, HydroMark, PrimaryButton, Screen } from "../ui";
import { EmailLogin } from "../wallet/EmailLogin";
import { isPrivyEnabled } from "../wallet/config";

export default function Welcome() {
  const router = useRouter();
  const { ready, address, connect, disconnect } = useApp();
  const [loading, setLoading] = useState(false);

  // Returning user with a restored session: go straight into the app.
  useEffect(() => {
    if (ready && address) router.replace("/home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, address]);

  const onConnect = async () => {
    setLoading(true);
    try {
      await connect();
      router.replace("/home");
    } finally {
      setLoading(false);
    }
  };

  const onPrivyConnected = async (addr: string) => {
    await connect(addr);
    router.replace("/home");
  };

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.hero}>
            <HydroMark size={84} />
            <Text style={styles.brand}>Hydro</Text>
            <Text style={styles.tagline}>
              Flowing data, shaping physical intelligence.
            </Text>
            <Text style={styles.sub}>
              Record real-world tasks with your phone. Fuel the robots of tomorrow.
            </Text>
          </View>

          <View style={styles.stats}>
            <Card style={styles.statCard}>
              <Text style={styles.statNum}>{TASKS.length}</Text>
              <Text style={styles.statLabel}>Tasks live</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statNum}>$HYDRO</Text>
              <Text style={styles.statLabel}>Earn per upload</Text>
            </Card>
          </View>

          <View style={styles.footer}>
            {address ? (
          <>
            <Card style={styles.walletCard}>
              <View style={styles.dot} />
              <Text style={styles.walletText}>{shortAddress(address)}</Text>
              <Text style={styles.walletHint} onPress={disconnect}>
                Disconnect
              </Text>
            </Card>
            <PrimaryButton title="Enter →" onPress={() => router.replace("/home")} />
          </>
        ) : isPrivyEnabled ? (
          <>
            <EmailLogin onConnected={onPrivyConnected} />
            <Text style={styles.disclaimer}>
              Sign in with email — a secure wallet is created for you.
            </Text>
          </>
        ) : (
          <>
            <PrimaryButton
              title="Connect Wallet"
              onPress={onConnect}
              loading={loading}
            />
            <Text style={styles.disclaimer}>
              Demo connect for this preview. Real wallet on device build.
            </Text>
          </>
            )}
          </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  hero: { alignItems: "center", marginTop: spacing.xl, gap: spacing.sm },
  brand: {
    color: colors.text,
    fontSize: 44,
    fontWeight: "800",
    marginTop: spacing.md,
    letterSpacing: -0.5,
  },
  tagline: {
    color: colors.primary,
    fontSize: font.heading,
    fontWeight: "700",
    textAlign: "center",
  },
  sub: {
    color: colors.textDim,
    fontSize: font.body,
    textAlign: "center",
    lineHeight: 22,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  stats: { flexDirection: "row", gap: spacing.md },
  statCard: { flex: 1, alignItems: "center", gap: 4, paddingVertical: spacing.lg },
  statNum: { color: colors.text, fontSize: font.title, fontWeight: "800" },
  statLabel: { color: colors.textDim, fontSize: font.small },
  footer: { gap: spacing.md },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  walletText: { color: colors.text, fontSize: font.body, fontWeight: "600", flex: 1 },
  walletHint: { color: colors.textDim, fontSize: font.small },
  disclaimer: {
    color: colors.textFaint,
    fontSize: font.small,
    textAlign: "center",
  },
});
