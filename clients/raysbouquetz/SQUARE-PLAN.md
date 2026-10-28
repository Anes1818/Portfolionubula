# Current status — automatic checkout implemented locally, connection pending

The approved implementation is automatic pricing followed by an order-specific Square Hosted Checkout for a 50% deposit or full payment. A paid deposit retains its agreed CAD total; a later checkout collects only the remaining balance. Subscription billing and platform commission are outside this release.

The local service now includes shared browser/server pricing, validated saved designs, SQLite-backed Durable Objects, encrypted shop-specific OAuth, Firebase merchant roles and invitations, verified payment/refund records, retry protection, a merchant account page and private customer receipts. Original bouquet engines remain unchanged. See [the backend README](../../cloudflare/rays-payments/README.md) for the current API, approval rules and acceptance checklist, and [the Arabic setup guide](../../cloudflare/rays-payments/SETUP.ar.md) for account setup.

The public endpoint is empty and both Worker environments are disabled. None of the new payment code is deployed. Local browser/service tests simulate Square; the storage test runs actual workerd/SQLite. No real Square Sandbox or live payment has been performed. The next release steps are account setup, complete price/policy approval, actual Sandbox acceptance and separately configured production connection.

The historical notes below are superseded by the automatic implementation above. They describe earlier options, not the current payment policy.

---

# Dynamic Square payments — required, not implemented yet

The user reaffirmed dynamic payment requests on 26 October 2026. Do not substitute a single static payment link or require Ray to create a new link by hand for every design.

Both agreed paths use order-specific amounts in CAD:

1. Review first: customer submits a design; Ray confirms the quote and chooses the amount due (per-order amount, configured fixed deposit, percentage, or full balance); the backend creates the matching Square checkout link.
2. Direct checkout: backend validates the recipe and recalculates its CAD price using approved shop settings, applies the approved payment policy, and creates the matching Square checkout link.

Dynamic link creation and deposit policy are separate decisions. Example: a 50% rule requests CAD $110 for an approved CAD $220 order, and CAD $150 for a CAD $300 order. Ray can instead choose the amount separately for each reviewed request.

Associate each request/link/payment with its design and quote version. Track paid deposits and the remaining balance; creating a quick-pay link alone does not implement a deposit ledger. A changed quote needs a deliberate replacement request so old links cannot accidentally collect the wrong amount. Use server-held Square credentials, idempotency and verified payment events; never trust browser totals or a return-page visit as proof of payment.

Existing preview payment flags remain off. Merchant/payment eligibility, approved fees/FX, Square connection and the complete payment lifecycle must be resolved before activation. The pending cash-value eligibility question remains as recorded in IMPLEMENTATION.md.

Reference checked 26 October 2026: https://developer.squareup.com/reference/square/checkout-api/create-payment-link
