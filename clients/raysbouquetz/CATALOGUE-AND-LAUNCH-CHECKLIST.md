# Ray’s Bouquetz — catalogue and launch checklist

Prepared 27 October 2026. Internal handover: separates working preview features, owner menu information, and remaining launch work. All product amounts below are CAD unless explicitly stated. Preview prices are not approved final quotes.

## Readiness

- The local homepage and existing-engine builder are ready for owner feedback. Recent pricing, browser, export and mock Square checks passed.
- The current localhost/127.0.0.1 address works only on the development computer. A public preview has not been verified or published as part of this handover.
- Real order submission and payments are disabled. Do not present this as a live shop accepting orders yet.
- The payment adapter is prepared and mock-tested; merchant connection, secure hosted backend, quote persistence/approval, verified payment notifications and real integration testing remain.

## Shop and builder

The homepage uses Ray’s identity, logo and four original photographs, with Nebula credit. Each bouquet has Order and Customise actions: Order opens design review; Customise opens that recipe in the builder. This does not yet send an order to Ray.

The builder offers Buchón/Dome and Heart, with no Classic mode. It retains the original arrangement tools, flower placement, undo/redo, separate mode designs, save/load and image export. Designs support up to 100 flower/note positions. Custom shirts have a reserved section/button; no shirt editor or shirt ordering is implemented.

## Four signature bouquets

| Bouquet | Confirmed composition | Original intake reference price |
|---|---|---:|
| Anu’s Daydream | 8 dahlias, 18 roses, 17 plumerias: 43 flowers | $260 |
| Pretty & Paid | 80 USD $1 notes, 6 plumerias, personalised message ribbon and bow | $305 |
| Ruby Royale | 18 glitter red ribbon roses, crown, personalised message ribbon and bow | $145 |
| Money Moves | 50 USD $1 notes, 7 black foam roses, personalised message ribbon | $182 |

Reference prices came from the intake. They must be reconciled with the revised menu, extras and exchange rate before becoming approved checkout prices. Recipe counts are confirmed; final custom totals are not.

## Available visual catalogue

| Category | Available in this preview |
|---|---|
| Satin roses | Red, pink, ivory, purple, lilac, blue, peach, black, glitter red |
| Foam roses | Black |
| Ribbon dahlias | Pink, blue, ivory |
| Ribbon plumerias | Purple, lilac, ivory |
| Satin sunflower | Yellow |
| Dome wrapping | Small-triangle styles in black, ivory, pink and lilac |
| Heart wrapping | Black and lilac |
| Finishing | Gold butterfly, gold crown, lilac bow, black bow, graduation cap, personalised black message ribbon |
| Optional gifts for Ray to approve | Snoopy plush, Hello Kitty plush, Snoopy topper, gold chocolate |

CAD and USD selections change the numerical cash calculation. The folded-note illustration is shared; it is not a separate authentic visual for every currency or denomination.

## Money and pricing rules

- CAD denominations: $5, $10, $20, $50, $100.
- USD denominations: $1, $2, $5, $10, $20, $50, $100.
- Customer chooses the note count and whether Ray supplies the cash or the customer brings it.
- Money styling is $80, including wrapping and assembly, charged once.
- Shop-supplied cash is additional; customer-supplied cash is excluded from the shop amount due.
- CAD notes use their face value without conversion. USD notes use the configured TD cash/client-buys-USD rate.
- Current preview snapshot: 1 USD = 1.4484 CAD, observed 26 October 2026. It is dated, not an automatic live feed. No extra exchange margin is applied.
- Example: 80 USD $1 notes convert to $115.87 CAD before styling, flowers, extras, applicable tax and delivery.
- Ribbon rose intake price: $8 per flower. Foam rose intake price for mixed arrangements: $6 per flower. Glitter: $1 per rose. Foam-only bouquets use the package menu below.
- Missing prices and mixed money/flower arrangements require a final quote. A displayed known subtotal is not a promise that unpriced extras are free.

## Owner menu: foam rose bouquets

Includes standard wrapping and a simple bow. Unlisted counts need a quote.

| Roses | CAD | Roses | CAD |
|---:|---:|---:|---:|
| 1 | $10 | 7 | $40 |
| 15 | $85 | 18 | $95 |
| 20 | $105 | 21 | $115 |
| 24 | $125 | 25 | $130 |
| 30 | $150 | 36 | $175 |
| 40 | $195 | 50 | $260 |
| 55 | $290 | 60 | $315 |
| 75 | $390 | 100 | $480 |

## Owner menu: premium and mixed bouquets

Single-flower-type bouquet adjustments are added once to the base bouquet, not once per stem: tulips +$10, dahlias +$15, sunflowers +$10, lilies +$15, plumerias +$10. Tulip and lily assets are not currently in this shop’s active visual catalogue.

The mixed menu applies to combinations of three or more flower types. Two-type mixes need a separate quote.

| Flower count | Owner’s range |
|---|---:|
| 7 | $70–$80 |
| 15–18 | $120–$150 |
| 20–25 | $145–$200 |
| 30–40 | $210–$300 |
| 50–60 | $360–$460 |
| 75–100 | $500–$750+ |

Final price depends on flower types and quantities. Counts between listed ranges require confirmation.

## Owner’s complete supplied add-on menu

Not every menu item has a selectable visual asset yet.

