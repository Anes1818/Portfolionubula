# Nebula v6 — validation report

This report covers the v6 implementation, not the old v5 test counts.

- Functional: 111 passed, 0 failed.
- Native: 44 passed, 0 failed.
- Edge: 23 passed, 0 failed.

**191 completed checks passed, 0 failed:** 111 functional, 44 native-input, 23 edge/merchant and 13 clean-extraction checks.

## What was checked
- Fixed capacities, real v2 palette/accent behavior, v1-derived zones, resizing, direct touches, small × deletion, empty-slot refill, one-stroke Undo, cancellation and independent saved bouquets.
- Exact sample arithmetic: 15 roses to 10 roses + 5 lilies changes the estimate only by the five unit-price differences. Empty slots are uncharged; explicit extras are separate.
- Real PNG/JSON/request downloads, semantic reload equality, keyboard deletion, owner configuration, invalid imports/contacts and no external communication.
- Phone layouts: 320×568, 360×800, 390×844, 844×390. Desktop was also reviewed.

## Artwork checks
- 96 RGBA WebPs decode and match the embedded bytes.
- All 27 stemmed Classic assets have source-aligned head/neck coordinates and an eight-pixel source overlap.
- Actual per-flower alpha visibility and protected central regions measured across all named Dome/Heart sizes and mixed-flower examples. Natural petal overlap remains.

## Accessibility
- accessibility-desktop-finishing: 0 violations, 0 incomplete checks.
- accessibility-heart: 0 violations, 0 incomplete checks.
- accessibility-phone: 0 violations, 0 incomplete checks.
- accessibility-quote: 0 violations, 0 incomplete checks.

## Limits
Chromium with emulated viewports and touch input, not physical iPhone/Safari/Android hardware. This is a 2D photographic preview; a florist must confirm actual stems, availability, material colours, feasibility, delivery/tax and final price. No order/payment is sent or confirmed by the app.

A temporary sandbox restoration failure occurred during packaging. The original tested v6 working tree and its recorded evidence were recovered. The final archive is separately checked after extraction.

## Final archive smoke test

The ZIP was extracted into a fresh folder. Both direct-file opening and HTTP serving from that extracted folder passed: v6 startup, 15 fixed slots with five real lily-paint touches, exact sample pricing, quote/no-order wording, real PNG download, full studio reload and stable quote reference. Neither path produced a runtime error or external request.

The final repack adds this report and the clean-test evidence only. Its runtime file hashes match the successfully tested extraction. `tests/v6/clean-smoke.json` records those hashes. ZIP integrity and embedded/file image equality are checked again by `tools/package.py`.
