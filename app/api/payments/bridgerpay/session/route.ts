import { NextRequest, NextResponse } from "next/server";
import {
  createCashierSession,
  isBridgerPayConfigured,
} from "@/lib/bridgerpay";
import { getDefaultOrder } from "@/lib/order";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isBridgerPayConfigured()) {
    return NextResponse.json(
      { error: "PayPal is not configured on the server." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const order = getDefaultOrder();

  const amount = Number.isFinite(body.amount)
    ? Math.round(Number(body.amount))
    : order.amount;
  const currency = (body.currency as string) ?? order.currency;
  const country = (body.country as string) ?? "US";
  const customer = body.customer as
    | { firstName?: string; lastName?: string; email?: string }
    | undefined;

  if (!(amount > 0)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const session = await createCashierSession({
      amount,
      currency,
      orderId: order.reference,
      country,
      customer,
    });
    return NextResponse.json({
      cashierToken: session.cashierToken,
      cashierKey: session.cashierKey,
    });
  } catch (err) {
    console.error("[bridgerpay] create session error:", err);
    return NextResponse.json(
      { error: "Could not start PayPal payment." },
      { status: 502 },
    );
  }
}