| Add-on | Owner menu price | Preview availability |
|---|---:|---|
| Pearls | $0.10 each | Not a separate selectable asset |
| Butterfly | $3 each | Available |
| Personalised message ribbon | $10 | Available |
| Personalised message ribbon + bow | $15 | Bundle pricing available |
| Large bow | $3 | Available in black/lilac |
| Pearl bow | $10 | Not yet available |
| Baby’s breath number/letter/symbol | $15+ | Not yet available |
| Baby’s breath filler | $5 / $15 | Sizes/quantities need clarification; not yet available |
| Lily | $5 each | Not in the active visual catalogue |
| Artificial eucalyptus | Varies by amount | Not yet available |
| Glitter | $1 per rose | Glitter red rose available |
| Lavender | $5 each | Not yet available |
| Graduation cap | $12 | Available |
| Crown / tiara | Varies by size | Gold crown available as quote item; no tiara asset |
| Plush | Varies by type | Optional Snoopy / Hello Kitty, quote required |
| Fairy lights | $10 | Not yet available |
| Candy / chocolate | Varies by type | Gold chocolate available as quote item |
| General Cricut topper | Not supplied | Flat fee and choices needed; optional Snoopy topper is quote-only |
| Delivery / drop-off | From $15 | Area and final delivery charge need confirmation |

## Other owner menu services — not built as editors

Money bouquets from $80 styling; burn bouquets $90+; candy bouquets, eternal rose arrangements and balloon bouquets priced individually.

Graduation: bouquet varies; corsage + boutonniere set $70; corsage $40+; boutonniere $30+; lei $55+; fan $25+; fan pack (10–15) $90+; stole $45+.

These are business catalogue references, not claims that every service can currently be customised or purchased on the site.

## Square: intended workflow and remaining work

Both routes use a new checkout link for the actual CAD amount due. A pre-created Square product catalogue is not required for an API Quick Pay link.

1. Review first: customer sends a design; Ray confirms the price; the backend creates a link for 50% deposit or full payment.
2. Direct checkout: for fully approved, deterministically priced designs only, the backend validates the design and calculates the amount before creating the link.
3. Square hosts card entry. Verified payment events update the order’s paid amount and balance; visiting a return page is not evidence of payment.
4. Remaining balance is due at delivery. Example: an approved $300 order permits $150 deposit or $300 full payment. After a paid $150 deposit, the balance is $150.

Owner policy is already confirmed: minimum 50% deposit, full payment optional, balance at delivery. Do not ask her to decide this again.

Required technical completion: secure seller connection and token storage; persistent quotes/orders; merchant approval; hosted endpoint; verified payment events; deposit/balance ledger; cancellation/replacement handling; integration tests and deployment. None of these are replaced by sharing a static link.

Square handles the hosted card-data environment. We still need correct prices, secure integration and compliance with its merchant terms. Its Canadian terms restrict cash disbursements and sales of foreign currency. Money bouquets that include banknotes need explicit eligibility clarification from Square before enabling payment for that product. Do not relabel cash as flowers to bypass a restriction.

Square’s Canadian Payment Links page lists standard online card processing at 2.8% + $0.30 per transaction, with other methods/international charges potentially different. This is separate from Nebula’s subscription. Confirm applicable pricing in her Square account.

Sources checked 27 October 2026:
- Checkout and dynamic links: https://developer.squareup.com/docs/checkout-api
- Seller authorisation: https://developer.squareup.com/docs/auth
- Payment Links and fees: https://squareup.com/ca/en/payment-links
- Hosted payment security: https://api.squareup.com/help/ca/en/article/3796-privacy-and-security
- Canada Payment Terms, section 3: https://squareup.com/ca/en/legal/general/payment

## What Ray still needs to provide or approve

1. Preview feedback: approve her four designs, flower colours, wrapping and optional plush/chocolate choices.
2. Final prices for the four signature recipes; clarify whether the original intake photo prices should remain fixed despite the revised calculation. Confirm the rules for custom mixed designs.
3. Variable add-on amounts/options: crown sizes, plush/candy choices and general Cricut topper fee. Confirm which optional items she actually sells.
4. Pickup arrangements, delivery area and charge, minimum lead time, and when customers must provide their own banknotes.
5. Tax handling: whether listed prices include applicable taxes and which taxes she charges. Do not assume zero tax or that current preview estimates include tax/delivery.
6. Cancellation/refund policy and how long an approved quote remains valid, including TD exchange-rate changes.
7. An active Canadian Square account and business location, then authorisation through Square’s secure connection flow when prepared. She completes identity/bank verification directly with Square. Do not ask for her password, card/bank details or secret API keys in chat.
8. Square’s answer on eligibility for money bouquets containing cash, especially USD banknotes.
9. Confirm where order notifications should arrive and test one notification before launch.
10. Confirm the currency and billing start date for the agreed $29/month, and the seasonal pause/resume arrangement. No custom domain is required.

## Preview delivery

Next delivery step is publishing an explicitly labelled, non-payment preview and checking its HTTPS link on another device. Only then send that verified link to Ray. Keep quote labels and payment controls disabled until prices and the payment connection are ready.

Suggested client introduction once the URL is verified:

“Your first preview is ready 🌸 You can try your four bouquets, customise the flowers and wrapping, and explore the money bouquet options. This is a preview for your feedback, so checkout is not live yet. Please let me know which colours, extras or layouts you’d like adjusted. After you approve the designs and final prices, we’ll finish your Square connection.”
