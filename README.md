# TeamLink.gg

A duo-teammate booking platform — book a skilled, verified teammate to play with in under two minutes. Inspired by [tapin.gg](https://tapin.gg) and [eloboost.gg](https://eloboost.gg), built as a standalone Next.js project (not a migration of any existing site).

## Design system

Everything lives in one stylesheet (`src/app/globals.css`): dark navy background, a single flat blue accent color, Inter font, modest corner radii. Deliberately avoids gradient text/buttons and other "generic AI SaaS" visual tics.

## Status

Frontend-only pass with mock data (games, pricing, reviews) — no real backend, auth, or payment provider yet. See the initial commit message for a full breakdown of what's built (header, landing page, games directory, per-game booking widget, mock checkout, footer) and known gaps (`/login`, `/signup`, `/about`, `/blog`, `/careers`, `/contact`, `/legal/*` are linked but not built).

## Getting started

Requires Node.js >= 20.9.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Beyond `DATABASE_URL`, `AUTH_SECRET` and the OAuth pairs, payments need:

| Variable | Where to get it |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys (`sk_test_…` while testing) |
| `STRIPE_WEBHOOK_SECRET` | Created with the webhook endpoint below (`whsec_…`) |

Point a Stripe webhook at `/api/stripe/webhook` and subscribe to
`checkout.session.completed`, `payment_intent.succeeded`,
`payment_intent.payment_failed` and `charge.refunded`. Locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Without these the payment paths refuse politely; nothing else is affected.

Exchange rates come from the ECB's public daily feed (`src/lib/fx.ts`) and
need no key. Every amount is stored and charged in EUR — other currencies are
display only.

## Database

Schema changes ship as plain SQL in `prisma/sql/`, applied with:

```bash
npm run db:migrate:legacy   # runs every file in order, all are idempotent
npx prisma generate
```
