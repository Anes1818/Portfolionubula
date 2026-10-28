# Nebula workspace

This repository is the source of truth for Nebula. Edit the source folders below;
generated shop folders are deployment output.

| Location | Purpose |
|---|---|
| `flowers/` | Main florist landing page; root `index.html` redirects here |
| `builder/` | Shared bouquet editor, renderer, assets, tests and build tools |
| `builder/shop-factory/` | Reusable shop templates and configuration validation |
| `clients/` | Shop-specific source, artwork and approved/draft configurations |
| `shops/` | Generated storefronts; rebuild instead of editing directly |
| `cloudflare/` | Short-link and payment services |
| `firebase/` | Authentication/database rules and short-link Functions alternative |
| `demo/` | Existing public previews and concept websites |
| `dz/` | Existing Algerian website and logistics demo |
| `marketing/`, `content/` | Marketing source and reusable creative material |
| `.private/` | Ignored intake, local QA and research |

## Current payment status

Ray's existing builder and local Square service are implemented. Checkout remains
disabled; actual Square Sandbox acceptance, account connection and production
activation are still required. See
[payment documentation](cloudflare/rays-payments/README.md) and
[Arabic account setup](cloudflare/rays-payments/SETUP.ar.md).

The proposed self-service shop preview and Lemon Squeezy subscription activation
are the next product phase. They are not implemented or active yet.

## Useful commands

Run from the repository root:

```powershell
node builder/tools/build-raysbouquetz.cjs
node builder/tools/preview-raysbouquetz.cjs
node builder/tests/rays-pricing.cjs
node builder/tests/rays-square.cjs
node --test cloudflare/rays-payments/test/*.test.mjs
```

Browser tests use Playwright and Edge as described in the relevant test files.
La Flora review captures now go to `.private/qa/la-flor-eterna/`. Current input
fixtures belong in `builder/tests/fixtures/`, not in generated capture folders.

Dependencies removed during cleanup are restored only when needed with `npm ci`
inside `firebase/functions/` or `marketing/ad-motion-preview/`. Their source and
lockfiles remain in place.

Publish only the intended public output. `.private/`, credentials, local caches,
dependency folders and development evidence are not deployment assets.

See the [cleanup inventory and recovery instructions](docs/REPOSITORY-CLEANUP-2026-10-28.md).
The cleanup recovery archive is stored outside this repository in the local
`Desktop/Nebula-local-backups/` directory; it is not published to GitHub.
