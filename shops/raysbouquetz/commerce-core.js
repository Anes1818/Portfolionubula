/* Pure shop pricing and design validation. Shared by browser and payment server. */
(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./pricing.js")
      : root.RayPricing,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RayCommerce = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function (RayPricing) {
    "use strict";
    const flowerRows = [
      ["rose_red", "Red satin rose", "rose"],
      ["rose_pink", "Pink satin rose", "rose"],
      ["rose_ivory", "Ivory satin rose", "rose"],
      ["rose_violet", "Purple satin rose", "rose"],
      ["rose_lilac", "Lilac satin rose", "rose"],
      ["rose_blue", "Blue satin rose", "rose"],
      ["rose_peach", "Peach satin rose", "rose"],
      ["rose_black", "Black satin rose", "rose"],
      ["rose_red_glitter", "Glitter red satin rose", "rose"],
      ["foam_rose_black", "Black foam rose", "foam"],
      ["satin_dahlia_pink", "Pink ribbon dahlia", "dahlia"],
      ["satin_dahlia_blue", "Blue ribbon dahlia", "dahlia"],
      ["satin_dahlia_ivory", "Ivory ribbon dahlia", "dahlia"],
      ["satin_plumeria_purple", "Purple ribbon plumeria", "plumeria"],
      ["satin_plumeria_lilac", "Lilac ribbon plumeria", "plumeria"],
      ["satin_plumeria_ivory", "Ivory ribbon plumeria", "plumeria"],
      ["sunflower", "Satin sunflower", "sunflower"],
      ["__choc", "Gold chocolate", "chocolate"],
    ];
    const extras = [
      "butterfly",
      "crown",
      "bow_lilac",
      "bow_black",
      "graduation_cap",
      "snoopy",
      "kitty",
      "snoopy_topper",
      "sash",
      "message_bow_bundle",
    ];
    const denominations = {
      CAD: [5, 10, 20, 50, 100],
      USD: [1, 2, 5, 10, 20, 50, 100],
    };
    const cents = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
    const bounded = (n, a, b) =>
      typeof n === "number" && Number.isFinite(n) && n >= a && n <= b;
    const text = (v, max) =>
      typeof v === "string" &&
      v.length <= max &&
      !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
    const clone = (v) => JSON.parse(JSON.stringify(v));
    function catalog(P) {
      const CAT = {},
        notes = new Map();
      for (const [id, en, family] of flowerRows)
        CAT[id] = {
          en,
          family,
          kind: id === "__choc" ? "chocolate" : "flower",
          priceCents:
            id === "__choc"
              ? P.chocolateCents
              : (family === "rose"
                  ? P.ribbonRoseCents
                  : family === "foam"
                    ? P.foamRoseCents
                    : 0) + (id === "rose_red_glitter" ? P.glitterCents : 0),
        };
      for (const [currency, values] of Object.entries(
        P.denominations || denominations,
      ))
        for (const denomination of values) {
          const id = "cash_" + currency.toLowerCase() + "_" + denomination;
          notes.set(id, { currency, denomination });
          CAT[id] = {
            en: currency + " $" + denomination + " folded note",
            family: "money",
            kind: "flower",
            priceCents: RayPricing.convertCash(
              { currency, denomination, count: 1 },
              P,
            ).cadCents,
          };
        }
      return { CAT, notes };
    }
    function countItems(s) {
      const result = {};
      for (const i of s.items) result[i.id] = (result[i.id] || 0) + 1;
      return result;
    }
    function note(id) {
      const m = /^cash_(cad|usd)_(\d+)$/.exec(id);
      if (!m) return null;
      const currency = m[1].toUpperCase(),
        denomination = Number(m[2]);
      return denominations[currency].includes(denomination)
        ? { currency, denomination }
        : null;
    }
    function validateDesign(raw) {
      const fail = () => {
        throw Error(
          "The bouquet design is invalid or contains an unsupported item.",
        );
      };
      if (
        !raw ||
        raw.version !== 6 ||
        !["dome", "heart"].includes(raw.mode) ||
        !Number.isInteger(raw.seed) ||
        raw.seed < 1 ||
        raw.seed > 99999999 ||
        !Array.isArray(raw.items) ||
        !raw.items.length ||
        raw.items.length > 100 ||
        !raw.template ||
        !Number.isInteger(raw.template.capacity) ||
        raw.template.capacity < 1 ||
        raw.template.capacity > 100 ||
        !text(raw.title, 70) ||
        !text(raw.note, 180)
      )
        fail();
      const f = raw.finishes,
        ids = new Set(flowerRows.map((r) => r[0])),
        slots = new Set(),
        uids = new Set();
      if (
        !f ||
        !(
          raw.mode === "heart"
            ? ["black", "custom"]
            : ["black", "custom", "ivory", "blush"]
        ).includes(f.paper) ||
        !/^#[0-9a-f]{6}$/i.test(f.tint) ||
        f.ribbon !== "none" ||
        !["none", "blank_blackband"].includes(f.sash) ||
        !text(f.sashText || "", 28) ||
        !Array.isArray(f.decorations) ||
        f.decorations.length > 6 ||
        !Number.isInteger(f.butterfly) ||
        f.butterfly < 0 ||
        f.butterfly > 3 ||
        typeof f.crown !== "boolean"
      )
        fail();
      if (
        (f.sashPlacement !== undefined &&
          !["auto", "low", "diagonal"].includes(f.sashPlacement)) ||
        (f.sashOffset !== undefined && !bounded(f.sashOffset, -60, 60)) ||
        (f.sashScale !== undefined && !bounded(f.sashScale, 0.65, 1.25)) ||
        (f.collar !== undefined && typeof f.collar !== "boolean")
      )
        fail();
      if (
        [
          "fillerCount",
          "greeneryCount",
          "initial",
          "greenRim",
          "pumpkin",
          "bow",
          "spookyMask",
          "spookyBow",
          "ghostCount",
          "thistleCount",
          "chocolateBox",
          "roseArtwork",
        ].some((k) => !!f[k]) ||
        raw.photographic ||
        raw.template.layout
      )
        fail();
      const details = new Set();
      for (const d of f.decorations) {
        if (
          !d ||
          !extras.includes(d.id) ||
          ![
            "bow_lilac",
            "bow_black",
            "graduation_cap",
            "snoopy",
            "kitty",
            "snoopy_topper",
          ].includes(d.id) ||
          details.has(d.id) ||
          !bounded(d.x, -1, 1) ||
          !bounded(d.y, -1.15, 1) ||
          !bounded(d.scale, 0.7, 1.5) ||
          !bounded(d.rotation, -45, 45) ||
          !["front", "tucked"].includes(d.layer)
        )
          fail();
        details.add(d.id);
      }
      if (details.has("bow_lilac") && details.has("bow_black")) fail();
      if (
        f.studio &&
        (!Object.keys(f.studio).every((k) =>
          ["v", "cashSupply", "paymentPlan"].includes(k),
        ) ||
          f.studio.v !== 1 ||
          (f.studio.cashSupply !== undefined &&
            !["shop", "customer"].includes(f.studio.cashSupply)) ||
          (f.studio.paymentPlan !== undefined &&
            !["deposit", "full"].includes(f.studio.paymentPlan)))
      )
        fail();
      const known = (id) => ids.has(id) || !!note(id);
      for (const i of raw.items) {
        const anchor = i?.anchors?.[raw.mode];
        if (
          !i ||
          !known(i.id) ||
          !Number.isInteger(i.slot) ||
          i.slot < 0 ||
          i.slot >= raw.template.capacity ||
          slots.has(i.slot) ||
          i.uid !== "b" + (i.slot + 1) ||
          uids.has(i.uid) ||
          !anchor ||
          !bounded(anchor.x, 0, 720) ||
          !bounded(anchor.y, 0, 820) ||
          typeof anchor.manual !== "boolean"
        )
          fail();
        slots.add(i.slot);
        uids.add(i.uid);
      }
      const frame = raw.frames?.[raw.mode];
      if (
        !frame ||
        frame.mode !== raw.mode ||
        !frame.center ||
        !bounded(frame.center.x, 0, 720) ||
        !bounded(frame.center.y, 0, 820) ||
        !bounded(frame.radius, 1, 600) ||
        !bounded(frame.unit, 1, 300) ||
        (raw.mode === "heart" &&
          (!bounded(frame.top, 0, 820) ||
            !bounded(frame.tip, frame.top, 820) ||
            !bounded(frame.halfWidth, 1, 600)))
      )
        fail();
      const t = raw.template;
      if (
        !Array.isArray(t.palette) ||
        !t.palette.length ||
        t.palette.length > 3 ||
        new Set(t.palette).size !== t.palette.length ||
        t.palette.some((id) => !known(id)) ||
        !["patches", "half", "border", "rings"].includes(t.formation) ||
        !t.zones ||
        ["wall", "fill", "center"].some((k) => !known(t.zones[k])) ||
        !["zones", "rings", "checker"].includes(t.zones.formation) ||
        typeof t.zones.doubleWall !== "boolean" ||
        !t.accent ||
        !known(t.accent.id) ||
        !Number.isInteger(t.accent.count) ||
        t.accent.count < 0 ||
        t.accent.count > t.capacity ||
        !["cluster", "border", "half", "scatter", "ring"].includes(
          t.accent.pattern,
        ) ||
        !bounded(t.accent.angle, 0, 360) ||
        !t.overrides ||
        Array.isArray(t.overrides) ||
        Object.entries(t.overrides).some(
          ([k, id]) =>
            !/^\d{1,2}$/.test(k) ||
            String(+k) !== k ||
            Number(k) >= t.capacity ||
            (id !== null && !known(id)),
        )
      )
        fail();
      // Persist a bounded snapshot; authoritative quantities always come from items,
      // not browser pick lists, frame data, labels or supplied money totals.
      const s = clone(raw);
      if (JSON.stringify(s).length > 40000) fail();
      // A saved order must render exactly the charged explicit items, even if a
      // caller supplied a contradictory palette or automatic template recipe.
      const bySlot = new Map(s.items.map((i) => [i.slot, i.id]));
      s.template.overrides = Object.fromEntries(
        Array.from({ length: s.template.capacity }, (_, slot) => [
          slot,
          bySlot.get(slot) || null,
        ]),
      );
      s.template.accent.count = 0;
      s.nextId = s.template.capacity + 1;
      s.frames = { [s.mode]: s.frames[s.mode] };
      return s;
    }
    function validPolicyShape(p) {
      return !!(
        !!p &&
        typeof p === "object" &&
        !Array.isArray(p) &&
        typeof p.approved === "boolean" &&
        Array.isArray(p.enabledItems) &&
        Array.isArray(p.enabledExtras) &&
        p.enabledItems.length <= 18 &&
        p.enabledExtras.length <= 10 &&
        p.unitCents &&
        typeof p.unitCents === "object" &&
        !Array.isArray(p.unitCents) &&
        Object.values(p.unitCents).every((v) => v === null || cents(v)) &&
        p.extrasCents &&
        typeof p.extrasCents === "object" &&
        !Array.isArray(p.extrasCents) &&
        Object.values(p.extrasCents).every((v) => v === null || cents(v)) &&
        p.wrappingCents &&
        typeof p.wrappingCents === "object" &&
        ["dome", "heart"].every(
          (k) => p.wrappingCents[k] === null || cents(p.wrappingCents[k]),
        ) &&
        typeof p.moneyEnabled === "boolean" &&
        (p.usdToCad == null ||
          (typeof p.usdToCad === "object" &&
            !Array.isArray(p.usdToCad) &&
            Number.isSafeInteger(p.usdToCad.numerator) &&
            p.usdToCad.numerator > 0 &&
            p.usdToCad.numerator <= 1000000 &&
            Number.isSafeInteger(p.usdToCad.denominator) &&
            p.usdToCad.denominator > 0 &&
            p.usdToCad.denominator <= 1000000 &&
            text(p.usdToCad.source, 300) &&
            p.usdToCad.source.trim().length > 0 &&
            typeof p.usdToCad.asOf === "string" &&
            Number.isFinite(Date.parse(p.usdToCad.asOf)) &&
            typeof p.usdToCad.expiresAt === "string" &&
            Number.isFinite(Date.parse(p.usdToCad.expiresAt)))) &&
        p.tax &&
        typeof p.tax === "object" &&
        typeof p.tax.approved === "boolean" &&
        ["none", "added", "included"].includes(p.tax.mode) &&
        Number.isInteger(p.tax.bps) &&
        p.tax.bps >= 0 &&
        p.tax.bps <= 3000 &&
        p.fulfillment &&
        typeof p.fulfillment === "object" &&
        typeof p.fulfillment.approved === "boolean" &&
        Array.isArray(p.fulfillment.deliveryZones) &&
        p.fulfillment.deliveryZones.length <= 50 &&
        p.fulfillment.deliveryZones.every(
          (z) =>
            z &&
            typeof z === "object" &&
            typeof z.id === "string" &&
            typeof z.label === "string" &&
            Array.isArray(z.postalPrefixes) &&
            z.postalPrefixes.every((v) => typeof v === "string"),
        ) &&
        typeof p.fulfillment.pickupInstructions === "string" &&
        typeof p.cancellationPolicy === "string" &&
        p.foamTiers &&
        typeof p.foamTiers === "object" &&
        !Array.isArray(p.foamTiers) &&
        Object.keys(p.foamTiers).length <= 100
      );
    }
    function policyProblems(p) {
      if (!validPolicyShape(p)) return ["The price policy format is invalid."];
      const missing = [];
      if (
        !p ||
        p.currency !== "CAD" ||
        !Number.isSafeInteger(p.version) ||
        p.version < 1
      )
        return ["A versioned CAD price policy is required."];
      if (p.approved !== true)
        missing.push("Ray must approve the price rules.");
      if (
        !Array.isArray(p.enabledItems) ||
        !p.enabledItems.length ||
        new Set(p.enabledItems).size !== p.enabledItems.length ||
        p.enabledItems.some((id) => !flowerRows.some((r) => r[0] === id))
      )
        missing.push("Choose the offered catalogue.");
      for (const id of p.enabledItems || [])
        if (!cents(p.unitCents?.[id]))
          missing.push("Confirm " + id + " price.");
      if (
        !Array.isArray(p.enabledExtras) ||
        new Set(p.enabledExtras).size !== p.enabledExtras.length ||
        p.enabledExtras.some((id) => !extras.includes(id))
      )
        missing.push("Choose the offered extras.");
      for (const id of p.enabledExtras || [])
        if (!cents(p.extrasCents?.[id]))
          missing.push("Confirm " + id + " price.");
      for (const id of ["dome", "heart"])
        if (!cents(p.wrappingCents?.[id]))
          missing.push("Confirm " + id + " wrapping.");
      if (p.moneyStylingCents !== 8000)
        missing.push("Confirm the CAD $80 money styling policy.");
      if (p.depositBps !== 5000) missing.push("The deposit must be 50%.");
      if (
        !p.tax ||
        p.tax.approved !== true ||
        !["none", "included", "added"].includes(p.tax.mode) ||
        !Number.isInteger(p.tax.bps) ||
        p.tax.bps < 0 ||
        p.tax.bps > 3000 ||
        (p.tax.mode === "none" && p.tax.bps !== 0) ||
        (p.tax.mode !== "none" && typeof p.tax.cashValueTaxable !== "boolean")
      )
        missing.push(
          "Confirm tax handling, including the cash-value tax basis.",
        );
      if (
        !p.fulfillment ||
        p.fulfillment.approved !== true ||
        typeof p.fulfillment.pickupEnabled !== "boolean" ||
        !text(p.fulfillment.pickupInstructions || "", 800) ||
        !Number.isInteger(p.fulfillment.leadDays) ||
        p.fulfillment.leadDays < 0 ||
        p.fulfillment.leadDays > 365 ||
        !Array.isArray(p.fulfillment.deliveryZones) ||
        p.fulfillment.deliveryZones.some(
          (z) =>
            !text(z.id, 40) ||
            !z.id.trim() ||
            !text(z.label, 100) ||
            !z.label.trim() ||
            !cents(z.feeCents) ||
            !Array.isArray(z.postalPrefixes) ||
            !z.postalPrefixes.length ||
            z.postalPrefixes.some(
              (v) => typeof v !== "string" || !/^[A-Z]\d[A-Z]$/.test(v),
            ),
        ) ||
        new Set(p.fulfillment.deliveryZones?.map((z) => z.id)).size !==
          p.fulfillment.deliveryZones?.length ||
        (!p.fulfillment.pickupEnabled && !p.fulfillment.deliveryZones?.length)
      )
        missing.push("Confirm pickup, delivery postal areas and lead time.");
      if (
        !text(p.cancellationPolicy || "", 1200) ||
        !p.cancellationPolicy?.trim()
      )
        missing.push("Confirm the cancellation/refund policy.");
      if (p.pricingModel !== "per-item-with-foam-packages")
        missing.push("Approve the automatic mixed-bouquet pricing model.");
      if (
        !p.foamTiers ||
        Object.entries(p.foamTiers).some(
          ([n, v]) => !/^\d+$/.test(n) || +n < 1 || +n > 100 || !cents(v),
        )
      )
        missing.push("Confirm foam package prices.");
      return missing;
    }
    function calculate(
      raw,
      p,
      fulfillment = { method: "Pickup" },
      now = Date.now(),
    ) {
      const s = validateDesign(raw),
        missing = policyProblems(p);
      if (missing.length) throw Error(missing.join(" "));
      const c = countItems(s),
        supplied = s.finishes.studio?.cashSupply === "customer",
        lines = [],
        add = (id, label, quantity, unitCents) => {
          if (!cents(unitCents)) throw Error("Price missing: " + id);
          const totalCents = quantity * unitCents;
          if (!cents(totalCents)) throw Error("Price exceeds the limit.");
          lines.push({ id, label, quantity, unitCents, totalCents });
        };
      const flowers = s.items.filter((i) => !note(i.id)),
        cash = s.items.filter((i) => note(i.id)),
        foamOnly =
          flowers.length > 0 &&
          flowers.every((i) => i.id === "foam_rose_black") &&
          !cash.length,
        packagePrice = foamOnly ? p.foamTiers[flowers.length] : undefined;
      const enabled = new Set(p.enabledItems),
        enabledExtras = new Set(p.enabledExtras);
      for (const [id, quantity] of Object.entries(c)) {
        const n = note(id);
        if (n) {
          if (p.moneyEnabled !== true)
            throw Error("Money bouquets are not available for checkout.");
          if (supplied) {
            lines.push({
              id,
              label:
                n.currency + " $" + n.denomination + " notes supplied by you",
              quantity,
              unitCents: 0,
              totalCents: 0,
            });
            continue;
          }
          if (n.currency === "USD") {
            const rate = p.usdToCad;
            if (
              !rate ||
              !text(rate.source, 300) ||
              !Number.isFinite(Date.parse(rate.asOf)) ||
              Date.parse(rate.asOf) > now ||
              !Number.isFinite(Date.parse(rate.expiresAt)) ||
              Date.parse(rate.expiresAt) <= now
            )
              throw Error(
                "The USD exchange rate needs updating before checkout.",
              );
          }
          const value = RayPricing.convertCash(
            { ...n, count: quantity },
            { denominations, usdToCad: p.usdToCad },
          );
          if (value.cadCents === null)
            throw Error("USD conversion is unavailable.");
          lines.push({
            id,
            label: n.currency + " $" + n.denomination + " folded notes",
            quantity,
            unitCents: null,
            totalCents: value.cadCents,
          });
        } else {
          if (!enabled.has(id))
            throw Error("This item is not available for checkout: " + id);
          if (packagePrice === undefined)
            add(
              id,
              flowerRows.find((r) => r[0] === id)[1],
              quantity,
              p.unitCents[id],
            );
        }
      }
      if (packagePrice !== undefined)
        add(
          "foam_package",
          flowers.length + " foam roses, standard wrapping and simple bow",
          1,
          packagePrice,
        );
      if (cash.length)
        add(
          "money_styling",
          "Money styling, wrapping and assembly",
          1,
          p.moneyStylingCents,
        );
      else if (packagePrice === undefined)
        add("wrapping", "Wrapping and assembly", 1, p.wrappingCents[s.mode]);
      const addExtra = (id, qty) => {
        if (!qty) return;
        if (!enabledExtras.has(id))
          throw Error("This extra is not available for checkout: " + id);
        add(id, id.replaceAll("_", " "), qty, p.extrasCents[id]);
      };
      addExtra("butterfly", s.finishes.butterfly);
      addExtra("crown", s.finishes.crown ? 1 : 0);
      const bow = s.finishes.decorations.find((d) => d.id.startsWith("bow_")),
        message = s.finishes.sash !== "none";
      for (const d of s.finishes.decorations)
        if (!enabledExtras.has(d.id))
          throw Error("This extra is not available for checkout: " + d.id);
      if (message && bow) addExtra("message_bow_bundle", 1);
      else if (message) addExtra("sash", 1);
      for (const d of s.finishes.decorations)
        if (
          !(message && d === bow) &&
          !(packagePrice !== undefined && d === bow)
        )
          addExtra(d.id, 1);
      if (!["Pickup", "Delivery"].includes(fulfillment.method))
        throw Error("Choose pickup or delivery.");
      if (fulfillment.method === "Pickup" && !p.fulfillment.pickupEnabled)
        throw Error("Pickup is not available.");
      if (fulfillment.method === "Delivery") {
        const zone = p.fulfillment.deliveryZones.find(
          (z) => z.id === fulfillment.zoneId,
        );
        if (!zone) throw Error("Choose an offered delivery area.");
        const postal = String(fulfillment.postalCode || "")
          .toUpperCase()
          .replace(/\s/g, "");
        if (
          !/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal) ||
          !zone.postalPrefixes.includes(postal.slice(0, 3))
        )
          throw Error(
            "This postal code is outside the selected delivery area.",
          );
        add("delivery", "Delivery: " + zone.label, 1, zone.feeCents);
      }
      const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
      if (!cents(subtotalCents))
        throw Error("The order exceeds the supported amount.");
      const cashCents = lines
          .filter((l) => note(l.id))
          .reduce((sum, l) => sum + l.totalCents, 0),
        taxableCents =
          subtotalCents - (p.tax.cashValueTaxable === true ? 0 : cashCents);
      const taxCents =
        p.tax.mode === "added"
          ? Math.floor((taxableCents * p.tax.bps + 5000) / 10000)
          : p.tax.mode === "included"
            ? Math.round((taxableCents * p.tax.bps) / (10000 + p.tax.bps))
            : 0;
      const totalCents =
        subtotalCents + (p.tax.mode === "added" ? taxCents : 0);
      if (!cents(totalCents) || totalCents < 100)
        throw Error("The total must be at least CAD $1.00.");
      return {
        currency: "CAD",
        policyVersion: p.version,
        lines,
        subtotalCents,
        taxCents,
        taxMode: p.tax.mode,
        totalCents,
        includesCashValue: cash.length > 0 && !supplied,
        cashSupply: supplied ? "customer" : "shop",
        payment: RayPricing.paymentSchedule(
          totalCents,
          s.finishes.studio?.paymentPlan || "deposit",
          p,
        ),
        fx:
          cash.some((i) => note(i.id)?.currency === "USD") && !supplied
            ? clone(p.usdToCad)
            : null,
      };
    }
    function preview(s, P) {
      const { CAT, notes } = catalog(P),
        M = { counts: countItems },
        isNote = (id) => notes.has(id),
        active = (s) => s.items.some((i) => notes.has(i.id)),
        RAY_BUILDER = { payment: { depositBps: 5000 } };

      const supplied = s.finishes.studio?.cashSupply === "customer",
        cash = active(s),
        missing = [],
        counts = M.counts(s),
        flowerItems = s.items.filter(
          (i) => !isNote(i.id) && CAT[i.id].kind === "flower",
        ),
        families = [...new Set(flowerItems.map((i) => CAT[i.id].family))];
      const foamOnly = families.length === 1 && families[0] === "foam",
        singlePremium =
          families.length === 1 &&
          Object.hasOwn(P.menu.premiumAdjustments, families[0]);
      const menuApplies =
        !cash &&
        flowerItems.length > 0 &&
        (foamOnly || families.length >= 3 || singlePremium);
      const lines = Object.entries(counts).map(([id, quantity]) => {
        const n = notes.get(id),
          includedInBouquet = menuApplies && CAT[id].kind === "flower" && !n;
        const converted =
          n && !supplied
            ? RayPricing.convertCash({ ...n, count: quantity }, P)
            : null;
        const unknown =
          !includedInBouquet &&
          ((n && !supplied && converted.cadCents === null) ||
            (!n &&
              (CAT[id].priceCents === null ||
                (CAT[id].kind === "flower" &&
                  !["rose", "foam"].includes(CAT[id].family)))));
        if (unknown)
          missing.push(
            n ? converted.reason : CAT[id].en + " needs Ray’s quote",
          );
        const unitCents =
          includedInBouquet || unknown
            ? null
            : n && supplied
              ? 0
              : CAT[id].priceCents;
        const totalCents =
          includedInBouquet || unknown
            ? 0
            : n
              ? supplied
                ? 0
                : converted.cadCents
              : quantity * unitCents;
        return {
          id,
          quantity,
          unitCents,
          totalCents,
          quoteRequired: unknown,
          includedInBouquet: !!includedInBouquet,
          suppliedByCustomer: !!n && supplied,
        };
      });
      const extraLines = [],
        add = (id, quantity) => {
          if (!quantity) return;
          const unitCents = P.extrasCents[id],
            unknown = !Number.isSafeInteger(unitCents) || unitCents < 0;
          if (unknown) missing.push(id.replaceAll("_", " ") + " price varies");
          extraLines.push({
            id,
            quantity,
            unitCents: unknown ? null : unitCents,
            totalCents: unknown ? 0 : quantity * unitCents,
            quoteRequired: unknown,
          });
        };
      let range = null;
      if (menuApplies) {
        range =
          families.length > 1
            ? RayPricing.mixedRange(flowerItems.length, P)
            : RayPricing.foamTier(flowerItems.length, P);
        const premium = singlePremium
          ? P.menu.premiumAdjustments[families[0]]
          : 0;
        extraLines.push({
          id: families.length > 1 ? "mixed_menu" : "bouquet_menu",
          quantity: 1,
          unitCents: range.minCents + premium,
          totalCents: range.minCents + premium,
        });
        const glitter = counts.rose_red_glitter || 0;
        if (glitter)
          extraLines.push({
            id: "glitter",
            quantity: glitter,
            unitCents: P.glitterCents,
            totalCents: glitter * P.glitterCents,
          });
        if (families.length > 1 || !range.exact || premium)
          missing.push(
            "Ray’s confirms the final bouquet quote from the menu starting prices/ranges",
          );
      }
      if (!cash && families.length === 2)
        missing.push(
          "Two-flower-type arrangements need Ray’s quote; the mixed menu covers three or more types",
        );
      if (cash && flowerItems.length)
        missing.push("Ray’s confirms the final mixed money and flower quote");
      add("butterfly", s.finishes.butterfly | 0);
      add("crown", s.finishes.crown ? 1 : 0);
      const bow = s.finishes.decorations.find((d) => d.id.startsWith("bow_")),
        message = s.finishes.sash !== "none";
      if (message && bow) add("message_bow_bundle", 1);
      else if (message) add("sash", 1);
      for (const d of s.finishes.decorations || [])
        if (!(message && d === bow) && !(foamOnly && !cash && d === bow))
          add(d.id, 1);
      if (cash)
        extraLines.push({
          id: "money_styling",
          quantity: 1,
          unitCents: P.moneyStylingCents,
          totalCents: P.moneyStylingCents,
        });
      const flowersCents = lines.reduce((n, x) => n + x.totalCents, 0),
        extrasCents = extraLines.reduce((n, x) => n + x.totalCents, 0),
        totalCents = flowersCents + extrasCents;
      const maxCents =
          totalCents + (range ? range.maxCents - range.minCents : 0),
        quoteRequired = missing.length > 0;
      return {
        currency: "CAD",
        demo: true,
        estimateOnly: true,
        draft: true,
        quoteRequired,
        missing: [...new Set(missing)],
        lines,
        extraLines,
        flowersCents,
        baseCents: 0,
        laborCents: 0,
        extrasCents,
        totalCents,
        maxCents,
        range: !!range && range.maxCents !== range.minCents,
        cashSupply: supplied ? "customer" : "shop",
        cashCents: lines
          .filter((l) => isNote(l.id))
          .reduce((sum, l) => sum + l.totalCents, 0),
        rate: P.usdToCad,
        payment: RayPricing.paymentSchedule(
          totalCents,
          s.finishes.studio?.paymentPlan || "deposit",
          RAY_BUILDER.payment,
        ),
        flowers: flowerItems.length,
        texture: 0,
        chocolates: s.items.filter((i) => i.id === "__choc").length,
        pieces: s.items.length,
      };
    }
    return {
      flowerRows,
      extras,
      denominations,
      cents,
      catalog,
      counts: countItems,
      note,
      validateDesign,
      validPolicyShape,
      policyProblems,
      calculate,
      preview,
    };
  },
);
