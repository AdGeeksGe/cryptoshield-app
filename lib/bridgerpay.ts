// Server-side BridgerPay client.
//
// Flow (per https://docs.bridgerpay.com api-v2):
//   1. Authenticate as a producer (merchant) to get a Bearer access_token.
//   2. Create a server-side cashier session ->  POST
//      /v2/cashier/session/create/{api_key}  (Bearer auth)  ->  cashier_token.
//   3. The browser embeds the Cashier widget using your public `cashier_key`
//      + the `cashier_token` from step 2.
//
// Auth path / base are env-overridable because BridgerPay accounts can differ.

const API_BASE = process.env.BRIDGERPAY_API_BASE ?? "https://api.bridgerpay.com";
const AUTH_PATH =
  process.env.BRIDGERPAY_AUTH_PATH ?? "/v1/auth/producer/api-key";
const API_KEY = process.env.BRIDGERPAY_API_KEY ?? "";
const USERNAME = process.env.BRIDGERPAY_USERNAME ?? "";
const PASSWORD = process.env.BRIDGERPAY_PASSWORD ?? "";
const CASHIER_KEY = process.env.BRIDGERPAY_CASHIER_KEY ?? "";

export interface CreateCashierSessionInput {
  amount: number; // minor units (cents)
  currency: string;
  orderId: string;
  country?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface BridgerSession {
  cashierToken: string;
  cashierKey: string;
  raw: unknown;
}

export function isBridgerPayConfigured(): boolean {
  return Boolean(API_KEY && USERNAME && PASSWORD && CASHIER_KEY);
}

async function authenticate(): Promise<string> {
  const res = await fetch(`${API_BASE}${AUTH_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_name: USERNAME, password: PASSWORD }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `BridgerPay auth failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }
  const token =
    (data.access_token as string) ??
    ((data.result as Record<string, unknown>)?.access_token as string) ??
    ((data.data as Record<string, unknown>)?.access_token as string);
  if (!token) {
    throw new Error(
      `BridgerPay auth response missing access_token: ${JSON.stringify(data)}`,
    );
  }
  return token;
}

export async function createCashierSession(
  input: CreateCashierSessionInput,
): Promise<BridgerSession> {
  if (!isBridgerPayConfigured()) {
    throw new Error(
      "BridgerPay is not fully configured (need API_KEY, USERNAME, PASSWORD, CASHIER_KEY)",
    );
  }

  const token = await authenticate();

  // BridgerPay expects the amount in major units (e.g. 250.00).
  const body = {
    cashier_key: CASHIER_KEY,
    order_id: input.orderId,
    currency: input.currency,
    amount: input.amount / 100,
    country: input.country,
    first_name: input.customer?.firstName,
    last_name: input.customer?.lastName,
    email: input.customer?.email,
  };

  const res = await fetch(
    `${API_BASE}/v2/cashier/session/create/${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `BridgerPay session create failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }

  const result = (data.result ?? data.data ?? data) as Record<string, unknown>;
  const cashierToken =
    (result.cashier_token as string) ?? (result.token as string);
  if (!cashierToken) {
    throw new Error(
      `BridgerPay response missing cashier_token: ${JSON.stringify(data)}`,
    );
  }

  return { cashierToken, cashierKey: CASHIER_KEY, raw: data };
}
