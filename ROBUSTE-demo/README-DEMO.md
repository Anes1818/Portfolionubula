# ROBUSTE — Portfolio Demo Build

This is a **safe, self-contained demo** of the real ROBUSTE storefront, built for
the Nebula portfolio (Template 03 → `ROBUSTE-demo/index.html`).

## What's different from the live store
Everything runs **100% in the browser** — no real backend, no keys, no network calls:

| Live store | Demo build |
|---|---|
| Firebase Firestore | `demo-mock.js` — in-browser store backed by `localStorage` (pre-seeded with sample orders + reviews) |
| Firebase Auth (admin login) | Auto-signed-in demo admin — `admin.html` opens straight to the dashboard |
| EmailJS | No-op that always "succeeds" |
| Telegram bot alerts | Simulated — shows a “owner notified” toast instead of hitting the real API |
| Google Analytics | Disabled (no tracking) |

All real API keys, the EmailJS key, the Telegram bot token, and the Firebase
config have been **stripped and replaced with `DEMO_DISABLED` placeholders**.

## Demo-only files added
- `demo-mock.js` — mock Firebase + EmailJS + analytics (loads first, in `<head>`)
- `telegram.js` — replaced with a simulated notifier
- `demo-enhance.js` — branded fallback for any image that hasn't been uploaded yet
- `demo-tour.js` / `demo-tour.css` — guided showcase: intro splash, annotation pins,
  bilingual (AR/EN) copy, and the “order received → owner notified” toast

## About the product images
The product image **paths** (`images/*.jpg`) are kept exactly as in the real site.
The moment you upload the real `images/` folder to the repo, the genuine photos
appear automatically. Until then, a clean branded placeholder is shown — nothing
breaks.

## Bilingual
The site already ships a full AR / EN / FR switcher (top-right globe button) with
automatic RTL↔LTR layout flipping. The demo just makes it more prominent.

## To reset the demo data
In the browser console: `ROBUSTE_DEMO.resetData()` then reload.

## ⚠ Security reminder
The **live** site still has these keys exposed in its public source. You should
rotate them on the real project:
- Revoke/regenerate the Telegram bot token via **@BotFather**
- Rotate the Firebase web config / lock down Firestore rules
- Rotate the EmailJS key


## Step 1 template-base upgrade
- Edit `config.js` for each client.
- `template-core.js` applies branding, contact links, currency, and payment CTA logic.
- `telegram.js` is Worker-ready and contains no bot token.
- `workers/telegram-worker.js` is the secure relay sample.
- `firebase/firestore.rules` is the production starting point.
- See `HANDOVER-TEMPLATE.md`.
