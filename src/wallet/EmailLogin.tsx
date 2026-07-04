import { useEmbeddedEthereumWallet, useLoginWithEmail } from "@privy-io/expo";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, font, radius, spacing } from "../theme";
import { PrimaryButton } from "../ui";

export function EmailLogin({ onConnected }: { onConnected: (address: string) => void }) {
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { wallets, create } = useEmbeddedEthereumWallet();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSend = async () => {
    setLoading(true);
    setErr(null);
    try {
      await sendCode({ email });
      setStage("code");
    } catch {
      setErr("Couldn't send the code. Check the email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resolveAddress = async (): Promise<string | null> => {
    if (wallets && wallets.length > 0) return wallets[0].address;
    try {
      const created: any = await create();
      return created?.address ?? wallets?.[0]?.address ?? null;
    } catch {
      return wallets?.[0]?.address ?? null;
    }
  };

  const onVerify = async () => {
    setLoading(true);
    setErr(null);
    try {
      await loginWithCode({ code, email });
      const addr = await resolveAddress();
      if (addr) onConnected(addr);
      else setErr("Signed in, but no wallet yet. Try again.");
    } catch {
      setErr("Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {stage === "email" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <PrimaryButton
            title="Continue with email"
            onPress={onSend}
            loading={loading}
            disabled={!email.includes("@")}
          />
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <PrimaryButton
            title="Verify & connect"
            onPress={onVerify}
            loading={loading}
            disabled={code.length < 4}
          />
          <Text style={styles.resend} onPress={() => setStage("email")}>
            Use a different email
          </Text>
        </>
      )}
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  input: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: font.body,
  },
  resend: { color: colors.textDim, fontSize: font.small, textAlign: "center" },
  err: { color: colors.danger, fontSize: font.small, textAlign: "center" },
});
