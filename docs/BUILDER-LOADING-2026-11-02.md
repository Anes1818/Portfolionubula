# Builder loading and flower collections

The builder previously awaited every runtime script before requesting the next one. It now inserts ordered `async=false` scripts together, allowing concurrent downloads while preserving dependency execution order.

Satin delivery copies use WebP quality 88 at the original dimensions with exact alpha. The originals are retained. `build-platform.cjs` invokes `optimize-platform-art.py` (Python + Pillow) and maps browser artwork and catalogue covers to content-hashed delivery filenames. The 25 images total 7,495,842 bytes versus 52,392,051 bytes in PNG: 85.7% smaller. This is a transfer-size comparison, not a measured speed guarantee on a customer's network. Existing geometry, pricing and runtime engine sources remain unchanged.

Public artwork has one-day browser caching. Private shop responses and payment APIs retain their existing authentication and cache rules. The workspace loads its catalogue concurrently with the session and reuses it within the page session.

Mixed shops have a visible Flower collection selector inside the builder. Fresh and satin remain separate bouquet designs in the same shop. Switching starts a new blank design; a populated design requires confirmation so the change cannot silently erase work. Customer choices remain limited to enabled, priced flowers. Existing saved bouquet links retain their recipe type.

Validation: 106 server/policy tests passed; real local browser onboarding and full platform regressions passed, including satin → fresh → satin switching. Identity and payment providers were mocked; no real accounts, emails or charges were created. Production checkout remains disabled.
