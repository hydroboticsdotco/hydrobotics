import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// During Expo web static rendering the client runs in Node (no `window`).
// Disable session persistence / auto-refresh there to avoid SSR crashes.
const isServer = Platform.OS === "web" && typeof window === "undefined";

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: isServer ? undefined : AsyncStorage,
        autoRefreshToken: !isServer,
        persistSession: !isServer,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Ensures there is a real Supabase session. We use Anonymous Auth so every
 * install gets a stable auth.uid() that RLS policies key off of. Returns the
 * user id, or null if Supabase is not configured / sign-in failed.
 */
export async function ensureAnonSession(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("[hydro] anon sign-in failed:", error.message);
    return null;
  }
  return signIn.user?.id ?? null;
}
