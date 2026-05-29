"use client";

import type { ReactNode } from "react";
import {
  LogLevel,
  StatsigProvider,
  useClientBootstrapInit,
} from "@statsig/react-bindings";
import { StatsigSessionReplayPlugin } from "@statsig/session-replay";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";

const statsigOptions = {
  logLevel: LogLevel.Debug,
  plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()],
};

type MyStatsigProps = {
  children: ReactNode;
  userID: string;
  bootstrapValues?: string | null;
};

function MyStatsigBootstrap({
  children,
  userID,
  bootstrapValues,
}: {
  children: ReactNode;
  userID: string;
  bootstrapValues: string;
}) {
  const sdkKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY!;
  const client = useClientBootstrapInit(
    sdkKey,
    { userID },
    bootstrapValues,
    statsigOptions,
  );
  return <StatsigProvider client={client}>{children}</StatsigProvider>;
}

export default function MyStatsig({
  children,
  userID,
  bootstrapValues,
}: MyStatsigProps) {
  const user = { userID };

  if (bootstrapValues && process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY) {
    return (
      <MyStatsigBootstrap userID={userID} bootstrapValues={bootstrapValues}>
        {children}
      </MyStatsigBootstrap>
    );
  }

  if (!process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY) {
    return <>{children}</>;
  }

  return (
    <StatsigProvider
      sdkKey={process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY!}
      user={user}
      options={statsigOptions}
    >
      {children}
    </StatsigProvider>
  );
}
