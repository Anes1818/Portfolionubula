# Shop owner setup

Edit **shop-config.js** with a text editor. It is a public website file: never put passwords, API keys or other secrets in it.

## Before accepting customer requests
1. Set `name` to the real shop name.
2. Select the currency. Rates are integer hundredths of that currency: `400` means 4.00, not 400.00. This implementation is intended for two-decimal currencies such as USD, EUR and DZD. Changing the currency label does **not** convert any price.
3. Review every entry in `flowerPrices`, plus preparation (`baseCents`), labour per style and optional extra prices. One catalogue position may depict a stem, a head, a cluster or a sprig; set the unit consistently with your sales practice.
4. Set `demo: false` only after you approve the rates. They remain estimates requiring your final confirmation.
5. Optionally set `whatsapp` to the international number in digits only, without +, spaces or a leading 0. Set `email` to the actual shop address. Leave unused fields empty. No real contact details have been invented or prefilled.
6. Deploy the complete folder and test an example request yourself. No customer communication was sent during development tests.

## What the customer sends
- Only the active bouquet, not their other two drafts.
- Template capacity, occupied quantity and intentional empty positions.
- Actual catalogue quantities and unit prices; preparation / labour / paid extras.
- Paper, ribbon, sash and extras; gift note / name; requested date and fulfilment preference.
- A short design reference and an explicit estimate / no-order warning.
- A PNG preview, downloaded separately to attach in the chosen messaging app.

WhatsApp and email links only open a prefilled draft. The customer still reviews and sends it. Where contacts are not configured, text copy/download and image download remain usable. Native sharing depends on the device. A past requested date is blocked; the date does not promise availability.

## Your confirmation workflow
Review stock, real stems, flower sizes, assembly, paper choices, delivery area/date, tax/delivery and final price. Ask the customer to approve substitutions and the final quote. Only then confirm the order and arrange payment through your usual process. The site does not store or charge orders, reserve inventory, verify delivery addresses, authenticate staff or provide an order-management backend.

Saved/imported designs are always priced from your current configuration, never from a customer's supplied total. Browser saves are device-local; request/JSON downloads are explicit actions. For substantial price changes, communicate the revised quote rather than treating an earlier screenshot as a price guarantee.
