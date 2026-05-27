# Payments setup — Pay.com & BridgerPay

This app ships with both **Pay.com** and **BridgerPay** wired into the checkout
(`/checkout`). The code is complete; what's left is account setup and dropping
your credentials into environment variables. This guide is the **"what I need
from you"** checklist.

> Both providers require a **real merchant account and approval** before live
> payments work, and both keep their full API reference behind a login. The
> integration follows each provider's documented pattern, but a few exact
> values (SDK script URL, API version path, webhook signature header) can vary
> per account — those are all env-overridable and flagged below so you can
> confirm them against **your** dashboard without touching code.

---

## 1. How the checkout works (architecture)

```
Browser (/checkout)                     Your Next.js server                 Provider
─────────────────────                   ───────────────────                 ────────
fill billing form
choose Pay.com / BridgerPay
click "Pay $X"
        │  POST /api/payments/<gw>/...      ┌─ uses SECRET key ─┐
        ├──────────────────────────────────►  create session   ──────────────►  create
        │                                   └───────────────────┘             session/charge
        │  ◄── clientSecret / cashierToken ──                    ◄── token/secret ──
        │
render provider widget in the page
(Pay.com Universal Component / BridgerPay Cashier)
        │
customer pays ───────────────────────────────────────────────────────────►  processes
        │                                                                      payment
        │  redirect to /checkout/success                                          │
        │                                                                          │
        │            POST /api/payments/<gw>/webhook  ◄───────────────────────────┘
        │            (verify signature, fulfil order)        server-to-server
```

- **Secret keys never reach the browser.** They live only in server-side route
  handlers (`app/api/payments/...`).
- The browser only ever gets a short-lived **client secret** (Pay.com) or
  **cashier token** (BridgerPay) to render the payment widget.
- The **webhook** is the source of truth for "payment succeeded" — always fulfil
  orders from the webhook, not from the browser redirect.

Relevant files:

| File | Purpose |
|------|---------|
| `lib/paycom.ts` / `lib/bridgerpay.ts` | server-side API clients |
| `app/api/payments/paycom/create/route.ts` | creates a Pay.com payment session |
| `app/api/payments/bridgerpay/session/route.ts` | creates a BridgerPay cashier session |
| `app/api/payments/*/webhook/route.ts` | receive + verify payment status callbacks |
| `components/CheckoutClient.tsx` | billing form, cart, gateway selection, widget mount |
| `lib/order.ts` | order amount / currency / gateway on-off flags |

---

## 2. Local quick start

```bash
npm install
cp .env.local.example .env.local   # then fill in values (section 5/6)
npm run dev                        # http://localhost:3000
```

Without credentials the checkout still renders; clicking **Pay** returns a
"not configured" message (HTTP 503) instead of charging. That's expected until
you add keys.

---

## 3. What I need from you — short version

**Pay.com**
- [ ] Approved Pay.com merchant account
- [ ] **Secret API key** (`sk_…`) and **Publishable key** (`pk_…`)
- [ ] **Webhook signing secret**
- [ ] Confirm the **Universal Component SDK URL** from your dashboard docs

**BridgerPay**
- [ ] Approved BridgerPay account **with at least one PSP/acquirer connected**
- [ ] **API key**, **Cashier key**, **API username**, **API password**
- [ ] **Postback/webhook signing secret**
- [ ] Confirm the **auth endpoint path** and **checkout launcher URL** for your account

**Both**
- [ ] Your public site URL (for return + webhook URLs), e.g. `https://app.cryptoshield.com`

Hand me those (or paste them into `.env.local` yourself) and the checkout goes
live. Detailed steps for obtaining each below.

---

## 4. Pay.com — step by step

1. **Create / verify the account.** Sign up at <https://pay.com>, complete
   business verification (KYC) and add a **payout destination** (bank). Live
   keys don't activate until verification passes — use test keys meanwhile.

2. **Get your API keys.** Dashboard → **Developers → API keys**. Copy:
   - **Secret key** → `PAYCOM_SECRET_KEY` (server-only; sent in the
     `x-paycom-api-key` header).
   - **Publishable key** → `NEXT_PUBLIC_PAYCOM_PUBLISHABLE_KEY` (used by the
     browser SDK to render the payment UI).

3. **Set up the webhook.** Dashboard → **Developers → Webhooks** → add endpoint:
   ```
   https://YOUR_DOMAIN/api/payments/paycom/webhook
   ```
   Subscribe to payment success/failed events. Copy the **signing secret** →
   `PAYCOM_WEBHOOK_SECRET`. (Until you set this, the webhook accepts unsigned
   calls so you can test; set it before going live.)

4. **Confirm two account-specific details** against
   <https://apiref.pay.com> (these have safe defaults but verify):
   - Create-session path — default `POST /v1/sessions/payment`
     (`PAYCOM_CREATE_SESSION_PATH`).
   - **Universal Web Component SDK URL** — set
     `NEXT_PUBLIC_PAYCOM_SDK_URL` to the script URL shown in
     *"Using the Pay.com SDK"*. The mount code in
     `components/CheckoutClient.tsx → mountPaycom()` follows the documented
     `Paycom(key).create({clientSecret}).mount('#paycom-container')` pattern;
     adjust method names there only if your SDK version differs.

