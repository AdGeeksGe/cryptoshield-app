import "server-only";
import { cookies, headers } from "next/headers";
import Statsig, { type StatsigUser } from "statsig-node";

// Server-side Statsig. Used to (1) generate bootstrap values so the client
// renders the right experiment group with no flicker, and (2) log conversion
// events that happen off the browser (e.g. payment webhooks). If the keys are
// missing everything degrades to a no-op so the app still runs locally.

const SERVER_SECRET = process.env.STATSIG_SERVER_SECRET_KEY ?? "";
export const STATSIG_CLIENT_KEY =
  process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY ?? "";

export const STATSIG_ID_COOKIE = "statsig_id";

export function statsigConfigured(): boolean {
  return Boolean(SERVER_SECRET && STATSIG_CLIENT_KEY);
}

let initPromise: Promise<unknown> | null = null;
async function ensureInitialized(): Promise<boolean> {
  if (!statsigConfigured()) return false;
  if (!initPromise) {
    const tier = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
    initPromise = Statsig.initialize(
      SERVER_SECRET,
      tier ? { environment: { tier } } : undefined,
    ).catch((err) => {
      console.error("[statsig] initialize failed:", err);
      initPromise = null; // allow a later request to retry
      throw err;
    });
  }
  try {
    await initPromise;
    return true;
  } catch {
    return false;
  }
}

// Builds the Statsig user from the stable visitor cookie set in middleware.ts.
// The same userID is handed to the client provider so bucketing is consistent
// across server and browser.
export function getStatsigUser(): StatsigUser {
  const userID = cookies().get(STATSIG_ID_COOKIE)?.value ?? "anonymous";
  const h = headers();
  return {
    userID,
    userAgent: h.get("user-agent") ?? undefined,
    country: h.get("x-vercel-ip-country") ?? undefined,
  };
}

// djb2 hashing is required to bootstrap the @statsig/js-client SDK.
export async function getStatsigBootstrap(
  user: StatsigUser,
): Promise<string | null> {
  if (!(await ensureInitialized())) return null;
  const values = Statsig.getClientInitializeResponse(user, STATSIG_CLIENT_KEY, {
    hash: "djb2",
  });
  return values ? JSON.stringify(values) : null;
}

export async function logStatsigEvent(
  user: StatsigUser,
  eventName: string,
  value?: string | number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!(await ensureInitialized())) return;
  Statsig.logEvent(user, eventName, value ?? null, metadata ?? null);
}
