import React from "react";

// Web has no Privy — just render children.
export function PrivyGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
