import { Platform } from "react-native";

export const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
export const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID;

// Privy has native modules and does not support web. Only enable when we're
// on a native build AND both ids are configured; otherwise fall back to demo.
export const isPrivyEnabled =
  Platform.OS !== "web" && !!PRIVY_APP_ID && !!PRIVY_CLIENT_ID;
