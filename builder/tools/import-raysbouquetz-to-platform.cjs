#!/usr/bin/env node
"use strict";

/**
 * Deterministic importer from the legacy bespoke `clients/raysbouquetz` shop
 * into a self-service Nebula platform email-reservation seed bundle.
 *
 * Usage:
 *   node builder/tools/import-raysbouquetz-to-platform.cjs [--email raysbouquetz@gmail.com] [--out .private/onboarding/raysbouquetz/platform-reservation-seed.json]
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const args = { email: null, out: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--email" && argv[i + 1]) {
      args.email = argv[++i];
    } else if (argv[i] === "--out" && argv[i + 1]) {
      args.out = argv[++i];
    }
  }
  return args;
}

async function buildRaysReservationSeed(options = {}) {
  const validationMod = await import(
    pathToFileURL(path.join(ROOT, "cloudflare/platform/validation.mjs")).href
  );
  const policyMod = await import(
    pathToFileURL(path.join(ROOT, "platform/shared/policy.mjs")).href
  );
  const runtimeMod = await import(
    pathToFileURL(path.join(ROOT, "platform/shared/runtime.mjs")).href
  );
  const { createRuntime } = runtimeMod;
  const {
    createInput,
    normalizeEmail,
    readImage,
    validateDraft,
    storefrontHomeDefaults,
  } = validationMod;
  const { mapDesignIds, validateDesign } = policyMod;

  const storeJson = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "clients/raysbouquetz/store.json"),
      "utf8",
    ),
  );
  const profileJson = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "clients/raysbouquetz/profile.json"),
      "utf8",
    ),
  );
  const catalog = JSON.parse(
    fs.readFileSync(path.join(ROOT, "platform/public/catalog.json"), "utf8"),
  );

  const intakePath = path.join(
    ROOT,
    ".private/onboarding/raysbouquetz/intake.json",
  );
  let intake = null;
  if (fs.existsSync(intakePath)) {
    intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
  }

  const ownerEmail = normalizeEmail(
    options.email || intake?.identity?.email || "raysbouquetz@gmail.com",
    "Owner email",
  );

  // Load and validate all 5 WebP assets from clients/raysbouquetz/public/
  const assetSpecs = [
    {
      key: "logo",
      relPath: "clients/raysbouquetz/public/logo.webp",
      kind: "logo",
      mime: "image/webp",
    },
    {
      key: "anus-daydream",
      relPath: "clients/raysbouquetz/public/photos/anus-daydream.webp",
      kind: "cover",
      mime: "image/webp",
    },
    {
      key: "pretty-and-paid",
      relPath: "clients/raysbouquetz/public/photos/pretty-and-paid.webp",
      kind: "cover",
      mime: "image/webp",
    },
    {
      key: "ruby-royale",
      relPath: "clients/raysbouquetz/public/photos/ruby-royale.webp",
      kind: "cover",
      mime: "image/webp",
    },
    {
      key: "money-moves",
      relPath: "clients/raysbouquetz/public/photos/money-moves.webp",
      kind: "cover",
      mime: "image/webp",
    },
  ];

  const mediaByKey = new Map();
  const media = [];

  for (const spec of assetSpecs) {
    const absPath = path.join(ROOT, spec.relPath);
    const fileBytes = fs.readFileSync(absPath);
    const checked = await readImage(
      new Request("https://internal/media", {
        method: "POST",
        headers: { "Content-Type": spec.mime },
        body: fileBytes,
      }),
      spec.kind,
    );
    const digest = crypto
      .createHash("sha256")
      .update(Buffer.from(checked.bytes))
      .digest("hex");
    const id = `img_${digest}`;
    const item = {
      id,
      kind: spec.kind,
      mime: checked.mime,
      base64: Buffer.from(checked.bytes).toString("base64"),
    };
    mediaByKey.set(spec.key, item);
    media.push(item);
  }

  // Build the 4 signature bouquets from the satin runtime recipes and convert
  // item/extra IDs to canonical platform catalog IDs (`satin_*`).
  const runtime = createRuntime("satin");
  const signatureSpecs = [
    {
      id: "anus-daydream",
      title: "Anu’s Daydream",
      category: "Medium · 35 stems",
    },
    {
      id: "pretty-and-paid",
      title: "Pretty & Paid",
      category: "Money bouquet · 25 stems",
    },
    {
      id: "ruby-royale",
      title: "Ruby Royale",
      category: "Grand · 75 stems",
    },
    {
      id: "money-moves",
      title: "Money Moves",
      category: "Money bouquet · 40 stems",
    },
  ];

  const collection = signatureSpecs.map((spec) => {
    const rawState = runtime.Model.create(spec.id);
    const design = mapDesignIds(rawState, catalog, "satin", "catalog");
    return {
      id: spec.id,
      title: spec.title,
      recipeId: null,
      design,
      cover: mediaByKey.get(spec.id).id,
      available: true,
      category: spec.category,
    };
  });

  // Map satin flower & extra prices conservatively:
  // - Standard satin roses ($8.00 = 800 cents), red glitter rose ($9.00 = 900 cents),
  //   black foam rose ($6.00 = 600 cents) from Ray's intake/legacy config.
  // - Unconfirmed or variable items remain `null` (requires quote / owner price
  //   before as-listed checkout, never silently $0).
  const satinFlowers = catalog.flowers.filter((f) => f.preset === "satin");
  const satinExtras = catalog.extras.filter((e) => e.preset === "satin");

  const flowerPrices = {};
  for (const flower of satinFlowers) {
    if (flower.id === "satin_rose_red_glitter") {
      flowerPrices[flower.id] = 900;
    } else if (flower.id === "satin_foam_rose_black") {
      flowerPrices[flower.id] = 600;
    } else if (flower.id.startsWith("satin_rose_")) {
      flowerPrices[flower.id] = 800;
    } else {
      flowerPrices[flower.id] = null;
    }
  }

  const extrasCents = {};
  const knownExtraPrices = {
    satin_butterfly: storeJson.pricing?.extrasCents?.butterfly ?? 300,
    satin_crown: storeJson.pricing?.extrasCents?.crown ?? 1500,
    satin_bow_lilac: storeJson.pricing?.extrasCents?.bow ?? 300,
    satin_bow_black: storeJson.pricing?.extrasCents?.bow ?? 300,
    satin_sash: storeJson.pricing?.extrasCents?.sash ?? 0,
    satin_graduation_cap: storeJson.pricing?.extrasCents?.graduation_cap ?? null,
  };
  for (const extra of satinExtras) {
    extrasCents[extra.id] = Object.prototype.hasOwnProperty.call(
      knownExtraPrices,
      extra.id,
    )
      ? knownExtraPrices[extra.id]
      : null;
  }

  // Keep unavailable/unoffered items disabled initially so Ray can enable or
  // price them when ready (plus her upcoming Ankara pieces as fixed products).
  const disabledFlowers = ["satin_foam_rose_white", "satin___choc"].filter(
    (id) => Object.prototype.hasOwnProperty.call(flowerPrices, id),
  );
  const disabledExtras = [
    "satin_snoopy",
    "satin_kitty",
    "satin_snoopy_topper",
  ].filter((id) => Object.prototype.hasOwnProperty.call(extrasCents, id));

  const input = createInput({
    name: "raysbouquetz",
    slug: "raysbouquetz",
    preset: "satin",
    currency: storeJson.pricing?.currency || profileJson.currency || "CAD",
    country: "CA",
    timeZone: "America/Winnipeg",
  });

  const aboutCopy = [
    "“Let all that you do be done in love.” — 1 Corinthians 16:14",
    "",
    "01 · Rooted in faith, made in love",
    "raysbouquetz is a Christian-based small business in Winnipeg. Every order is prepared with care, gratitude, and love for the moments you’re celebrating.",
    "",
    "02 · Everything is handmade",
    "Each petal is cut, folded, and shaped by hand from rich satin ribbon — never mass-produced — then wrapped in layered paper with bows, crowns, butterflies, or custom sashes.",
    "",
    "03 · Eternal flowers, made to stay",
    "Unlike fresh stems that fade in days, our eternal satin bouquets are keepsakes meant to stay for a long time — long after graduation day, Valentine’s Day, or your anniversary.",
  ].join("\n");

  const contactDetails = [
    "Handmade satin bouquets and thoughtful money gifts in Winnipeg, Canada.",
    "50% deposit to confirm · Balance due at delivery or pickup.",
    "Instagram: @raysbouquetz · WhatsApp: +1 (204) 481-5706",
  ].join("\n");

  const draft = validateDraft(
    {
      schemaVersion: 2,
      name: "raysbouquetz",
      tagline:
        storeJson.tagline ||
        "Flowers to keep. Moments to remember.",
      city: storeJson.location || profileJson.studio?.place || "Winnipeg, Canada",
      phone: profileJson.recipient || "+12044815706",
      requestChannel: "whatsapp",
      instagram: "@raysbouquetz",
      logoMediaId: mediaByKey.get("logo").id,
      theme: {
        primary: (profileJson.theme?.primary || "#76394e").toLowerCase(),
        background: (profileJson.theme?.background || "#f7f5ef").toLowerCase(),
      },
      currency: "CAD",
      preset: "satin",
      country: "CA",
      timeZone: "America/Winnipeg",
      flowerPrices,
      disabledFlowers,
      extrasCents,
      disabledExtras,
      enabledModes: ["dome", "heart"],
      home: {
        ...storefrontHomeDefaults,
        announcementText:
          "Handmade in Winnipeg · Custom colours & ribbon messages · Eternal satin bouquets",
        announcementEnabled: true,
        heroEyebrow: "HANDMADE IN WINNIPEG",
        headline: "Flowers to keep. Moments to remember.",
        description:
          "For the big days, the little surprises, and the people who mean everything. Satin bouquets and thoughtful gifts, made personal.",
        heroMediaId: mediaByKey.get("ruby-royale").id,
        heroButtonLabel: "Find your bouquet",
        heroButtonTarget: "custom",
        builderButtonLabel: "Make it personal",
        heroNote: "1 Corinthians 16:14 — Let all that you do be done in love.",
        heroStamp: "a little extra love",
        heroLayout: "split",
        ribbonText:
          "Christian-based small business · Everything is handmade · Eternal flowers meant to stay · Custom colours & text",
        ribbonEnabled: true,
        customTitle: "Start with a favourite. Make it their kind of beautiful.",
        customDescription:
          "Four starting points — customizable for Valentine’s Day, graduation season, birthdays, or anniversaries — with your colours, your finishing touches, and your words.",
        productsTitle: "Ankara pieces & ready-made keepsakes.",
        productsDescription:
          "Handmade Ankara plumeria and bow hair clips, plus seasonal keepsakes.",
        builderTitle: "Customize colours, stems & ribbon text.",
        builderDescription:
          "Choose your satin rose colours, stem count, wrap style, crowns, butterflies, and custom ribbon sash text in the interactive builder.",
        aboutTitle: "Made with love, meant to stay.",
        about: aboutCopy,
        contactTitle: "Order & booking notes.",
        contactDetails,
        footerText:
          "raysbouquetz · Handmade in Winnipeg · 1 Corinthians 16:14",
        navCustom: "The collection",
        navProducts: "Ankara & clips",
        navAbout: "Our touch",
        navContact: "Say hello",
        motionEnabled: true,
      },
      collection,
      products: [],
    },
    catalog,
  );

  // Verify every collection design against the normalized shop policy
  for (const item of draft.collection) {
    const check = validateDesign(item.design, draft, catalog, {
      allowUnpriced: true,
    });
    if (!check.ok) {
      throw new Error(
        `Collection design ${item.id} failed policy check: ${JSON.stringify(check.issues)}`,
      );
    }
  }

  // Deterministic UUID v5-style operationId derived from email + slug so repeated
  // runs produce an idempotent reservation operationId unless overridden.
  const opHash = crypto
    .createHash("sha256")
    .update(`raysbouquetz-reservation:${ownerEmail}:${input.slug}`)
    .digest("hex");
  const operationId = [
    opHash.slice(0, 8),
    opHash.slice(8, 12),
    "4" + opHash.slice(13, 16),
    "8" + opHash.slice(17, 20),
    opHash.slice(20, 32),
  ].join("-");

  const unmappedFeatures = [
    {
      feature: "Bundle tier discounts on satin rose stems (12/$25, 25/$50, 50/$95, 75/$150, 100/$195)",
      legacyBehavior:
        "clients/raysbouquetz/commerce-core.js interpolates stem bundle pricing and applies a +$0.50/stem glitter surcharge.",
      platformStatus:
        "Platform uses per-stem unit pricing (flowerPrices) plus Owner-adjustable prices in Dashboard -> Prices. Ray is currently finalizing a pre-Valentine's price readjustment.",
    },
    {
      feature: "Money bouquet cash handling & USD->CAD conversion (pretty-and-paid, money-moves)",
      legacyBehavior:
        "Legacy storefront separated cash bill face value (CAD or USD converted at 1.38 + $7 exchange fee) from a tiered bill-folding fee ($20-$65) and allowed customer-supplied bills.",
      platformStatus:
        "Imported into the collection using the platform's generic per-note extras (satin_cash_20, satin_cash_100) with null unit price so they remain request-only / quote-first until Ray sets her per-note price or customer-supplied cash option.",
    },
    {
      feature: "Rush (<7 days: +$15) and Emergency (<2 days: +$25) notice surcharges",
      legacyBehavior:
        "Legacy checkout automatically added $15 or $25 based on the requested pickup/delivery date.",
      platformStatus:
        "Platform fulfillment rules enforce minimum preparation lead days and blocked dates; rush/emergency fees are documented in the storefront Order & booking notes and handled via custom order requests.",
    },
    {
      feature: "Tiered wrapping fee & extra colour surcharge",
      legacyBehavior:
        "Legacy storefront charged $8/$12/$16 wrapping by stem count and +$5 per colour beyond 3 colours.",
      platformStatus:
        "Platform pricing is per-stem and per-extra; wrapping can be baked into per-stem prices or adjusted before publishing.",
    },
  ];

  return {
    payload: {
      operationId,
      email: ownerEmail,
      input,
      draft,
      media,
    },
    unmappedFeatures,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const { payload, unmappedFeatures } = await buildRaysReservationSeed({
    email: args.email,
  });
  const outPath = args.out
    ? path.resolve(process.cwd(), args.out)
    : path.join(
        ROOT,
        ".private/onboarding/raysbouquetz/platform-reservation-seed.json",
      );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify({ ...payload, unmappedFeatures }, null, 2) + "\n",
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        outPath: path.relative(ROOT, outPath),
        email: payload.email,
        slug: payload.input.slug,
        name: payload.draft.name,
        preset: payload.draft.preset,
        collectionCount: payload.draft.collection.length,
        mediaCount: payload.media.length,
        operationId: payload.operationId,
        unmappedFeatureCount: unmappedFeatures.length,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildRaysReservationSeed };
