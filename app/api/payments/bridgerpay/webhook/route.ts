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

  // TODO: fulfil the order here based on the transaction status.
  console.log(
    "[bridgerpay] webhook:",
    event.status ?? event.type ?? "event",
  );

  return NextResponse.json({ received: true });
}
