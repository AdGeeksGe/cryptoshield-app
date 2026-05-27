# CryptoShield · CyberNoble365

Marketing site + checkout for **CryptoShield**, the mobile security app from
CyberNoble365 (in partnership with Aspis Cyber Security). Built with **Next.js
(App Router) + TypeScript**.

## What's in this repo

- `app/page.tsx` — the marketing landing page (renders `content/landing.html`).
- `content/landing.html` — the original hand-authored landing markup (kept
  verbatim for pixel-perfect fidelity).
- `app/globals.css` — all site styles, plus the checkout styles.
- `components/LandingInteractions.tsx` — sticky header, mobile menu, FAQ
  accordion, scroll-reveal and the free health-check form (client-side).
- `app/checkout/` — WooCommerce-style checkout (billing + order summary +
  payment method selection) with **Pay.com** and **BridgerPay**.
- `app/api/payments/` — server route handlers for creating payment sessions and
  receiving webhooks.
- `lib/` — gateway clients + order config.
- `index.html` — the original single-file build, kept for reference.

## Run locally

```bash
npm install
cp .env.local.example .env.local   # fill in payment keys when ready
npm run dev                        # http://localhost:3000
```

- Landing page: `/`
- Checkout: `/checkout`

`npm run build` produces a production build; `npm start` serves it.

## Payments

Pay.com and BridgerPay are fully wired into `/checkout`. Account setup and the
exact credentials you need to provide are documented in **[SETUP.md](./SETUP.md)**.
Without keys the checkout renders but returns "not configured" on pay.

## Sections (landing)

Hero · Threat coverage · Bottom line · Phone inventory · Deployed · Sound
familiar? · Inside the app · How it works · Free diagnosis · FAQ · Final CTA.

## Brand

- **Type:** Outfit (sans, primary), Lora (serif wordmark moments)
- **Palette:** `--navy: #0F174F`, `--crimson: #FF0042`, `--gold: #D8BE75`, `--peri: #C6CBEA`
- **Voice:** friendly, family-focused, no "military-grade" / "enterprise-grade" language.
