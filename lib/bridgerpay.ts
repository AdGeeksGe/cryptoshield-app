// Server-side BridgerPay client.
//
// Flow (per https://developers.bridgerpay.com api-v2):
//   1. Log in with the merchant user_name/password to get a Bearer access_token
//      ->  POST /v2/auth/login  ->  result.access_token.token.
//   2. Create a server-side cashier session ->  POST
//      /v2/cashier/session/create/{api_key}  (Bearer auth)  ->
//      result.cashier_token.
//   3. The browser embeds the Cashier widget using your public `cashier_key`
//      + the `cashier_token` from step 2.
//
// Every response is wrapped as { response: { code, message }, result: ... }
// where `result` is the payload on success or an array of errors on failure.
//
// Auth path / base are env-overridable because BridgerPay accounts can differ.

const API_BASE = process.env.BRIDGERPAY_API_BASE ?? "https://api.bridgerpay.com";
const AUTH_PATH = process.env.BRIDGERPAY_AUTH_PATH ?? "/v2/auth/login";
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
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
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

/** Pull a human-readable message out of a BridgerPay envelope. */
function envelopeError(data: Record<string, unknown>): string {
  const result = data.result;
  if (Array.isArray(result)) {
    return result
      .map((e) => (e as { message?: string }).message)
      .filter(Boolean)
      .join(", ");
  }
  return (
    ((data.response as Record<string, unknown>)?.message as string) ??
    JSON.stringify(data)
  );
}

async function authenticate(): Promise<string> {
  const res = await fetch(`${API_BASE}${AUTH_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ user_name: USERNAME, password: PASSWORD }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const result = data.result as Record<string, unknown> | undefined;
  // Success shape: { result: { access_token: { token, expires_in } } }
  const token =
    ((result?.access_token as Record<string, unknown>)?.token as string) ??
    (result?.access_token as string) ?? // tolerate a flat fallback
    (data.access_token as string);
  if (!res.ok || !token) {
    throw new Error(
      `BridgerPay auth failed (${res.status}): ${envelopeError(data)}`,
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
    phone: input.customer?.phone,
    address: input.customer?.address,
    city: input.customer?.city,
    state: input.customer?.state,
    zip_code: input.customer?.zipCode,
  };

  const res = await fetch(
    `${API_BASE}/v2/cashier/session/create/${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const result = data.result as Record<string, unknown> | undefined;
  const cashierToken =
    !Array.isArray(result) &&
    ((result?.cashier_token as string) ?? (result?.token as string));
  if (!res.ok || !cashierToken) {
    throw new Error(
      `BridgerPay session create failed (${res.status}): ${envelopeError(data)}`,
    );
  }

  return { cashierToken, cashierKey: CASHIER_KEY, raw: data };
}
