# Payments setup — BridgerPay

The checkout offers two payment options — **PayPal** and **Online payments**
(cards/wallets) — and **both are processed by BridgerPay**. They differ only in
which method type the BridgerPay cashier opens with. There is no other gateway.

> BridgerPay is a payment **orchestration** layer: it doesn't process money
> itself, it routes to the PSPs/acquirers you connect. So the cashier will only
> show a payment form once at least one matching processor is connected and
> active in your BridgerPay dashboard.

---

## 1. How the checkout works (architecture)

```
Browser (/checkout)                  Your Next.js server              BridgerPay
─────────────────────                ───────────────────              ──────────
fill billing form
choose PayPal / Online payments
click "Pay $X"
        │  POST /api/payments/bridgerpay/session   ┌ login (user/pass) ┐
        ├──────────────────────────────────────────►  create cashier   ──────►
        │                                          └  session (Bearer) ┘
        │  ◄────────── { cashierKey, cashierToken } ──────────────────────────
        │
mount BridgerPay cashier in the page
(data-single-payment-method = apm | credit_card)
        │
customer pays ──────────────────────────────────────────────────────►  routes
        │                                                                 to PSP
        │            POST /api/payments/bridgerpay/webhook  ◄──────────────┘
        │            (parse status, fulfil only when approved)  server-to-server
```

- **Secrets never reach the browser.** The username/password live only in the
  server route; the browser gets a short-lived **cashier token** to render the
  widget.
- The **webhook/postback is the source of truth** for "payment succeeded".
  Reaching `/checkout/success` only means BridgerPay redirected the browser — it
  does **not** mean money was captured.

Relevant files:

| File | Purpose |
|------|---------|
| `lib/bridgerpay.ts` | server-side BridgerPay client (login + create session) |
| `app/api/payments/bridgerpay/session/route.ts` | creates a cashier session |
| `app/api/payments/bridgerpay/webhook/route.ts` | parses postbacks, gates fulfilment on approval |
| `components/CheckoutClient.tsx` | billing form, cart, method selection, cashier mount |
| `lib/order.ts` | order amount/currency, payment-method flags, localhost-$0 helper |

---

## 2. Local quick start

```bash
npm install
cp .env.local.example .env.local   # then fill in the BridgerPay values
npm run dev                        # http://localhost:3000
```

**On localhost every product is billed at $0** (see `lib/order.ts → isLocalHost`)
so you can exercise the full flow without a real charge. Production always bills
the real total.

> The webhook/postback can **never** reach `localhost` — BridgerPay posts to the
> public URL you registered. To see postbacks during local dev you'd need a
> tunnel (e.g. ngrok) pointed at the webhook and registered temporarily.

---

## 3. What you need from BridgerPay

- [ ] Approved BridgerPay account **with at least one PSP/acquirer connected**
      (a card acquirer for "Online payments", a PayPal connector for "PayPal").
- [ ] **API key**, **Cashier key**, **API username**, **API password**.
- [ ] (Optional) **Postback signing secret** to verify webhooks.
- [ ] Your public site URL for the webhook, e.g. `https://cryptoshield-app.vercel.app`.

---

## 4. BridgerPay — step by step

1. **Connect at least one processor.** In the BridgerPay dashboard, add and
   activate a PSP/acquirer for your currency + country. **Until a processor is
   connected, the cashier opens but shows no payment methods** — that's the
   `psp: null` / `cashier.session.init` state you'll see in the webhook log.

2. **Collect credentials** (Dashboard → Developers / API):
   - **API key** → `BRIDGERPAY_API_KEY` (goes in the create-session URL path)
   - **Cashier key** → `BRIDGERPAY_CASHIER_KEY` (public; used by the browser widget)
   - **API username** → `BRIDGERPAY_USERNAME`
   - **API password** → `BRIDGERPAY_PASSWORD`

   Username + password are exchanged server-side at `POST /v2/auth/login` for a
   short-lived Bearer token, which then creates the cashier session at
   `POST /v2/cashier/session/create/{api_key}`.

3. **Register the postback/webhook** (Dashboard → Developers → Webhooks):
   ```
   https://YOUR_DOMAIN/api/payments/bridgerpay/webhook
   ```
   If they give you a **signing secret**, set `BRIDGERPAY_WEBHOOK_SECRET`. Leave
   it empty otherwise (the handler then accepts unsigned postbacks). Do **not**
   put the webhook URL in that variable.

4. **PayPal vs Online payments.** Each button opens the cashier with a
   `data-single-payment-method` filter — `apm` for PayPal, `credit_card` for
   Online payments (override via `NEXT_PUBLIC_BRIDGERPAY_PAYPAL_METHOD` /
   `NEXT_PUBLIC_BRIDGERPAY_ONLINE_METHOD`). The relevant PSP must be connected
   for that method to appear.

5. **Go live.** On Vercel, set the four `BRIDGERPAY_*` vars (paste the password
   as the **raw literal** — no quotes/escaping; the `\$` escape is only for the
   `.env.local` file). Run a transaction and confirm the webhook logs
   `status: 'approved'` with a real `psp` name.

---

## 5. Environment variables reference

See `.env.local.example` for the full list. Summary:

| Variable | Where used | Secret? |
|----------|-----------|---------|
| `NEXT_PUBLIC_BASE_URL` | builds return/webhook URLs | no |
| `NEXT_PUBLIC_DEFAULT_AMOUNT` / `_CURRENCY` | default order total (cents) | no |
| `NEXT_PUBLIC_ENABLE_PAYPAL` / `_ONLINE` | show/hide a checkout method | no |
| `NEXT_PUBLIC_BRIDGERPAY_PAYPAL_METHOD` / `_ONLINE_METHOD` | cashier method filter | no |
| `BRIDGERPAY_API_KEY` | session URL path | **yes** |
| `BRIDGERPAY_CASHIER_KEY` | browser widget | no |
| `BRIDGERPAY_USERNAME` / `BRIDGERPAY_PASSWORD` | server login | **yes** |
| `BRIDGERPAY_WEBHOOK_SECRET` | verify postbacks (optional) | **yes** |

Set the same variables in Vercel → Project → Settings → Environment Variables.
**Never commit `.env.local`** — it's gitignored.

---

## 6. Important notes / caveats

- **Order fulfilment is a TODO.** The webhook parses BridgerPay's status and
  only marks `paid` for genuinely-captured statuses; wire the actual fulfilment
  (mark paid / send receipt / provision access) to your DB or CRM at the marked
  `TODO`, gated on `paid === true`.
- **Amount units.** Internally amounts are **minor units (cents)**; BridgerPay
  is sent **major units** (divided by 100 in `lib/bridgerpay.ts`).
- **`.env.local` password gotcha.** The password contains `$`, which Next's
  dotenv-expand treats as a variable reference. In `.env.local` it must be
  escaped as `\$`; in the Vercel dashboard paste it literally.
