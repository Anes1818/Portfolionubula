# Square connection software — sandbox only

The multi-shop connection lifecycle is implemented in `cloudflare/platform/square-connection.mjs` and wired through `square-storage.mjs`, the existing ShopStore SQLite object and protected Worker routes. It does not create checkout links or charge customers. Production environment is rejected by the factory even if flags are changed. The deployed sandbox-connect flag is false and no provider secrets have been entered.

## Boundaries and lifecycle

- Firebase-verified UID owns the shop. A fresh sign-in (10 minutes) and an active server-owned paid entitlement are required to start a connection or change its selected location.
- Country/currency support is deliberately CA/CAD or US/USD. The expected market is based on the published shop currency, or draft currency before publication. A compatible active card-processing Square location must match the authorized merchant, country and currency. Other markets are not inferred as supported.
- OAuth state is random, hashed in SQLite, expires after 10 minutes and is bound to the initiating browser through an HttpOnly, Secure, SameSite=Lax host-only cookie. Callback state is consumed once, including denial or failed exchange. The callback origin and query fields are bounded and checked.
- Square access/refresh tokens are AES-GCM encrypted with environment/shop-specific associated data. Browser responses contain only redacted connection status and location choices. A cookie is returned only through Set-Cookie, never JSON. Code/state query parameters are removed by a 303 redirect; callback responses use no-referrer.
- The registry atomically binds one sandbox merchant to one shop and vice versa. It retains this binding after disconnect to prevent account reassignment without a deliberate operator migration. Raw credentials have no browser API route.
- A separate async mutex serializes connection operations within the shop while ordinary profile/preview operations remain independent. Data is held in the small square_state table. Provider calls have bounded response sizes, timeouts, a fixed API host and rejected redirects.
- Tokens refresh within six days, and near-expiry access refreshes before use. Errors requiring reauthorization become reconnect_required; failed revocation becomes disconnect_pending and retains encrypted tokens for retry. Expired subscriptions do not block viewing or revoking an existing connection. Status clearly distinguishes provider setup, paused connection, expired token, pending disconnect and revoked authorization.
- Square connection status never means a customer paid. The server credential accessor also requires an active entitlement; a future checkout caller must additionally verify its persisted order/quote and all checkout gates.

## Configuration, only after real sandbox setup

Non-secret flags in Wrangler:

```text
SQUARE_ENVIRONMENT=sandbox
SQUARE_SANDBOX_CONNECT_ENABLED=false
```

Required protected server values, never browser config, Git or chat:

```text
SQUARE_SANDBOX_APPLICATION_ID
SQUARE_SANDBOX_APPLICATION_SECRET
SQUARE_TOKEN_ENCRYPTION_KEY
```

The encryption value is a random 32-byte base64url key. Persist and protect it; changing it without migration makes existing ciphertext unreadable. The registered callback must exactly match the canonical origin plus `/api/square/callback`. Register a separate local/test callback if using a controlled HTTPS test harness. Cookies use Secure; a plain HTTP browser environment is not a substitute for HTTPS acceptance testing.

The provider and registry dependencies are injected in unit tests. API integration tests use actual local SQLite and locally simulated Square HTTP responses. They do not validate a real Square account. Do not flip the production/private-beta flags to manufacture a paid entitlement for testing; use isolated local/test fixtures.

## Required acceptance before any live customer checkout

1. Create the official Square developer application and sandbox merchant; configure protected sandbox credentials and the exact callback through a controlled test environment.
2. Test actual browser cookies/redirects, allow/deny, state replay, location selection, account mismatch, refresh, permission removal and disconnect against real Sandbox.
3. Implement the separate generic hosted-checkout ledger: approved full prices/tax/fulfillment, deposit/full/balance, attempt idempotency, customer receipt access, signed and reconciled payment/refund events, ordering/retries, unknown provider outcomes and checkout invalidation on design changes.
4. Verify code-exchange/storage failure recovery and key-rotation procedures. API failure must show a pending/error state; creating a connection or returning from Square must never mark a payment.
5. Add production configuration only after an explicit launch review and successful Sandbox acceptance. This version intentionally rejects production and has no generic live customer-checkout route.

The user's own subscription payout research is deferred. Square here concerns florist merchants' accounts; it does not collect Nebula's monthly fee.

## Primary references checked

- [Receive seller authorization and manage tokens](https://developer.squareup.com/docs/oauth-api/receive-and-manage-tokens): authorization response, secure token storage and seller management.
- [Refresh/revoke/limit scopes](https://developer.squareup.com/docs/oauth-api/refresh-revoke-limit-scope): status, refresh cadence and revocation.
- [OAuth best practices](https://developer.squareup.com/docs/oauth-api/best-practices): CSRF state, secure server handling and environments.

Run `node --test cloudflare/platform/test/square-connection.test.mjs cloudflare/platform/test/square-routes.test.mjs` after the platform build. These are local software tests, not real Sandbox acceptance.
