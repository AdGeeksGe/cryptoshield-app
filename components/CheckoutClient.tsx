"use client";

import { useMemo, useState, type ReactNode } from "react";
import { formatMoney, gatewayEnabled, type GatewayId } from "@/lib/order";

interface Addon {
  id: string;
  name: string;
  meta: string;
  price: number; // minor units
  icon: ReactNode;
}

const BASE_LINE = {
  name: "Mobile Security App | CryptoShield App",
  price: Number(process.env.NEXT_PUBLIC_DEFAULT_AMOUNT ?? "25000"),
};
const CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "USD";

const ICON_WEB = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
const ICON_MAIL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
);
const ICON_SHIELD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-4Z" /><path d="M12 8v5m0 3h.01" /></svg>
);
const ICON_CLOUD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 18Z" /><path d="m9.5 13.5 2 2 3.5-3.5" /></svg>
);

const ADDONS: Addon[] = [
  { id: "defensx", name: "DefensX Secure Web", meta: "Advanced Web & Phishing Protection", price: 5000, icon: ICON_WEB },
  { id: "hornet-mail", name: "HornetSecurity Mail Protection", meta: "Microsoft 365 Email Security", price: 5000, icon: ICON_MAIL },
  { id: "hornet-365", name: "HornetSecurity 365 Total Protection", meta: "Email Security + Backup", price: 15000, icon: ICON_SHIELD },
  { id: "acronis", name: "Acronis Cyber Protect", meta: "Cloud Backup & Cybersecurity", price: 8999, icon: ICON_CLOUD },
];

const COUNTRIES = ["United States (US)", "United Kingdom (UK)", "Canada", "Australia", "Germany", "France", "Georgia"];

type Billing = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
};

const EMPTY_BILLING: Billing = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  city: "",
  postcode: "",
  country: COUNTRIES[0],
};

