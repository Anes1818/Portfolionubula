# Repository cleanup — 28 October 2026

Cleanup completed locally; its tracked removals are included in the repository sync. No Git history rewrite or blanket reset was performed. Recovery archives remain outside the project and are not published.

Removed 25,710 files from 92 explicit paths (602.2 MiB). A verified recovery archive retains 764 non-regenerable/historical files (247.9 MiB). Net disk space recovered: approximately 354.3 MiB.

## Removed directories

| Directory | Reason | Files |
|---|---|---:|
| `marketing/ad-motion-preview/node_modules` | Reinstallable dependencies; package.json and lockfiles retained | 18749 |
| `firebase/functions/node_modules` | Reinstallable dependencies; package.json and lockfiles retained | 6138 |
| `.wrangler` | Local Wrangler cache | 1 |
| `flowers/assets1` | Unused duplicate/legacy asset directory | 110 |
| `clients/la-flor-eterna/qa` | Historical generated review material; outputs now go to .private/qa | 216 |
| `builder/tests/v6` | Archived historical test revision/package output; current tests retained | 59 |
| `builder/tests/release-2026-09-29` | Archived historical test revision/package output; current tests retained | 42 |
| `builder/tests/visual-revision-2026-09-29` | Archived historical test revision/package output; current tests retained | 28 |
| `builder/tests/launch-final` | Archived historical test revision/package output; current tests retained | 5 |
| `demo/jullyflowershop/builder/tests` | Unused development copy bundled inside a published demo; canonical builder sources retained | 59 |
| `demo/jullyflowershop/builder/incoming` | Unused development copy bundled inside a published demo; canonical builder sources retained | 16 |
| `demo/jullyflowershop/builder/originals` | Unused development copy bundled inside a published demo; canonical builder sources retained | 74 |
| `demo/jullyflowershop/builder/artwork` | Unused development copy bundled inside a published demo; canonical builder sources retained | 16 |
| `demo/jullyflowershop/builder/tools` | Unused development copy bundled inside a published demo; canonical builder sources retained | 15 |
| `demo/jullyflowershop/preview` | Generated demo screenshots | 6 |
| `demo/petalpress/preview` | Generated demo screenshots | 6 |
| `marketing/screenshots-2026-09-30` | Generated historical marketing review screenshots | 12 |
| `shops/raysbouquetz/runtime` | Empty directory left by retired builder | 0 |
| `builder/tests/botanical-qa` | Generated-only browser output directory | 3 |
| `builder/tests/collection-preview` | Generated-only browser output directory | 8 |
| `builder/tests/connected-options` | Generated-only browser output directory | 6 |
| `builder/tests/demo-landing-qa` | Generated-only browser output directory | 9 |
| `builder/tests/florist-walkthrough` | Generated-only browser output directory | 6 |
| `builder/tests/mask-and-links` | Generated-only browser output directory | 4 |
| `builder/tests/midnight-revision` | Generated-only browser output directory | 2 |
| `builder/tests/phone-movement` | Generated-only browser output directory | 4 |
| `.private/qa/raysbouquetz/durable-56HtdZ` | Regenerable local test database or Worker bundle | 15 |
| `.private/qa/raysbouquetz/durable-fSl9Pm` | Regenerable local test database or Worker bundle | 0 |
| `.private/qa/raysbouquetz/durable-QsGIWO` | Regenerable local test database or Worker bundle | 15 |
| `.private/qa/raysbouquetz/durable-S3h2QP` | Regenerable local test database or Worker bundle | 0 |
| `.private/qa/raysbouquetz/durable-uElCYG` | Regenerable local test database or Worker bundle | 0 |
| `.private/qa/raysbouquetz/worker-bundle` | Regenerable local test database or Worker bundle | 3 |
| `.private/qa/raysbouquetz/worker-production-bundle` | Regenerable local test database or Worker bundle | 3 |
| `.private/qa/raysbouquetz/worker-state` | Regenerable local test database or Worker bundle | 22 |

## Removed individual files

