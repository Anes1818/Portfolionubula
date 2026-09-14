# Shop owner setup

Edit **shop-config.js** with a text editor. It is a public website file: never
put passwords, API keys or other secrets in it.

## Before customer use

1. Set `name` to the real shop name.
2. Select the currency. Rates are integer hundredths: `400` means 4.00, not
   400.00. Intended for two-decimal currencies such as USD, EUR and DZD.
   Changing the currency label does **not** convert any price.
3. Review every entry in `flowerPrices`, plus preparation (`baseCents`), labour
   per style, and the optional extras. One catalogue position may depict a stem,
   a head, a cluster or a sprig — set the unit consistently with how you sell.
4. Set `demo: false` only after you approve the rates. They remain estimates
   requiring your final confirmation.
5. Fill `studio` with your own details: `name`, `site`, `phone`, `instagram`,
   `place` and `year`. These appear in the page footer **and are printed on every
   exported picture**, so a shared bouquet leads back to you. Text only — the app
   never follows or calls them.
6. Deploy the complete folder and open it on a real phone before launch.

## What the customer can do

- Design three separate bouquets (Classic, Dome, Flat heart), each saved locally.
- See a live estimate that sums real catalogue units, preparation, labour and
  chosen extras. Empty template positions cost nothing.
- **Share bouquet** — the app builds a 1080×1080 PNG and hands it to the phone's
  own share sheet as an image file. Where the device cannot share files it
  downloads instead.
- **Save design** — PNG artwork plus an editable JSON of all three bouquets.

**There is no order flow.** Nothing is sent, no payment is taken, no stock is
reserved and there is no backend. A customer who wants to buy has to contact you
by your normal channels — the picture carries your details.

`whatsapp` and `email` remain in the config file but are **not used** by the
current build; the quote flow that read them was removed. Leave them empty
unless a future version reinstates it.

## Your confirmation workflow

Treat a customer's picture as a request, never a quote. Review stock, real stems,
flower sizes, assembly, paper choice, delivery area and date, tax and final
price, and ask them to approve any substitution before you confirm.

Saved and imported designs are always priced from your **current** configuration,
never from a total supplied by the customer. Browser saves are device-local. For
a substantial price change, communicate the revised figure rather than letting an
old screenshot stand as a guarantee.

## One thing to decide before launch

The per-position list that let people edit with a keyboard or a screen reader was
removed to simplify the interface. Editing now requires seeing and touching the
canvas. If you sell this to businesses that must meet ADA or WCAG, raise it with
them deliberately rather than letting it surface later. See TEST-REPORT.md.

---

© 2026 Nebula Sites Studio. All rights reserved.
