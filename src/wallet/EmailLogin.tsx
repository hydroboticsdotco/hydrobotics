import {
  useEmbeddedEthereumWallet,
  useLoginWithEmail,
  usePrivy,
} from "@privy-io/expo";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, font, radius, spacing } from "../theme";
import { PrimaryButton } from "../ui";

export function EmailLogin({ onConnected }: { onConnected: (address: string) => void }) {
  const { user, isReady, logout } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { wallets, create } = useEmbeddedEthereumWallet();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const connectedOnce = useRef(false);

  const resolveAddress = async (): Promise<string | null> => {
    if (wallets && wallets.length > 0) return wallets[0].address;
    try {
      const created: any = await create();
      return created?.address ?? wallets?.[0]?.address ?? null;
    } catch {
      return wallets?.[0]?.address ?? null;
    }
  };

  const finishLogin = async () => {
    if (connectedOnce.current) return;
    const addr = await resolveAddress();
    if (addr) {
      connectedOnce.current = true;
      onConnected(addr);
    } else {
      setErr("Signed in, but no wallet yet. Tap verify again.");
    }
  };

  // Already-authenticated session (e.g. returning user): skip straight to wallet.
  useEffect(() => {
    if (isReady && user && !connectedOnce.current) {
      setLoading(true);
      finishLogin().finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, user]);

  const onSend = async () => {
    setLoading(true);
    setErr(null);
    try {
      await sendCode({ email });
      setStage("code");
    } catch (e: any) {
      console.log("[Privy sendCode error]", e?.message, JSON.stringify(e));
      setErr(e?.message ? `Send failed: ${e.message}` : "Couldn't send the code. Check the email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    setLoading(true);
    setErr(null);
    try {
      await loginWithCode({ code, email });
      await finishLogin();
    } catch (e: any) {
      console.log("[Privy verify error]", e?.message, JSON.stringify(e));
      // If Privy says we're already logged in, that's effectively success.
      if (e?.code === "attempted_login_with_email_while_already_logged_in") {
        await finishLogin();
      } else {
        setErr(e?.message ? `Verify failed: ${e.message}` : "Invalid or expired code.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    setErr(null);
    setCode("");
    setStage("email");
    connectedOnce.current = false;
    try {
      await logout();
    } catch {}
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
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="go"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => {
              if (email.includes("@")) onSend();
            }}
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
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            returnKeyType="go"
            autoFocus
            value={code}
            onChangeText={setCode}
            onSubmitEditing={() => {
              if (code.length >= 4) onVerify();
            }}
          />
          <PrimaryButton
            title="Verify & connect"
            onPress={onVerify}
            loading={loading}
            disabled={code.length < 4}
          />
          <Text style={styles.resend} onPress={onReset}>
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
