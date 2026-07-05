import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Task } from "./data/tasks";
import { fetchContributions, upsertWallet, type ContributionRow } from "./lib/api";
import { ensureAnonSession, isSupabaseConfigured, supabase } from "./lib/supabase";

export type Contribution = ContributionRow;

type AppState = {
  ready: boolean;
  userId: string | null;
  address: string | null;
  supabaseReady: boolean;
  contributions: Contribution[];
  totalTokens: number;
  connect: (wallet?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  addLocalContribution: (task: Task, durationSec: number) => Promise<Contribution>;
};

const AppContext = createContext<AppState | undefined>(undefined);

const KEY_ADDRESS = "hydro.address";
const KEY_LOCAL_CONTRIB = "hydro.contributions";

function randomHexAddress(): string {
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 40; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const savedAddr = await AsyncStorage.getItem(KEY_ADDRESS);
        if (savedAddr) setAddress(savedAddr);

        const uid = await ensureAnonSession();
        setUserId(uid);

        if (supabase && uid) {
          const rows = await fetchContributions(uid);
          setContributions(rows);
        } else {
          const local = await AsyncStorage.getItem(KEY_LOCAL_CONTRIB);
          if (local) setContributions(JSON.parse(local));
        }
      } catch (e) {
        console.warn("[hydro] init error", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const refresh = async () => {
    if (supabase && userId) {
      const rows = await fetchContributions(userId);
      setContributions(rows);
    }
  };

  const connect = async (wallet?: string) => {
    const addr = wallet ?? randomHexAddress();
    setAddress(addr);
    await AsyncStorage.setItem(KEY_ADDRESS, addr);
    if (userId) await upsertWallet(userId, addr);
  };

  const disconnect = async () => {
    setAddress(null);
    await AsyncStorage.removeItem(KEY_ADDRESS);
  };

  // Fallback path when Supabase isn't configured yet — keeps the app usable.
  const addLocalContribution = async (task: Task, durationSec: number) => {
    const entry: Contribution = {
      id: `${task.id}-${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      reward: task.reward,
      durationSec,
      status: "rewarded",
      txHash: null,
      videoPath: null,
      aiScore: null,
      aiReason: null,
      createdAt: Date.now(),
    };
    const next = [entry, ...contributions];
    setContributions(next);
    await AsyncStorage.setItem(KEY_LOCAL_CONTRIB, JSON.stringify(next));
    return entry;
  };

  const totalTokens = useMemo(
    () => contributions.reduce((sum, c) => sum + (c.reward || 0), 0),
    [contributions]
  );

  const value: AppState = {
    ready,
    userId,
    address,
    supabaseReady: isSupabaseConfigured,
    contributions,
    totalTokens,
    connect,
    disconnect,
    refresh,
    addLocalContribution,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
