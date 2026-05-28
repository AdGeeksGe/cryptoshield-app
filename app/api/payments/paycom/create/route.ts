import { NextRequest, NextResponse } from "next/server";
import { createPaymentSession, isPaycomConfigured } from "@/lib/paycom";
import { getDefaultOrder } from "@/lib/order";

export const runtime = "nodejs";

function originOf(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    req.headers.get("origin") ??
    new URL(req.url).origin
  );
}

export async function POST(req: NextRequest) {
  if (!isPaycomConfigured()) {
    return NextResponse.json(
      { error: "Online payments are not configured on the server." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const order = getDefaultOrder();

  const amount = Number.isFinite(body.amount)
    ? Math.round(Number(body.amount))
    : order.amount;
  const currency = (body.currency as string) ?? order.currency;
  const customer = body.customer as
    | { firstName?: string; lastName?: string; email?: string }
    | undefined;

  if (!(amount > 0)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const session = await createPaymentSession({
      amount,
      currency,
      reference: order.reference,
      returnUrl: `${originOf(req)}/checkout/success`,
      customer,
    });
    return NextResponse.json({
      id: session.id,
      clientSecret: session.clientSecret,
      publishableKey: process.env.NEXT_PUBLIC_PAYCOM_PUBLISHABLE_KEY ?? "",
    });
  } catch (err) {
    console.error("[paycom] create session error:", err);
    return NextResponse.json(
      { error: "Could not start online payment." },
      { status: 502 },
    );
  }
}