5. **Test, then go live.** Use Pay.com's test mode + test cards to run an end
   to-end payment, confirm the webhook fires, then swap test keys for live keys.

---

## 5. BridgerPay — step by step

> BridgerPay is a payment **orchestration** layer: it doesn't process money
> itself — it routes to PSPs/acquirers you connect. So onboarding has an extra
> step (connect a processor) and usually involves their sales/onboarding team.

1. **Get an account.** Request access at <https://bridgerpay.com> and complete
   onboarding. BridgerPay is B2B, so expect a sales/onboarding contact rather
   than instant self-serve signup.

2. **Connect at least one PSP/acquirer.** In the BridgerPay dashboard, add and
   configure a processor (e.g. your acquiring bank, Stripe, Worldpay, etc.).
   **Until a processor is connected and approved, the cashier has nothing to
   route to and payments will fail.**

3. **Collect your credentials.** Dashboard → **Developers / API**:
   - **API key** → `BRIDGERPAY_API_KEY` (goes in the create-session URL path).
   - **Cashier key** → `BRIDGERPAY_CASHIER_KEY` (public; used by the browser
     widget as `data-cashier-key`).
   - **API username** → `BRIDGERPAY_USERNAME`
   - **API password** → `BRIDGERPAY_PASSWORD`

   (Username + password are used server-side to fetch a short-lived Bearer
   `access_token`, which is then used to create the cashier session.)

4. **Set up the postback/webhook.** Dashboard → **Developers → Webhooks /
   Postback** → add:
   ```
   https://YOUR_DOMAIN/api/payments/bridgerpay/webhook
   ```
   Copy the signing secret → `BRIDGERPAY_WEBHOOK_SECRET`.

5. **Confirm two account-specific details** (defaults provided, verify against
   your dashboard's API section):
   - Auth endpoint — default `POST /v1/auth/producer/api-key`
     (`BRIDGERPAY_AUTH_PATH`). The create-session call uses the documented
     `POST /v2/cashier/session/create/{api_key}`.
   - **Checkout launcher URL** — `NEXT_PUBLIC_BRIDGERPAY_CHECKOUT_URL`
     (default `https://checkout.bridgerpay.com/v2/launcher`). The widget mounts
     via `data-cashier-key` + `data-cashier-token` in
     `components/CheckoutClient.tsx → mountBridgerPay()`.

6. **Test, then go live.** Run a test transaction through a sandbox processor,
   confirm the postback hits your webhook, then enable the live processor.

---

## 6. Environment variables reference

See `.env.local.example` for the full list. Summary:

| Variable | Where used | Secret? |
|----------|-----------|---------|
| `NEXT_PUBLIC_BASE_URL` | builds return/webhook URLs | no |
| `NEXT_PUBLIC_DEFAULT_AMOUNT` / `_CURRENCY` | default order total (cents) | no |
| `NEXT_PUBLIC_ENABLE_PAYCOM` / `_BRIDGERPAY` | show/hide a gateway | no |
| `PAYCOM_SECRET_KEY` | Pay.com auth header | **yes** |
| `NEXT_PUBLIC_PAYCOM_PUBLISHABLE_KEY` | Pay.com browser SDK | no |
| `PAYCOM_WEBHOOK_SECRET` | verify Pay.com webhooks | **yes** |
| `BRIDGERPAY_API_KEY` | session URL | **yes** |
| `BRIDGERPAY_CASHIER_KEY` | browser widget | no |
| `BRIDGERPAY_USERNAME` / `BRIDGERPAY_PASSWORD` | server auth | **yes** |
| `BRIDGERPAY_WEBHOOK_SECRET` | verify BridgerPay postbacks | **yes** |

Set the same variables in your hosting provider's dashboard for production
(e.g. Vercel → Project → Settings → Environment Variables). **Never commit
`.env.local`** — it's gitignored.

---

## 7. Important notes / caveats

- **Order fulfilment is a TODO.** Both webhook handlers verify the signature and
  log the event, with a clearly-marked `TODO` where you should mark the order
  paid / send the receipt / provision access. Wire that to your DB or CRM.
- **Amount units differ between providers.** Internally the app stores amounts
  in **minor units (cents)**. Pay.com is sent the cents value as-is; BridgerPay
  is sent **major units** (we divide by 100 in `lib/bridgerpay.ts`). Confirm
  your accounts' expected units when testing.
- **I could not run a live end-to-end charge** because that requires your real
  merchant credentials. The build, routing, server flow, and UI are all
  verified; the live payment hop should be smoke-tested once keys are in.
- **Adding more gateways / PayPal:** the pattern (a `lib/<gw>.ts` client + a
  `create`/`session` route + a `webhook` route + a radio option in
  `CheckoutClient.tsx`) is the same for any additional provider.
