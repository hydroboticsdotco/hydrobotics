import { PrivyProvider } from "@privy-io/expo";
import React from "react";
import { PRIVY_APP_ID, PRIVY_CLIENT_ID, isPrivyEnabled } from "./config";

// Native: wrap in PrivyProvider when configured, else passthrough (demo mode).
export function PrivyGate({ children }: { children: React.ReactNode }) {
  if (!isPrivyEnabled) return <>{children}</>;
  return (
    <PrivyProvider appId={PRIVY_APP_ID as string} clientId={PRIVY_CLIENT_ID as string}>
      {children}
    </PrivyProvider>
  );
}
