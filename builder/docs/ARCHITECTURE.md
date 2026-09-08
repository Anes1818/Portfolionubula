# v6 architecture

## Layers
`shop-config.js` → validated catalogue/configuration → artwork metadata/embedding → v2 helpers → `template-engine.js` → geometry → model → renderer → UI.

`NebulaTemplates.layout(mode, capacity)` caches deterministic slot geometry. The supplied v2 skeleton seeds Dome; the actual v1 heart rings define counts and wall/fill/center membership. Equal-area relaxation fixes crowded sites. Geometry is independent of palette, price, deletion, seed reshuffling and viewport. Each site has a protected central radius and a maximum neighbor-safe photo radius, measured against real image alpha.

`template = {capacity, palette, formation, accent, zones, overrides}`. An explicit flower ID overrides the automatic recipe; `null` is a deliberate empty position. Occupied slots have stable slot UIDs. No ghost flowers are included in pricing. Manual repositioning swaps slots, not coordinates. A size change reapplies the automatic recipe, then maps explicit edits to closest unused normalized sites.

Dome recipes use actual exported v2 `patchAssign` and `placeAccent`, without automatic paid greenery/chocolate. Heart zones support wall/fill/center, alternating rings, checker and double wall.

Classic retains restrained row logic with new paper-support projection and physical-area limits. Head and stem share the same source center, scale and rotation. The front photo covers stems; a support mask clips loose stem pixels. This is a 2D photo composition, not a botanical/3D simulation.

## UI transactions
A pointer gesture records one before snapshot. A brush can visit each slot once; Undo restores the entire gesture. Pointer cancel rolls it back. Plain selection exposes ×. The delete button requires its own pointer-down (or keyboard activation), preventing the same touch that selected a flower from retargeting onto the newly displayed button.

Camera zoom/pan belongs only to the preview, never the design/history/price/export. Dense templates also have native position selectors. Three bouquet banks and their histories are independent. Imported formats are validated; a studio is version 6, and single designs are version 6. Supported legacy v4/v5 content is migrated; old storage keys remain untouched.

## Quotes
The model sums actual occupied catalogue units, configured preparation/labour and explicit extras. A stored/imported total is never authoritative. Review/export contains only the active design. Quote text + picture are client-side artefacts; optional WhatsApp/email destinations open drafts. There is no backend, checkout, auto-send or authoritative order number. Do not remove confirmation wording when adding a real shop.

## Regression priorities
Keep the real-touch tests (especially selection ×, stroke Undo and expand/collapse), automatic-zone resizing, source-aligned joins, live price delta and clean-extraction tests. Check actual per-flower alpha visibility, not merely flower counts or a filled circle. Do not restore the v5 replacement modal or add automatic paid filler to conceal holes.
