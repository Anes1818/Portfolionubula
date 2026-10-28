# Local validation — 28 October 2026

All checks below passed. No real Square credentials, customer accounts or charges
were used. No payment code was deployed and public checkout remains disabled.

| Check | Result |
|---|---|
| Node service/security/pricing tests | 27 passed, including 1–100 item counts in both modes, approved extras, FX expiry, tax/delivery, capability isolation, auth, repeat clicks, refunds, held-link retirement, cancellation races and stale revocations |
| Existing pricing and legacy link adapter tests | Passed; only simulated Square responses |
| Original builder browser regression | Passed; original engine bytes, recipes, painting, saved designs, PNG/JSON, mobile layouts and inactive default checkout |
| New payment browser regression | Passed; shared totals, canonical designs, postal fee rerender, busy plan lock, first-status retry, deposit/balance, merchant orders and stale settings conflict |
| Actual workerd/SQLite integration | Passed; concurrent checkout, durable ledger, runtime restart and shop isolation; Square outbound calls intercepted |
| Sandbox and production Worker dry-run builds | Passed; both configurations retain `PAYMENTS_ENABLED=false` |

This is local implementation validation, not a record of Square Sandbox or live
acceptance. Real OAuth consent/refresh/revoke, hosted checkout, signed webhook
delivery, refund behaviour and agreed production verification must still be
tested after account setup. Merchant prices, fulfillment/tax/refund policies and
applicable product eligibility must be approved before public activation.
