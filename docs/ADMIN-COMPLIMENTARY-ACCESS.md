# Complimentary access — 2 November 2026

Main release: `5ad8e030-ddf4-457f-af83-e2a2366ed02c` on `app.nebulastudio.site`.

The activation screenshot used the five-character reference `87979`. Paid activation requires an actual PayPal reference matching 8–80 uppercase letters, digits or hyphens, plus administrator confirmation of the USD29 payment. Validation now explains the exact restriction separately from the payment-confirmation checkbox.

For an owner's own store, trials or complimentary access, the operator console now provides **Activate without payment · trials / own shop**. Enter a reason (5–200 characters), then choose **Grant 30 days · no payment**. This creates `source=admin_complimentary`, preserves any remaining access days, restores a suspended subscription, and records the actor, reason and expiry. It does not create a payment record or claim PayPal payment. Activation remains separate from publication and global/per-shop checkout configuration.

This action requires server-verified administrator authorization and recent authentication, shares the existing revision/idempotency safeguards, and rejects payment fields. Sandbox rejects this main-environment grant and retains its separate seven-day test-access action. No existing account was activated by deployment or QA.

101 Node tests passed, including complimentary activation authorization, suspended-to-active state, reason validation, no-payment audit, retries and Sandbox isolation. Browser activation tests passed, including visible PayPal validation and the complimentary form remaining open after validation. Main anonymous read-only deployment smoke passed, and the deployed module contains the updated controls. The owner must choose the actual account and click grant in the admin console.