export default function CheckoutClient() {
  const [billing, setBilling] = useState<Billing>(EMPTY_BILLING);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [gateway, setGateway] = useState<GatewayId>(
    gatewayEnabled.bridgerpay ? "bridgerpay" : "paycom",
  );
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const total = useMemo(() => {
    let t = BASE_LINE.price;
    for (const a of ADDONS) if (selectedAddons.has(a.id)) t += a.price;
    return t;
  }, [selectedAddons]);

  const set = (k: keyof Billing) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setBilling((b) => ({ ...b, [k]: e.target.value }));

  const toggleAddon = (id: string) =>
    setSelectedAddons((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function validate(): string | null {
    const required: (keyof Billing)[] = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "city",
      "postcode",
      "country",
    ];
    for (const k of required) if (!billing[k].trim()) return "Please complete all required billing fields.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(billing.email)) return "Please enter a valid email address.";
    return null;
  }

  async function pay() {
    const v = validate();
    if (v) {
      setErrorMsg(v);
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    const payload = {
      amount: total,
      currency: CURRENCY,
      country: "US",
      customer: {
        firstName: billing.firstName,
        lastName: billing.lastName,
        email: billing.email,
      },
    };

    try {
      if (gateway === "paycom") {
        const res = await fetch("/api/payments/paycom/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Online payment error");
        await mountPaycom(data.clientSecret, data.publishableKey);
      } else {
        const res = await fetch("/api/payments/bridgerpay/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "PayPal error");
        mountBridgerPay(data.cashierKey, data.cashierToken);
      }
      setStatus("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Payment could not be started.");
      setStatus("error");
    }
  }

  return (
    <div className="co-grid">
      {/* ---------------- Billing details ---------------- */}
      <section className="co-card co-billing">
        <h3 className="co-card-h">Billing details</h3>
        <Field label="First Name" req value={billing.firstName} onChange={set("firstName")} />
        <Field label="Last Name" req value={billing.lastName} onChange={set("lastName")} />
        <Field label="Email" req type="email" value={billing.email} onChange={set("email")} />
        <Field label="Phone" req type="tel" value={billing.phone} onChange={set("phone")} />
        <Field label="Company Name (optional)" value={billing.company} onChange={set("company")} />
        <Field label="Address" req value={billing.address} onChange={set("address")} />
        <Field label="City" req value={billing.city} onChange={set("city")} />
        <Field label="Post Code" req value={billing.postcode} onChange={set("postcode")} />
        <div className="co-field">
          <label>Country <span className="req">*</span></label>
          <select value={billing.country} onChange={set("country")}>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ---------------- Order summary ---------------- */}
      <section className="co-card co-order">
        <h3 className="co-card-h">Your order</h3>

        <table className="co-table">
          <thead>
            <tr><th>Product</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="co-prod">{BASE_LINE.name} &nbsp;×&nbsp;1</td>
              <td className="co-amt">{formatMoney(BASE_LINE.price, CURRENCY)} / year</td>
            </tr>
            {ADDONS.filter((a) => selectedAddons.has(a.id)).map((a) => (
              <tr key={a.id}>
                <td className="co-prod">{a.name} &nbsp;×&nbsp;1</td>
                <td className="co-amt">{formatMoney(a.price, CURRENCY)} / year</td>
              </tr>
            ))}
            <tr className="co-row-strong">
              <td>Subtotal</td><td className="co-amt">{formatMoney(total, CURRENCY)}</td>
            </tr>
            <tr className="co-row-strong">
              <td>Total</td><td className="co-amt">{formatMoney(total, CURRENCY)}</td>
            </tr>
            <tr className="co-row-head"><td colSpan={2}>Recurring totals</td></tr>
            <tr className="co-row-strong">
              <td>Recurring total</td>
              <td className="co-amt">{formatMoney(total, CURRENCY)} / year</td>
            </tr>
          </tbody>
        </table>

        <div className="co-upsell">
          <div className="co-upsell-h">Add more products to cart</div>
          {ADDONS.map((a) => {
            const on = selectedAddons.has(a.id);
            return (
              <div className="co-upsell-row" key={a.id}>
                <div className="co-upsell-ic" aria-hidden="true">{a.icon}</div>
                <div className="co-upsell-info">
                  <b>{a.name}</b>
                  <span>{formatMoney(a.price, CURRENCY)} / year · {a.meta}</span>
                </div>
                <button
                  type="button"
                  className={"co-add" + (on ? " on" : "")}
                  onClick={() => toggleAddon(a.id)}
                >
                  {on ? "Remove" : "Add"}
                </button>
              </div>
            );
          })}
        </div>

        {/* ---------------- Payment methods ---------------- */}
        <div className="co-pay">
          {gatewayEnabled.bridgerpay && (
            <label className={"co-method" + (gateway === "bridgerpay" ? " sel" : "")}>
              <input type="radio" name="gw" checked={gateway === "bridgerpay"} onChange={() => setGateway("bridgerpay")} />
              <span className="co-method-body">
                <b>PayPal</b>
                <small>Pay via PayPal.</small>
              </span>
            </label>
          )}
          {gatewayEnabled.paycom && (
            <label className={"co-method" + (gateway === "paycom" ? " sel" : "")}>
              <input type="radio" name="gw" checked={gateway === "paycom"} onChange={() => setGateway("paycom")} />
              <span className="co-method-body">
                <b>Online payments</b>
                <small>Cards, wallets & local payment methods.</small>
              </span>
            </label>
          )}
        </div>

        <p className="co-privacy">
          Your personal data will be used to process your order and support your
          experience throughout this website, as described in our{" "}
          <a href="#">privacy policy</a>.
        </p>

        {status === "error" && <p className="co-error">{errorMsg}</p>}

        <button type="button" className="co-submit" onClick={pay} disabled={status === "loading"}>
          {status === "loading" ? "Starting secure payment…" : `Pay ${formatMoney(total, CURRENCY)}`}
        </button>

        {/* Gateway widgets mount here */}
        <div id="paycom-container" className="co-widget" />
        <div
          id="bridgerpay-container"
          className="co-widget"
          data-cashier-key=""
          data-cashier-token=""
        />
      </section>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  req?: boolean;
}) {
  return (
    <div className="co-field">
      <label>
        {props.label} {props.req && <span className="req">*</span>}
      </label>
      <input type={props.type ?? "text"} value={props.value} onChange={props.onChange} />
    </div>
  );
}

/* ----------------------- Gateway widget loaders ----------------------- */

function loadScript(src: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    if (attrs) for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

// Pay.com Universal Web Component. SDK URL + init match the documented pattern
// at https://apiref.pay.com/docs/using-the-paycom-sdk — confirm method names
// against the version your account uses.
async function mountPaycom(clientSecret: string, publishableKey: string) {
  const sdkUrl =
    process.env.NEXT_PUBLIC_PAYCOM_SDK_URL ?? "https://cdn.pay.com/sdk/v1/pay.js";
  await loadScript(sdkUrl);
  const w = window as unknown as {
    Paycom?: (key: string) => {
      create: (o: { clientSecret: string }) => { mount: (sel: string) => void };
    };
  };
  if (!w.Paycom) throw new Error("Online payments could not load.");
  const instance = w.Paycom(publishableKey);
  const component = instance.create({ clientSecret });
  component.mount("#paycom-container");
}

// BridgerPay Checkout (Cashier) widget. The launcher script reads the
// data-cashier-key / data-cashier-token attributes from the container.
function mountBridgerPay(cashierKey: string, cashierToken: string) {
  const container = document.getElementById("bridgerpay-container");
  if (container) {
    container.setAttribute("data-cashier-key", cashierKey);
    container.setAttribute("data-cashier-token", cashierToken);
  }
  const checkoutUrl =
    process.env.NEXT_PUBLIC_BRIDGERPAY_CHECKOUT_URL ??
    "https://checkout.bridgerpay.com/v2/launcher";
  void loadScript(checkoutUrl, {
    "data-cashier-key": cashierKey,
    "data-cashier-token": cashierToken,
    "data-button-text": "Pay now",
  });
}
