# Merchant payment emails: Resend setup

## Owner tasks (Sandbox first)

1. Create an account at <https://resend.com/signup>.
2. Domains → Add Domain → `notify.nebulastudio.site`. Sending is sufficient; receiving email is not needed.
3. In Cloudflare → nebulastudio.site → DNS, copy the exact names, types, values and MX priority supplied by Resend. Use DNS-only for any proxy-capable record. Do not replace existing apex-domain mail records.
4. Return to Resend and verify the domain. Wait for **Verified**.
5. API Keys → Create API Key → name `Nebula Sandbox` → Sending access → restrict to the verified domain.
6. Cloudflare → Workers & Pages → **nebula-payments-sandbox** → Settings → Variables and Secrets → add **Secret** named `RESEND_API_KEY`. Paste the key there, never into chat or GitHub. Save/deploy the secret.
7. Tell the developer that verification is complete and give only the email address you want to use as the test inbox.

Sandbox setup update, 1 November 2026: the owner verified `notify.nebulastudio.site`, stored the API key in the Sandbox Worker, and confirmed `anescareer@gmail.com` as the test inbox. Sandbox configuration now enables sending with that forced recipient and the same Reply-To. Production email remains disabled. Opt in inside **Customer requests → Payment notifications**, then use **Send test email**. The protected test action creates no order or payment, reuses repeat clicks within a minute, and uses the same durable outbox/provider idempotency path. Sandbox always overrides recipients to that one test inbox.

The sender is `orders@notify.nebulastudio.site` (`RESEND_FROM`). This is a sending identity, not a new paid mailbox. The email links to a private merchant order page and requires the correct florist’s sign-in. It contains no payment-capable customer recovery token. Bouquet images are inline attachments, not public order-image links.

Delivery confirmed, 1 November 2026: the owner shared a Gmail inbox screenshot of `[TEST] Nebula email notifications are connected`, sent from the verified sender. This proves the connection-test email reached that inbox. A new verified Square payment email with its saved bouquet still needs an end-to-end provider check; the connection test itself created no order or payment.

Later that day, a clearly labelled `Nebula Sandbox QA` order completed a real Square Sandbox deposit simulation. Server reconciliation confirmed CAD79.50 paid of CAD159.00 and the saved photo appeared on its receipt. Notification creation uses that verified payment event; inbox delivery of this payment email has not yet been independently confirmed. Sandbox still forces all notification recipients to the owner's confirmed test inbox.

Main-app setup update: the owner later installed a `RESEND_API_KEY` secret on Worker `nebula`. Main version `f657e706-517b-4419-875a-a6251ee9e88a` enables merchant email configuration with the same sender and Reply-To, without a forced test recipient. Each merchant must opt in with their verified sign-in email. No Production message or payment was created by the deployment checks; actual Production payment-email arrival remains unverified. Main customer checkout is still disabled pending the first real merchant pilot. See [Production launch record](PRODUCTION-SQUARE-LAUNCH.md).

## Test acceptance

- Make a new Sandbox full payment; let the signed Square webhook or server reconciliation verify it. Do not mark an order paid manually.
- Check the unread dashboard notification and immutable bouquet preview. Open the email and verify the image, reference, paid amount, balance and merchant sign-in link.
- Repeat with deposit + balance. Each verified payment should create one event; repeated Square events and page refreshes must not produce duplicates.
- Confirm actual arrival in the test inbox. An `accepted` outbox status means Resend accepted the API request, **not** proof of delivery to an inbox. Use Resend’s own email logs for delivery/bounce diagnostics.
- Simulated outages, response loss, 429s, duplicate events, cross-merchant access and frozen images are covered by local tests. Sending failures never remove the order, payment or unread event.

An outbox retry keeps the same payload and idempotency key and stops before Resend’s 24-hour idempotency retention expires. Old ambiguous sends become `expired` for review; there is no blind resend beyond that window. Email opt-out or a change in the verified recipient stops unsent events for the old recipient.

This setup does not enable production Square payments, production email, or send a test email by itself. The free Resend account currently has a shared platform allowance of 3,000 emails/month and 100/day; the provider can change these limits. Check current limits before launch.

Sources: [Domain verification](https://resend.com/docs/dashboard/domains/introduction), [API keys](https://resend.com/docs/dashboard/api-keys/introduction), [Inline images](https://resend.com/docs/dashboard/emails/embed-inline-images), [Idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Pricing](https://resend.com/pricing).
