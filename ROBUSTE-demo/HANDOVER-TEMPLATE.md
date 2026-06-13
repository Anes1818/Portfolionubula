# ROBUSTE Template Base — Step 1 Handover

This folder is now a **reusable storefront base**, not a one-off ROBUSTE site.

## For each new client, edit first
1. `config.js`
   - business name, logo, colors
   - phone / WhatsApp / email / address
   - currency
   - payment link
   - Firebase config
   - notification Worker URL
2. `products.json`
   - products, prices, images
3. legal pages
   - privacy / terms / refund / shipping

## Payment model
The client owns their Stripe / PayPal / Square account. Put their hosted payment link in:

```js
payments: {
  mode: 'payment_link',
  provider: 'stripe',
  checkoutUrl: 'https://buy.stripe.com/...'
}
```

If left as `cod`, the site keeps cash-on-delivery mode.

## Telegram security
Never put a Telegram token in browser code.

Use `workers/telegram-worker.js` on Cloudflare Workers and set these secrets:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `ALLOWED_ORIGIN` = your client domain

Then paste the Worker URL into `config.js`:

```js
notifications: { workerUrl: 'https://your-worker.yourname.workers.dev' }
```

## Firebase rules
Use `firebase/firestore.rules` as the starting rules. Test before production.

## What was cleaned
- Added config-driven branding/contact/payment layer
- Replaced frontend Telegram token logic with Worker-ready notifier
- Added strict Firestore rules starter
- Removed dead `premium.css`
- Removed old root-only SEO files earlier (`CNAME`, `robots.txt`, `sitemap.xml`) from demo package