- `clients/raysbouquetz/studio.html` — Retired lightweight Ray editor; build uses canonical builder/studio.html.
- `clients/raysbouquetz/studio.css` — Retired lightweight Ray editor; build uses canonical builder/studio.html.
- `clients/raysbouquetz/studio.js` — Retired lightweight Ray editor; build uses canonical builder/studio.html.
- `clients/raysbouquetz/raysbouquetz-generated-art-v1.zip` — Duplicate generated asset export; original artwork and metadata retained.
- `builder/demo-brand/desktop-preview.png` — Generated browser screenshots, not runtime assets.
- `builder/demo-brand/mobile-preview.png` — Generated browser screenshots, not runtime assets.
- `NEBULA-RESUME-2026-09-29.md` — Historical root handoff notes archived; current README will replace entry point.
- `RELEASE-2026-09-29.md` — Historical root handoff notes archived; current README will replace entry point.
- `ROBUSTE-ECOTRACK-HANDOFF.md` — Historical root handoff notes archived; current README will replace entry point.
- `builder/tests/fall/always-you.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/details-desktop.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/details-mobile-320.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/details-mobile-390.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/details-results.json` — Generated browser screenshot/result/export.
- `builder/tests/fall/edge-results.json` — Generated browser screenshot/result/export.
- `builder/tests/fall/editor-320.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/editor-390.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/editor-desktop.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/finishing-320.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/finishing-390.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/gallery-320.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/gallery-390.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/gallery-desktop.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/garden-mobile-320.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/garden-mobile-390.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/harvest-desktop.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/latte-export.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/love-gallery.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/love-mobile-320.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/love-mobile-390.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/october-export.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/order-sheet.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/pink-promise.png` — Generated browser screenshot/result/export.
- `builder/tests/fall/results.json` — Generated browser screenshot/result/export.
- `builder/tests/fall/romance-results.json` — Generated browser screenshot/result/export.
- `builder/tests/fall/written-in-roses.png` — Generated browser screenshot/result/export.
- `builder/tests/fall-editor-desktop.png` — Generated browser screenshot/result/export.
- `builder/tests/fall-gallery-desktop.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/custom-ivory.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/customization-results.json` — Generated browser screenshot/result/export.
- `builder/tests/halloween/customize-320.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/customize-390.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/customize-desktop.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/forever-my-boo-plan.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/forever-my-boo-preview.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/forever-my-boo.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/integration-results.json` — Generated browser screenshot/result/export.
- `builder/tests/halloween/midnight-blooms-plan.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/midnight-blooms-preview.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/midnight-blooms.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/mobile-320.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/mobile-390.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/results.json` — Generated browser screenshot/result/export.
- `builder/tests/halloween/scream-for-you-plan.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/scream-for-you-preview.png` — Generated browser screenshot/result/export.
- `builder/tests/halloween/scream-for-you.png` — Generated browser screenshot/result/export.
- `builder/tests/money-heart.png` — Generated browser screenshot/result/export.
- `builder/tests/money-phone.png` — Generated browser screenshot/result/export.

## Preserved work and maintenance

- Current builder engines, runtime assets, client source, generated shops, public demos, marketing source and the DZ app were retained.
- Modified and untracked work was included in the recovery archive wherever selected for removal. Nothing was discarded through `git clean`, `git reset` or checkout.
- Before documentation updates, all 2,956 protected files outside the removal plan retained their SHA-256 hashes.
- Twenty-three La Flora QA scripts now write to `.private/qa/la-flor-eterna/`; a shared helper recreates output directories automatically.
- The reference-comparison input link was retained separately in `builder/tests/fixtures/`.
- `.gitignore` now excludes generated screenshots/results and review directories, while allowing source fixtures.
- Root `README.md` provides the current workspace map instead of historical root handoffs.

## Recovery

Local recovery directory, outside the project: `Desktop/Nebula-local-backups/repo-cleanup-2026-10-28/2026-10-28T09-52-53-474Z/`.

The directory is local only and is not inside the Git repository. All seven recovery files were copied and checked by SHA-256 before the in-project backup directory was removed. `removed-files.zip` stores original relative paths; `plan.json` records every archived file and SHA-256. `result.json` records completed removals. Extract the ZIP into a separate temporary folder, then restore only the items needed. Do not extract over ongoing work blindly.

Reinstall dependency folders with `npm ci` in their original project directories. Wrangler caches, Worker test bundles and local test databases are reproducible and were not archived.

## Verification

- Recovery ZIP: all 764 archived files verified by SHA-256 before deletion.
- Ray storefront rebuilt successfully; all 82 public manifest files match their hashes and shared engine bytes remain unchanged.
- 27 payment/security/pricing tests and 6 Firebase core tests passed, plus the standalone Ray pricing and Square adapter suites.
- All 23 migrated QA scripts pass syntax checks; the output helper recreates their private directories.
- Scanned 96 public HTML/CSS files: no reference targets an item removed by this cleanup.
- Source guard after verification detected only the intentional client README documentation change.
