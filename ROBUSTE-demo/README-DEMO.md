# ROBUSTE — Portfolio Demo Build

This is a **safe, separate demo version** of the ROBUSTE store, made to live inside your
portfolio. It is intentionally different from your live production site.

## ⚠️ Security (read first)
Your real `telegram.js` had a **live bot token + chat id hard-coded in client-side JS**,
and `admin.html` exposes your Firebase config. Anyone who opens “View Source” on your live
site can read them. **Action:** open BotFather → `/revoke` → get a new token, and lock down
your Firebase rules. This demo build contains **no token and no real sending**.

## What changed vs. the real site
| File | Change |
|------|--------|
| `telegram.js` | Replaced with a **safe stub** — no token, never sends. It triggers a visual “owner notification” illustration instead. |
| `index.html`, `product.html`, `admin.html` | Added two lines before `</body>` to load the demo guide layer. |
| `demo-guide.css` / `demo-guide.js` | **New** — the whole interactive walkthrough layer. |
| `admin.html` | Login is **skipped** in demo mode, with a banner explaining only your one authorized email + password can really enter. Sample orders fill the dashboard. |

## Features of the guide layer
- **Guided tour** — spotlight walkthrough that auto-starts on first visit (▶ button to replay).
- **Popping arrows + hotspots** — pulsing dots on key elements; click/hover to pop a curved arrow + explanation.
- **“Fully customizable”** tag on every annotation.
- **Owner-notification illustration** — shows what reaches you (Telegram + email, full order details, total) the moment a customer confirms, with the note: *confirm by calling the customer*.
- **Language toggle** — English (main) ⇄ Arabic, remembered per visitor.
- **Admin explanation + skip** — as requested.

## How to use
1. Copy your full project (with `images/`, `style.css`, `premium.css`, bootstrap, etc.).
2. Drop these files in, replacing the originals: `telegram.js`, `index.html`, `product.html`,
   `admin.html`, plus the two new files `demo-guide.css` and `demo-guide.js`.
3. Host it under a demo path (e.g. `yoursite.com/demo/robuste/`) and link it from your portfolio.

## To turn the guide OFF (make it the real site again)
Remove the two `demo-guide` lines before `</body>` in the three HTML files, and restore your
(secured, new-token) `telegram.js`.

## Admin credential note
In production, exactly one authorized email + password (the pair you give me) can open
`admin.html`, secured by Firebase Authentication. Update the banner text in `demo-guide.js`
(`adminBypass()`) if you want different wording.
