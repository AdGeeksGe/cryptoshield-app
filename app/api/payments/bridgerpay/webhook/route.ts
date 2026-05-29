import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

// BridgerPay sends transaction "postbacks" (approved / declined / etc.) to this
// URL. Register it in the BridgerPay dashboard (Developers -> Webhooks/Postback)
// and set BRIDGERPAY_WEBHOOK_SECRET so we can verify the payload signature.
//
// NOTE: confirm the exact signature header + scheme against your account; the
// verification below is the common HMAC-SHA256 pattern.
const WEBHOOK_SECRET = process.env.BRIDGERPAY_WEBHOOK_SECRET ?? "";
const SIGNATURE_HEADER = "x-bridger-signature";

// Only these `webhook.type` values mean money was actually captured. Anything
// else (declined, authorized-only, voided, pending, session events, …) must
// NOT fulfil an order.
const PAID_STATUSES = new Set(["approved", "sale", "approved_sale"]);

interface BridgerPostback {
  webhook?: { type?: string };
  data?: {
    order_id?: string;
    psp_name?: string;
    charge?: {
      id?: string;
      uuid?: string;
      type?: string;
      attributes?: {
        status?: string;
        amount?: number;
        currency?: string;
        payment_method?: string;
      };
    };
  };
}

function verify(raw: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET) return true; // not enforced until a secret is configured
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(raw)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get(SIGNATURE_HEADER))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: BridgerPostback = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // The transaction status lives at `webhook.type` (e.g. "approved",
  // "declined", "authorized"). `data.charge.attributes.status` carries the
  // PSP-level status. Reaching /checkout/success only means BridgerPay
  // redirected the browser — THIS postback is the real source of truth.
  const status = (event.webhook?.type ?? event.data?.charge?.type ?? "unknown")
    .toString()
    .trim()
    .toLowerCase();
  const paid = PAID_STATUSES.has(status);
  const charge = event.data?.charge;

  console.log("[bridgerpay] webhook:", {
    status,
    paid,
    orderId: event.data?.order_id ?? null,
    psp: event.data?.psp_name ?? null,
    amount: charge?.attributes?.amount ?? null,
    currency: charge?.attributes?.currency ?? null,
    paymentMethod: charge?.attributes?.payment_method ?? null,
    chargeId: charge?.id ?? charge?.uuid ?? null,
  });

  // TODO: fulfil the order (mark paid, send receipt, provision access) ONLY
  // when `paid` is true. A non-approved status must never fulfil an order.
  if (!paid) {
    console.warn(
      `[bridgerpay] non-approved postback (status=${status}) — not fulfilling.`,
    );
  }

  return NextResponse.json({ received: true });
}
