// Shared, secret-free order + gateway config. Safe to import on client & server.
//
// The checkout total is intentionally "generic": the amount is configurable
// (env-driven, with a sensible default that matches the current CryptoShield
// App listing). Amounts are stored in the smallest currency unit (e.g. cents).

export type GatewayId = "paycom" | "bridgerpay";

export interface OrderLine {
  name: string;
  qty: number;
  /** unit price in minor units (cents) */
  unitAmount: number;
}

export interface Order {
  /** total in minor units (cents) */
  amount: number;
  currency: string;
  reference: string;
  lines: OrderLine[];
  /** "year" | "month" | "" — purely for display */
  interval: string;
}

const DEFAULT_AMOUNT = Number(
  process.env.NEXT_PUBLIC_DEFAULT_AMOUNT ?? "25000", // $250.00
);
const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "USD";

/** A single, configurable order. Replace lines with a real cart when needed. */
export function getDefaultOrder(): Order {
  return {
    amount: DEFAULT_AMOUNT,
    currency: DEFAULT_CURRENCY,
    reference: `cryptoshield-${Date.now()}`,
    interval: "year",
    lines: [
      {
        name: "Mobile Security App | CryptoShield App",
        qty: 1,
        unitAmount: DEFAULT_AMOUNT,
      },
    ],
  };
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

/**
 * True when a host is a local dev address. Accepts either a request `Host`
 * header (server) or `window.location.hostname` (browser); the optional port
 * is stripped. On localhost every product is billed at $0 so the full payment
 * flow can be exercised without charging real money.
 */
export function isLocalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0].toLowerCase();
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".local");
}

export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

export const gatewayEnabled = {
  paycom: process.env.NEXT_PUBLIC_ENABLE_PAYCOM !== "false",
  bridgerpay: process.env.NEXT_PUBLIC_ENABLE_BRIDGERPAY !== "false",
};
