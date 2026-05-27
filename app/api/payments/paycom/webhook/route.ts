import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

// Pay.com calls this URL with payment status updates. Register it in your
// Pay.com dashboard (Developers -> Webhooks). Set PAYCOM_WEBHOOK_SECRET to the
// signing secret shown there so we can verify the payload is genuine.
//
// NOTE: confirm the exact signature header name + scheme against your account's
// webhook docs; the verification below is the common HMAC-SHA256 pattern.
const WEBHOOK_SECRET = process.env.PAYCOM_WEBHOOK_SECRET ?? "";
const SIGNATURE_HEADER = "x-paycom-signature";

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

  let event: Record<string, unknown> = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // TODO: fulfil the order here (mark paid, send receipt, provision access).
  // The `type`/`status` and payment id fields depend on your Pay.com account.
  console.log("[paycom] webhook:", event.type ?? event.status ?? "event");

  return NextResponse.json({ received: true });
}
