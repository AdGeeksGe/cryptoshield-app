"use client";

import type { ReactNode } from "react";
import { StatsigProvider, useClientBootstrapInit } from "@statsig/react-bindings";

// Initializes the Statsig client synchronously from server-generated bootstrap
// values, so experiment groups are known on first paint (no control->variant
// flicker). The userID must match the one used server-side in lib/statsig.ts.
export default function StatsigBootstrap({
  sdkKey,
  userID,
  values,
  children,
}: {
  sdkKey: string;
  userID: string;
  values: string;
  children: ReactNode;
}) {
  const client = useClientBootstrapInit(sdkKey, { userID }, values);
  return <StatsigProvider client={client}>{children}</StatsigProvider>;
}
