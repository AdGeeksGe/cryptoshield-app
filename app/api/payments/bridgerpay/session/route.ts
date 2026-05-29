import { NextRequest, NextResponse } from "next/server";
import {
  createCashierSession,
  isBridgerPayConfigured,
} from "@/lib/bridgerpay";
import { getDefaultOrder, isLocalHost } from "@/lib/order";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isBridgerPayConfigured()) {
    return NextResponse.json(
      { error: "BridgerPay is not configured on the server." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const order = getDefaultOrder();
  const local = isLocalHost(req.headers.get("host"));

  // On localhost every product is free so the checkout can be exercised
  // end-to-end without a real charge; production always bills the real total.
  const amount = local
    ? 0
    : Number.isFinite(body.amount)
      ? Math.round(Number(body.amount))
      : order.amount;
  const currency = (body.currency as string) ?? order.currency;
  const country = (body.country as string) ?? "US";
  const customer = body.customer as
    | {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
      }
    | undefined;

  if (!local && !(amount > 0)) {
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
      { error: "Could not start BridgerPay payment." },
      { status: 502 },
    );
  }
}
