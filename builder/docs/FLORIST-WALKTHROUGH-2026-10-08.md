# Florist buyer walkthrough — 8 October 2026

This is a simulated evaluation of the local product from a hesitant independent
flower-shop owner's perspective. It is not an interview, testimonial or evidence
of willingness to pay. Gender does not change the product requirements assessed.
Existing context: `.agents/product-marketing.md`, version 1.2. The current local
sales offer and its limits are unchanged.

## Scenario

A shop owner tries a customer's proposed bouquet, changes flowers and wrapping,
keeps the idea for later, then reviews the material list and request flow before
deciding whether the tool belongs in her WhatsApp sales process.

## Observations and changes

| Buyer question | Observed local friction | Implemented change |
|---|---|---|
| Can I trust the preview? | The small horror mask floated inside an oversized dark opening. | Mask is 4.75D tall at its original aspect ratio, overlapping inner petals. All 30 roses remain visibly represented. |
| What should I try to evaluate this? | The gallery offered looks without an obvious full-workflow trial. | A demo-only flower-shop walkthrough explains customize → save → review a WhatsApp request. |
| Can I keep more than my current three mode drafts? | Preserving several named ideas required exported files. | Saved bouquets holds up to 20 explicit, named copies in this browser. |
| Will changing a saved idea lose the original? | No independent named snapshot shelf existed. | Opening a copy leaves it unchanged; current edits are separate, and opening can be undone. |
| Is this accepting an order or payment? | “Order it” could overstate what the app does. | “Review request” and “Prepare WhatsApp request” describe the actual handoff. |
| Can this use my shop identity? | Branding capability was not explained in the demo entry flow. | Walkthrough names configurable shop identity, contacts, currency and catalogue prices. |

The behavior above is directly observed/verified. The effect on purchase
confidence is a hypothesis; no conversion lift or time saving is claimed.

## Saved-bouquet behavior

`saved-bouquets.js` validates each complete design through the existing model.
Snapshots use `nebulaSavedBouquetsV1` in localStorage. The maximum is 20; a full,
malformed or unavailable store is reported without replacing existing data.
Titles are plain text. Save uses the entered copy name without renaming the active
design. Open preloads artwork and asks before replacing the current bouquet;
Undo restores that bouquet. Removing a snapshot asks for confirmation and affects
neither the active design nor exported backups.

These are local design copies, not a customer/order database. They do not sync
between devices and can be lost when browser storage is cleared. The UI points
to editable JSON downloads for backup. Prices are recalculated from the current
catalogue rather than locking in a historical quote. The library and walkthrough
have English/Spanish text. No contact information or message is sent by these tests.

## Verification

- `tests/florist-walkthrough.cjs`: mask proportions; snapshot content, reopen,
  Undo and reload; immutable originals; removal; capacity and malformed data;
  safe title rendering; 320/390px layouts; translations; demo-only guide.
- `tests/halloween/verify.cjs` and `integration.cjs`: geometry, all paid flowers
  remain visible, counts, finishing prices, saved links, exports and offline use.
- `tests/launch-final.cjs`: resource recovery and consistent sharing.
- `tests/release-smoke.cjs`: freshly extracted delivery over HTTP and file URLs.

## What a real buyer still needs to decide

The library's flowers/layouts must suit her actual products. Her real prices,
branding and WhatsApp destination need configuration. A real-phone test should
confirm the customer can finish and the request is useful to the shop. This pass
does not validate demand, publish the site, provide payment processing, reserve
inventory or create a shared shop dashboard.
