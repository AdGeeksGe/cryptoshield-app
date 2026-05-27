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
