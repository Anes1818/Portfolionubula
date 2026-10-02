# Nebula: competitive position and AI site brief

30 September 2026. Research and draft only; no publication authorized by this file.

## What the competitors actually sell

| Product | Public positioning and observed offer | Implication for Nebula |
|---|---|---|
| [FloristApp](https://www.floristapp.shop/en) | Florist operating system. Its free Essential plan excludes the bouquet builder. Professional includes a step-by-step customer builder with POS, inventory, CRM and custom domain; its English page lists $42/month when billed annually and warns that these are early-access baseline prices. | Do not compete on operations or imply Nebula includes POS, checkout, stock control or a full storefront. |
| [Floraboard](https://floraboard.com/) | $55/month per shop for storefront, checkout, custom bouquet options, delivery zones/slots and florist/courier tools. | A florist seeking a complete operating system may prefer it. Nebula should sell a narrow first step inside existing WhatsApp workflows. |
| [Lacy Bird Bouquet Builder](https://bb.lacybird.com/) | Self-service design tool for florists. Free starter; Pro displayed at $9.99 monthly or $3.33/month billed yearly, with photo generation, collections, procurement and client sharing. | $29 is not the cheapest builder. Justify it through shop-specific setup and a customer-to-florist request flow, not by claiming a unique idea or cheapest price. |

These are descriptions of their public pages at audit time, not a test of their actual service quality. Nebula has no paid customer or measured ROI yet.

## Recommended founding offer — one offer, not a menu

**Founding Florist Pilot, proposed cap: first three shops.** One Nebula-hosted bouquet builder link for one shop, configured with the supplied name, logo, contact details, WhatsApp number, one currency and approved prices for the existing artwork library. Customers choose a Classic, Dome or Flat Heart bouquet, see an indicative estimate, and prepare a WhatsApp request. The florist confirms stock, feasibility and final price. A shop-specific preview and one review round happen before launch. No setup fee for this bounded scope; $29/month starts after the version is live; cancel anytime. The proposed existing service limits are one monthly batch of up to 10 price/text/contact edits and up to 20 minutes of asynchronous help, with no rollover. Custom domain, new photography/artwork, new species or layouts, full websites and integrations are separate written quotes.

The cap of three and the monthly service limits are **founder decisions to approve before publishing**. Do not claim a 30-day free trial, money-back guarantee, lifetime price lock, guaranteed sales, order conversion, saved time or unlimited customization. A generic demo is available before any shop shares its details. Offer a shop-specific preview only after its owner says the $29 scope could fit, to avoid unlimited unpaid setup work.

The commercial sentence to test with florists:

> Your customer shows you the bouquet they want before you make it. They choose the flowers, see an estimate from your prices, and send the details to your WhatsApp for your approval. I set up one link for your shop. $29/month after it goes live, with no setup fee for the basic version and no long commitment.

## Prompt for Astra / another coding AI

You are updating the existing Nebula Sites Studio repository at
`C:\Users\laptops zone\Desktop\Portfolionubula\Portfolionubula`. Work in the
current `builder-upgrade` checkout. The working tree contains substantial
uncommitted work from earlier sessions; inspect `git status`, relevant diffs and
project docs first. Preserve all existing changes. Do not reset, delete, merge,
push or publish. Deliver reviewable local changes only.

Objective: make the public-facing pricing and Nebula pages sell **the complete
bouquet builder** to independent florists, not a strawberry bouquet, a full
website, or an all-in-one florist operating system. The audience is an owner who
handles custom-bouquet enquiries through Instagram/WhatsApp. The value to explain
is: customer composes a visual idea, sees an indicative estimate based on
shop-approved prices, then prepares a WhatsApp request containing the design
details. The customer must press Send; the florist confirms availability and
final price. No confirmed order or payment happens inside the builder.

Read `.agents/product-marketing.md`, `builder/README.md`,
`builder/SHOP-SETUP.md`, `RELEASE-2026-09-29.md`, this brief, and the current
source before changing copy. The local `build-your-plan.html` already contains a
draft $29 plan and `flowers/index.html` already has local product-focused edits.
The public site is behind: `https://nebulastudio.site/build-your-plan.html`
still advertises the retired $650 setup + $49/month offer and 30 free days;
`https://nebulastudio.site/builder/` serves an older builder; `/flower` returns
404. A local `flower/index.html` alias was added, but is unpublished. Inspect
root `index.html` too: it is a second, older-looking site page and must not keep
contradicting the canonical `/flowers/` page. Determine the hosting route before
choosing whether to synchronize or redirect root.

Recommended offer for a local draft: one configured Nebula-hosted shop builder,
$29/month, no custom domain, no basic setup fee, first invoice after launch,
cancel anytime. Configuration is limited to existing layouts/artwork and supplied
shop name/logo/contact/WhatsApp/currency/prices. One setup review round. New
photos, artwork, species/layouts, domains, integrations and full websites are
separate written quotes. The current page also proposes one monthly batch of up
to 10 price/text/contact edits and up to 20 minutes of async help. Treat the
service caps and any 'first three founding shops' cap as **proposed** until the
founder approves them. Do not silently add a free trial, discounts, an SLA or
new recurring obligations.

Work to complete locally:

1. Make `build-your-plan.html` a clear single-offer page: headline, $29 price,
   concrete included setup and output, visual three-step customer flow, what's
   excluded, demo CTA and one enquiry CTA. Separate custom work as 'quoted
   separately' without inventing a domain price. Remove every retired price,
   30-day free-trial, unlimited-revision, automatic-order and ROI promise.
2. Make `flowers/index.html` an effective B2B page for the same offer while
   preserving its existing visual system and motion. Put the builder and shop
   benefit above the fold, show the actual current builder rather than an old
   screen if evidence is stale, distinguish the three florist websites as
   **demos**, and link clearly to the current builder and $29 plan. Do not imply
   those demos are paying client work. Keep returning-visitor copy consistent
   with the offer.
3. Audit root `index.html`, navigation, footer, SEO/OG tags, internal links and
   the `/flower` alias so all paths tell the same story. Keep one canonical
   florist landing page; do not create competing prices or duplicate promises.
4. Keep all claims accurate to the code: sample estimate, WhatsApp draft, PNG
   share, local/editable design saves, EN/ES, Classic/Dome/Flat Heart. Do not
   claim exact photographic realism, automatic checkout, inventory sync,
   guaranteed revenue, a shop dashboard or accessibility compliance.
5. Verify desktop and 390px phone layout, CTAs, route redirects, form behavior
   without submitting real lead data, current demo link, copy consistency and
   `git diff --check`. Run only relevant tests. Capture before/after screenshots
   and give a concise release checklist. Do not publish or send outreach.

Suggested hero copy, subject to visual fit:

> Customers build the bouquet they want. They choose flowers, see an estimate
> from your shop's prices, and send you the details on WhatsApp. You confirm
> what's available and the final price.

Primary CTA: `Try the live builder`. Secondary CTA: `See the $29 plan`.

The final report should list exact files changed, any unverified claims,
screenshots, test results, remaining phone/handoff test, and the exact items the
founder must approve before public deployment. Do not use competitor names or
unverified savings claims in the customer-facing pages.
