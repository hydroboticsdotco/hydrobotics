import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, radius, spacing } from "./theme";

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={[styles.screenInner, style]}>{children}</View>
    </SafeAreaView>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger" | "ghost";
}) {
  const isGhost = variant === "ghost";
  const bg =
    variant === "danger"
      ? colors.danger
      : variant === "ghost"
        ? "transparent"
        : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        isGhost && styles.btnGhost,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.primary : "#fff"} />
      ) : (
        <Text style={[styles.btnText, isGhost && { color: colors.primary }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ label, tone = "default" }: { label: string; tone?: "default" | "accent" }) {
  return (
    <View
      style={[
        styles.pill,
        tone === "accent" && { backgroundColor: "rgba(10,132,255,0.16)" },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === "accent" && { color: colors.primary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function HydroMark({ size = 64 }: { size?: number }) {
  // Stylized wave "H" mark using two offset bars.
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0px 6px 20px rgba(10,132,255,0.5)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.12 }}>
        <View
          style={{
            width: size * 0.09,
            height: size * 0.44,
            borderRadius: size * 0.06,
            backgroundColor: "#fff",
            transform: [{ rotate: "12deg" }],
          }}
        />
        <View
          style={{
            width: size * 0.09,
            height: size * 0.44,
            borderRadius: size * 0.06,
            backgroundColor: "#fff",
            transform: [{ rotate: "12deg" }],
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenInner: { flex: 1, paddingHorizontal: spacing.lg },
  btn: {
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnText: {
    color: "#fff",
    fontSize: font.body + 1,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignSelf: "flex-start",
  },
  pillText: { color: colors.textDim, fontSize: font.tiny, fontWeight: "600" },
});
