// Server-side Pay.com client.
//
// Flow (per https://apiref.pay.com): your server creates a *payment session*
// using your SECRET key (sent in the `x-paycom-api-key` header). The response
// contains a `client_secret` which the browser uses to initialise the Pay.com
// "Universal Web Component" that renders the actual payment UI.
//
// Endpoint paths/base are env-overridable so you can point at sandbox vs live
// and adjust if your account uses a different API version.

const API_BASE = process.env.PAYCOM_API_BASE ?? "https://api.pay.com";
const CREATE_SESSION_PATH =
  process.env.PAYCOM_CREATE_SESSION_PATH ?? "/v1/sessions/payment";
const SECRET_KEY = process.env.PAYCOM_SECRET_KEY ?? "";

export interface CreatePaymentSessionInput {
  amount: number; // minor units (cents)
  currency: string;
  reference: string;
  /** absolute URL the customer returns to after paying */
  returnUrl: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface PaycomSession {
  id: string;
  clientSecret: string;
  raw: unknown;
}

export function isPaycomConfigured(): boolean {
  return SECRET_KEY.length > 0;
}

export async function createPaymentSession(
  input: CreatePaymentSessionInput,
): Promise<PaycomSession> {
  if (!SECRET_KEY) {
    throw new Error("PAYCOM_SECRET_KEY is not set");
  }

  const body = {
    amount: input.amount,
    currency: input.currency,
    reference: input.reference,
    return_url: input.returnUrl,
    // `destination_data` routes funds to a specific payout destination on your
    // Pay.com account. Leave undefined to use the account default.
    customer: input.customer
      ? {
          first_name: input.customer.firstName,
          last_name: input.customer.lastName,
          email: input.customer.email,
        }
      : undefined,
  };

  const res = await fetch(`${API_BASE}${CREATE_SESSION_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paycom-api-key": SECRET_KEY,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `Pay.com session create failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }

  const clientSecret =
    (data.client_secret as string) ??
    (data.clientSecret as string) ??
    ((data.data as Record<string, unknown>)?.client_secret as string);
  const id =
    (data.id as string) ??
    ((data.data as Record<string, unknown>)?.id as string) ??
    "";

  if (!clientSecret) {
    throw new Error(
      `Pay.com response missing client_secret: ${JSON.stringify(data)}`,
    );
  }

  return { id, clientSecret, raw: data };
}
