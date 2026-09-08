# Nebula v6 — real customization, fixed templates

A self-contained bouquet design studio. Start in **Classic**; Dome and Flat heart are separate saved bouquets, not conversions of the same arrangement.

## Open it
1. Extract the complete ZIP into a new folder.
2. On a computer, open `index.html`. No npm install or build step is needed.
3. On a phone, open the deployed website URL. Upload the complete folder to a static host; an iOS Files preview is not a supported way to run the app.
4. Keep `shop-config.js`, every script, the stylesheet, and `assets/` together. Read **SHOP-SETUP.md** before customer use.

## Design
- **Dome:** fixed 15 / 30 / 44 / 62 / 84 positions. Auto blend uses the supplied v2 engine's palette patches and accents. Toggle up to three varieties; open Patterns & accents for placement patterns and quantities. Paint by hand supports any catalogue variety.
- **Flat heart:** fixed 8 / 21 / 41 / 67 / 100 positions derived from the actual v1 rings. Change wall, fill, center, alternating rings and checker patterns directly. Crowded positions are refined; this is not a domed heart.
- **Direct painting:** choose a flower and tap or brush across positions. There is no Replace button or replacement modal. One brush stroke is one Undo step. In Classic, a flower can also be added in a supported clear position.
- **Select / delete:** finish painting, then tap a flower. Its small × has a 44px touch target. On Dome / Heart, deletion leaves a visible, refillable empty position. It never reduces or silently repacks the template.
- **Resize deliberately:** a size change shows its new estimate before applying. Palette / zones are reapplied; explicit painted and empty positions are preserved where possible. Undo restores the original size.
- **Classic:** connected source-aligned flower / stem images, restrained rows, and a real photographed paper wrap. Capacity uses approximately 20 rose-sized units, so larger flowers reach the limit sooner. Stemless filler is tucked into the bouquet mouth; unsupported Classic assets are not offered as stemmed flowers.
- **Phone:** compact preview, full-screen detail view, zoom, pan and Fit. For dense templates, expand and zoom for precise edits. An individual-position list provides a keyboard/native-select alternative.
- **Finishes:** paper, ribbon, optional extras, and adjustable sash position / height / width. Intentional sash overlap is part of the customer's design.

## Estimate → florist confirmation
Each occupied position is a priced catalogue unit (stem, head, cluster or sprig), not a count of individual petals or florets. Empty positions cost nothing. Actual stem counts and feasibility are confirmed by the florist.

With the supplied **sample** rates, 15 roses cost $95 including preparation and labour. Change five to lilies: 10 roses + 5 lilies = $100. Only those five unit-price differences are added. Delete a lily: its $5 is removed, and its position remains empty.

**Ask florist** reviews only the active bouquet: composition, finishes, note, optional date / pickup or delivery, breakdown and estimate. Copy or download its request text and picture. Configured WhatsApp / email links open drafts for the customer to review and send. There is no automatic sending, checkout, payment, order confirmation, inventory reservation or backend.

**Save design** exports editable JSON for all three bouquets and PNG artwork. Browser saving is local to the device/site, not a cloud account. Back up important designs as JSON. Old v4/v5 designs are validated and migrated without reusing stored prices; previous browser keys are left untouched.

## Files
- `index.html`, `app.css`, `app.js`: UI and interactions.
- `shop-config.js`: the single shop-owner settings file.
- `template-engine.js`, `dome-engine-v2.js`: fixed geometry and original v2 recipe helpers.
- `model.js`, `geometry.js`, `renderer.js`: state, pricing, physical envelope and drawing.
- `asset-meta.js`, `assets-bundle.js`, `assets/`: aligned photographic assets and offline embedding.
- `tests/v6/`: executable tests, final screenshots and measured evidence.
- `TEST-REPORT.md`, `ARTWORK-STATUS.md`, `docs/ARCHITECTURE.md`: validation and implementation boundaries.

## Honest limits
This is a photographed 2D design preview, not a 3D floral simulator or a certified assembly recipe. Natural petal overlap remains; flower-face protection does not prohibit intentional decorative overlays. Digital paper tints are colour previews, not proof of a stocked material. Lettering is baked into the supplied images. Tested in Chromium with emulated phone layouts and touch input; physical iPhone / Safari / Android devices and actual florist assembly were not tested. All shop contact and prices must be approved by the owner before launch.
