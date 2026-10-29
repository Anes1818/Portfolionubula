import { HttpError, requireValue } from "../rays-payments/security.mjs";
import {
  normalizePolicy,
  validateDesign,
} from "../../platform/shared/policy.mjs";

// Six independently bounded 24 KiB designs leave 48 KiB for shop content.
export const DRAFT_LIMIT = 192 * 1024;
export const REQUEST_LIMIT = DRAFT_LIMIT + 4096;
const encoder = new TextEncoder();
const idPattern = /^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,79}$/;
const draftFields = [
  "name",
  "tagline",
  "city",
  "phone",
  "instagram",
  "logoMediaId",
  "theme",
  "currency",
  "preset",
  "flowerPrices",
  "disabledFlowers",
  "extrasCents",
  "collection",
  "schemaVersion",
  "products",
  "disabledExtras",
  "enabledModes",
  "home",
];
const reservedSlugs = new Set([
  "api",
  "assets",
  "studio",
  "login",
  "logout",
  "dashboard",
  "admin",
  "www",
  "nebula",
  "support",
  "billing",
  "privacy",
  "terms",
]);

// Plain text and bounded presentation choices only. These defaults are added
// when reading older records; existing stored drafts are not rewritten.
export const storefrontHomeDefaults = Object.freeze({
  announcementText: "",
  announcementEnabled: true,
  heroEyebrow: "YOUR MOMENTS, IN FULL BLOOM",
  heroButtonLabel: "",
  heroButtonTarget: "auto",
  builderButtonLabel: "Build your own",
  heroNote: "Thoughtfully made. A little more you.",
  heroStamp: "a little flower magic",
  heroLayout: "split",
  ribbonText:
    "Flowers for the little things · And the really big feelings · Made with a personal touch",
  ribbonEnabled: true,
  customTitle: "Make it your kind of beautiful.",
  customDescription:
    "Start with a favourite. Make the finishing touches your own.",
  productsTitle: "Lovely, just as they are.",
  productsDescription: "Handcrafted favourites. Ready for your kind of moment.",
  builderTitle: "A little imagination. A beautiful bouquet.",
  builderDescription:
    "Choose your flowers, find your colours and bring your own idea to life in our bouquet builder.",
  aboutTitle: "Flowers with a personal touch.",
  contactTitle: "A little hello goes a long way.",
  contactDetails: "",
  footerText: "Your craft. Their imagination.",
  navCustom: "Bouquets",
  navProducts: "Our shop",
  navAbout: "Our story",
  navContact: "Say hello",
  motionEnabled: true,
});

const homeTextLimits = Object.freeze({
  announcementText: 160,
  heroEyebrow: 80,
  heroButtonLabel: 60,
  builderButtonLabel: 60,
  heroNote: 160,
  heroStamp: 60,
  ribbonText: 200,
  customTitle: 120,
  productsTitle: 120,
  builderTitle: 120,
  aboutTitle: 120,
  contactTitle: 120,
  footerText: 160,
  navCustom: 40,
  navProducts: 40,
  navAbout: 40,
  navContact: 40,
});
const homeMultilineLimits = Object.freeze({
  customDescription: 300,
  productsDescription: 300,
  builderDescription: 400,
  contactDetails: 1200,
});
const homeBooleanFields = [
  "announcementEnabled",
  "ribbonEnabled",
  "motionEnabled",
];
const homeChoices = Object.freeze({
  heroButtonTarget: [
    "auto",
    "custom",
    "products",
    "builder",
    "about",
    "contact",
  ],
  heroLayout: ["split", "image-first", "centered"],
});

export function object(value, label, allowed) {
  requireValue(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object.`,
  );
  requireValue(
    Object.keys(value).length <= 200,
    `${label} has too many fields.`,
  );
  if (allowed)
    requireValue(
      Object.keys(value).every((key) => allowed.includes(key)),
      `${label} contains unsupported fields.`,
    );
  requireValue(
    !Object.keys(value).some((key) =>
      ["__proto__", "prototype", "constructor"].includes(key),
    ),
    `${label} contains unsupported fields.`,
  );
  return value;
}

export function text(value, label, max, required = false) {
  requireValue(typeof value === "string", `${label} must be text.`);
  const clean = value.trim();
  requireValue(
    clean.length <= max && (!required || clean.length > 0),
    `${label} must be ${required ? "1–" : "at most "}${max} characters.`,
  );
  requireValue(
    !/[\u0000-\u001f\u007f]/.test(clean),
    `${label} contains unsupported characters.`,
  );
  return clean;
}

export function multilineText(value, label, max) {
  requireValue(typeof value === "string", `${label} must be text.`);
  const clean = value.replace(/\r\n?/g, "\n").trim();
  requireValue(
    clean.length <= max,
    `${label} must be at most ${max} characters.`,
  );
  requireValue(
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(clean),
    `${label} contains unsupported characters.`,
  );
  return clean;
}

export const REQUEST_STATUSES = Object.freeze([
  "requested",
  "accepted",
  "fulfilled",
  "cancelled",
]);
const requestIdPattern = /^rq_[a-f0-9]{32}$/;

export function requestUpdate(value) {
  object(value, "Request update", ["version", "status", "merchantNote"]);
  requireValue(
    Number.isSafeInteger(value.version) && value.version > 0,
    "A valid request version is required.",
  );
  requireValue(
    value.status !== undefined || value.merchantNote !== undefined,
    "Choose a status or update the private note.",
  );
  if (value.status !== undefined)
    requireValue(
      REQUEST_STATUSES.includes(value.status),
      "Choose a valid request status.",
    );
  return {
    version: value.version,
    ...(value.status === undefined ? {} : { status: value.status }),
    ...(value.merchantNote === undefined
      ? {}
      : {
          merchantNote: multilineText(
            value.merchantNote,
            "Private merchant note",
            1000,
          ),
        }),
  };
}

export function requestPage(searchParams) {
  requireValue(
    [...searchParams.keys()].every((key) =>
      ["status", "cursor", "limit"].includes(key),
    ) && [...searchParams.keys()].length === new Set(searchParams.keys()).size,
    "Invalid request filters.",
  );
  const status = searchParams.get("status") || "all";
  requireValue(
    status === "all" || REQUEST_STATUSES.includes(status),
    "Invalid request status filter.",
  );
  const rawLimit = searchParams.get("limit") ?? "25";
  requireValue(
    /^\d{1,2}$/.test(rawLimit) &&
      Number(rawLimit) >= 1 &&
      Number(rawLimit) <= 50,
    "Choose a page size from 1 to 50.",
  );
  const rawCursor = searchParams.get("cursor") || "";
  let cursor = null;
  if (rawCursor) {
    try {
      requireValue(
        rawCursor.length <= 200 && /^[A-Za-z0-9_-]+$/.test(rawCursor),
        "Invalid request cursor.",
      );
      cursor = JSON.parse(
        atob(rawCursor.replaceAll("-", "+").replaceAll("_", "/")),
      );
      object(cursor, "Request cursor", ["at", "id", "status"]);
      requireValue(
        Number.isSafeInteger(cursor.at) &&
          cursor.at >= 0 &&
          requestIdPattern.test(cursor.id) &&
          cursor.status === status,
        "Invalid request cursor.",
      );
    } catch {
      throw new HttpError(400, "Invalid request cursor.");
    }
  }
  return { status, cursor, limit: Number(rawLimit) };
}

export function requestCursor(record, status) {
  return btoa(JSON.stringify({ at: record.createdAt, id: record.id, status }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function hydrateRequest(record) {
  const { accessHash, ...safe } = record;
  return {
    ...safe,
    version: record.version ?? 1,
    merchantNote: record.merchantNote ?? "",
    updatedAt: record.updatedAt ?? record.createdAt,
    paymentStatus: record.paymentStatus ?? "unpaid",
  };
}

export function safeId(value, label = "Item ID") {
  requireValue(
    typeof value === "string" && idPattern.test(value),
    `${label} is invalid.`,
  );
  return value;
}

export function createInput(input) {
  object(input, "Shop", ["name", "slug", "currency", "preset"]);
  const name = text(input.name, "Shop name", 80, true);
  requireValue(
    typeof input.slug === "string" &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) &&
      input.slug.length >= 3 &&
      input.slug.length <= 48 &&
      !reservedSlugs.has(input.slug),
    "Choose a unique shop address using 3–48 lowercase letters, numbers, and hyphens.",
  );
  requireValue(
    ["USD", "CAD"].includes(input.currency),
    "Currency must be USD or CAD.",
  );
  requireValue(
    ["fresh", "satin"].includes(input.preset),
    "Choose the fresh or satin preset.",
  );
  return {
    name,
    slug: input.slug,
    currency: input.currency,
    preset: input.preset,
  };
}

export function initialDraft(input) {
  return {
    schemaVersion: 2,
    name: input.name,
    tagline: "",
    city: "",
    phone: "",
    instagram: "",
    logoMediaId: null,
    theme: { primary: "#7c6649", background: "#f7f4ee" },
    currency: input.currency,
    preset: input.preset,
    flowerPrices: {},
    disabledFlowers: [],
    extrasCents: {},
    collection: [],
    products: [],
    disabledExtras: [],
    enabledModes:
      input.preset === "satin"
        ? ["dome", "heart"]
        : ["classic", "dome", "heart"],
    home: {
      headline: input.name,
      description: "",
      heroMediaId: null,
      about: "",
      sections: ["custom", "products", "builder", "about", "contact"],
      ...storefrontHomeDefaults,
    },
  };
}

/** Reading a legacy record adds defaults without rewriting the saved SQLite data. */
export function hydrateDraft(draft) {
  const defaults = initialDraft(draft);
  return {
    ...defaults,
    ...draft,
    schemaVersion: 2,
    collection: (draft.collection || []).map((item) => ({
      ...item,
      available: item.available ?? true,
      category: item.category ?? "",
    })),
    products: (draft.products || []).map((item) => ({
      ...item,
      available: item.available ?? true,
      category: item.category ?? "",
    })),
    home: { ...defaults.home, ...(draft.home || {}) },
  };
}

export function hydrateShop(shop) {
  return {
    ...shop,
    draft: hydrateDraft(shop.draft),
    ...(shop.published
      ? {
          published: {
            ...shop.published,
            draft: hydrateDraft(shop.published.draft),
          },
        }
      : {}),
    ...(shop.previousPublished
      ? {
          previousPublished: {
            ...shop.previousPublished,
            draft: hydrateDraft(shop.previousPublished.draft),
          },
        }
      : {}),
  };
}

export const mediaReferences = (draft) => [
  ...new Set(
    [
      draft?.logoMediaId,
      draft?.home?.heroMediaId,
      ...(draft?.collection || []).map((item) => item.cover),
      ...(draft?.products || []).map((item) => item.cover),
    ].filter(Boolean),
  ),
];

export function entitled(shop, now = Date.now()) {
  const subscription = shop?.subscription;
  if (subscription?.status !== "active") return false;
  const expiry =
    subscription.paidUntil ??
    subscription.paidThrough ??
    subscription.expiresAt ??
    subscription.currentPeriodEnd;
  if (expiry === undefined || expiry === null) return false;
  const time =
    typeof expiry === "number"
      ? expiry < 1e12
        ? expiry * 1000
        : expiry
      : Date.parse(expiry);
  const verified = subscription.verifiedUntil;
  const verifiedTime =
    verified === undefined
      ? Infinity
      : typeof verified === "number"
        ? verified < 1e12
          ? verified * 1000
          : verified
        : Date.parse(verified);
  return Number.isFinite(time) && time > now && verifiedTime > now;
}

function mediaId(value, kind) {
  if (value === null || value === undefined) return null;
  requireValue(
    typeof value === "string" &&
      (/^img_[a-f0-9]{64}$/.test(value) ||
        (kind === "logo" ? value === "slot-1" : /^slot-[2-5]$/.test(value))),
    "Choose a previously uploaded image.",
  );
  return value;
}

function idList(value, label, allowed) {
  requireValue(
    Array.isArray(value) &&
      value.length <= 200 &&
      new Set(value).size === value.length,
    `${label} must be a unique list of up to 200 IDs.`,
  );
  return value.map((id) => {
    safeId(id);
    if (allowed)
      requireValue(allowed.has(id), `${label} contains an unknown item.`);
    return id;
  });
}

function available(value = true) {
  requireValue(
    typeof value === "boolean",
    "Availability must be true or false.",
  );
  return value;
}

function prices(value, label, allowedIds) {
  object(value, label);
  const result = {};
  for (const [id, price] of Object.entries(value)) {
    safeId(id);
    if (allowedIds)
      requireValue(allowedIds.has(id), `${label} contains an unknown item.`);
    requireValue(
      price === null ||
        (Number.isSafeInteger(price) && price >= 0 && price <= 1000000),
      `${label} must contain whole cents between 0 and 1,000,000, or null.`,
    );
    result[id] = price;
  }
  return result;
}

export function boundedDesign(value) {
  if (value === null) return null;
  object(value, "Bouquet design");
  let nodes = 0;
  const visit = (node, depth) => {
    requireValue(
      ++nodes <= 2500 && depth <= 14,
      "Bouquet design is too complex.",
    );
    if (node === null || typeof node === "boolean") return;
    if (typeof node === "number")
      return requireValue(
        Number.isFinite(node) && Math.abs(node) <= 1e9,
        "Bouquet design contains an invalid number.",
      );
    if (typeof node === "string")
      return requireValue(
        node.length <= 4000,
        "Bouquet design contains oversized text.",
      );
    if (Array.isArray(node)) {
      requireValue(
        node.length <= 300,
        "Bouquet design contains too many items.",
      );
      for (const child of node) visit(child, depth + 1);
      return;
    }
    object(node, "Bouquet design");
    for (const [key, child] of Object.entries(node)) {
      requireValue(
        key.length <= 100,
        "Bouquet design contains an invalid field.",
      );
      visit(child, depth + 1);
    }
  };
  visit(value, 0);
  requireValue(
    encoder.encode(JSON.stringify(value)).length <= 24 * 1024,
    "Bouquet design must be at most 24 KiB.",
    413,
  );
  return value;
}

export function validateDraft(value, catalog, { semantic = true } = {}) {
  object(value, "Draft", draftFields);
  requireValue(
    encoder.encode(JSON.stringify(value)).length <= DRAFT_LIMIT,
    "Draft is too large.",
    413,
  );
  requireValue(
    value.schemaVersion === undefined ||
      value.schemaVersion === 1 ||
      value.schemaVersion === 2,
    "Unsupported draft schema version.",
  );
  value = hydrateDraft(value);
  const result = { schemaVersion: 2 };
  for (const [key, max, required] of [
    ["name", 80, true],
    ["tagline", 160, false],
    ["city", 80, false],
    ["phone", 40, false],
    ["instagram", 120, false],
  ])
    result[key] = text(value[key], key, max, required);
  object(value.theme, "Theme", ["primary", "background"]);
  result.theme = {};
  for (const key of ["primary", "background"]) {
    requireValue(
      typeof value.theme[key] === "string" &&
        /^#[a-fA-F0-9]{6}$/.test(value.theme[key]),
      "Theme colors must use six-digit hex values.",
    );
    result.theme[key] = value.theme[key].toLowerCase();
  }
  requireValue(
    ["USD", "CAD"].includes(value.currency),
    "Currency must be USD or CAD.",
  );
  requireValue(
    ["fresh", "satin"].includes(value.preset),
    "Choose the fresh or satin preset.",
  );
  result.currency = value.currency;
  result.preset = value.preset;
  result.logoMediaId = mediaId(value.logoMediaId, "logo");
  const flowers = catalog?.flowers
    ? new Set(
        catalog.flowers
          .filter((item) => !item.preset || item.preset === value.preset)
          .map((item) => item.id),
      )
    : null;
  const extras = catalog?.extras
    ? new Set(
        catalog.extras
          .filter((item) => !item.preset || item.preset === value.preset)
          .map((item) => item.id),
      )
    : null;
  const recipes = catalog?.recipes
    ? new Set(
        catalog.recipes
          .filter((item) => !item.preset || item.preset === value.preset)
          .map((item) => item.id),
      )
    : null;
  result.flowerPrices = prices(value.flowerPrices, "Flower prices", flowers);
  result.extrasCents = prices(value.extrasCents, "Extra prices", extras);
  result.disabledFlowers = idList(
    value.disabledFlowers,
    "Disabled flowers",
    flowers,
  );
  result.disabledExtras = idList(
    value.disabledExtras,
    "Disabled extras",
    extras,
  );
  const modes =
    value.preset === "satin" ? ["dome", "heart"] : ["classic", "dome", "heart"];
  requireValue(
    Array.isArray(value.enabledModes) &&
      value.enabledModes.length <= 3 &&
      new Set(value.enabledModes).size === value.enabledModes.length &&
      value.enabledModes.every((mode) => modes.includes(mode)),
    "Choose compatible builder modes.",
  );
  result.enabledModes = [...value.enabledModes];
  object(value.home, "Home", [
    "headline",
    "description",
    "heroMediaId",
    "about",
    "sections",
    ...Object.keys(storefrontHomeDefaults),
  ]);
  const sections = ["custom", "products", "builder", "about", "contact"];
  requireValue(
    Array.isArray(value.home.sections) &&
      value.home.sections.length <= sections.length &&
      new Set(value.home.sections).size === value.home.sections.length &&
      value.home.sections.every((section) => sections.includes(section)),
    "Choose valid home sections.",
  );
  result.home = {
    headline: text(value.home.headline, "Headline", 160),
    description: multilineText(value.home.description, "Description", 600),
    heroMediaId: mediaId(value.home.heroMediaId, "cover"),
    about: multilineText(value.home.about, "About", 3000),
    sections: [...value.home.sections],
  };
  for (const [key, max] of Object.entries(homeTextLimits))
    result.home[key] = text(value.home[key], key, max);
  for (const [key, max] of Object.entries(homeMultilineLimits))
    result.home[key] = multilineText(value.home[key], key, max);
  for (const key of homeBooleanFields) {
    requireValue(
      typeof value.home[key] === "boolean",
      `${key} must be true or false.`,
    );
    result.home[key] = value.home[key];
  }
  for (const [key, choices] of Object.entries(homeChoices)) {
    requireValue(choices.includes(value.home[key]), `Choose a valid ${key}.`);
    result.home[key] = value.home[key];
  }
  requireValue(
    Array.isArray(value.collection) && value.collection.length <= 6,
    "A collection can contain up to six bouquets.",
  );
  const ids = new Set();
  result.collection = value.collection.map((item) => {
    object(item, "Collection bouquet", [
      "id",
      "title",
      "recipeId",
      "design",
      "cover",
      "available",
      "category",
    ]);
    const id = safeId(item.id, "Bouquet ID");
    requireValue(!ids.has(id), "Bouquet IDs must be unique.");
    ids.add(id);
    const recipeId =
      item.recipeId === null ? null : safeId(item.recipeId, "Recipe ID");
    if (recipeId && recipes)
      requireValue(recipes.has(recipeId), "Choose a known bouquet recipe.");
    const design = boundedDesign(item.design);
    requireValue(
      recipeId !== null || design !== null,
      "Choose a recipe or save a bouquet design.",
    );
    return {
      id,
      title: text(item.title, "Bouquet title", 80, true),
      recipeId,
      design,
      cover: mediaId(item.cover, "cover"),
      available: available(item.available),
      category: text(item.category ?? "", "Category", 60),
    };
  });
  requireValue(
    Array.isArray(value.products) && value.products.length <= 10,
    "A shop can contain up to ten fixed products.",
  );
  const productIds = new Set();
  result.products = value.products.map((item) => {
    object(item, "Product", [
      "id",
      "title",
      "description",
      "priceCents",
      "cover",
      "available",
      "category",
    ]);
    const id = safeId(item.id, "Product ID");
    requireValue(!productIds.has(id), "Product IDs must be unique.");
    productIds.add(id);
    requireValue(
      item.priceCents === null ||
        (Number.isSafeInteger(item.priceCents) &&
          item.priceCents >= 0 &&
          item.priceCents <= 1000000),
      "Product price must be whole cents between 0 and 1,000,000, or null.",
    );
    return {
      id,
      title: text(item.title, "Product title", 80, true),
      description: multilineText(
        item.description ?? "",
        "Product description",
        1000,
      ),
      priceCents: item.priceCents,
      cover: mediaId(item.cover, "cover"),
      available: available(item.available),
      category: text(item.category ?? "", "Category", 60),
    };
  });
  requireValue(
    mediaReferences(result).length <= 18,
    "A shop can reference up to eighteen active photos.",
  );
  const policy = normalizePolicy(result, catalog);
  requireValue(
    policy.ok,
    policy.issues[0]?.message || "Invalid shop catalogue policy.",
  );
  for (const item of semantic ? result.collection : []) {
    const design =
      item.design ||
      catalog?.recipes?.find((recipe) => recipe.id === item.recipeId)?.design;
    requireValue(
      design,
      "This recipe has no compatible saved design. Choose another recipe.",
    );
    // Availability is a publication rule. Retain a hidden or unoffered design in
    // the private draft so a catalogue edit never silently erases the artwork.
    const checked = validateDesign(
      design,
      {
        ...result,
        disabledFlowers: [],
        disabledExtras: [],
        enabledModes: modes,
      },
      catalog,
      { allowUnpriced: true },
    );
    requireValue(
      checked.ok,
      checked.issues[0]?.message || "This bouquet design is invalid.",
    );
    if (item.design) item.design = boundedDesign(checked.design);
  }
  return result;
}

export function validatePublication(value, catalog) {
  const draft = validateDraft(value, catalog);
  const preset = catalog.presets?.find((item) => item.id === draft.preset);
  requireValue(
    !preset || preset.available !== false,
    "This catalogue preset is not ready for publication.",
    409,
  );
  const normalized = normalizePolicy(draft, catalog).policy;
  if (draft.home.sections.includes("builder")) {
    const offered = Object.entries(normalized.flowerPrices).filter(
      ([id]) => !normalized.disabledFlowers.includes(id),
    );
    requireValue(
      offered.length > 0,
      "Offer at least one flower before publishing the open builder.",
    );
    requireValue(
      offered.every(([, cents]) => Number.isSafeInteger(cents)),
      "Set prices for every offered flower before publishing the open builder.",
    );
    requireValue(
      Object.entries(normalized.extrasCents)
        .filter(([id]) => !normalized.disabledExtras.includes(id))
        .every(([, cents]) => Number.isSafeInteger(cents)),
      "Set prices for every offered finishing item before publishing the open builder.",
    );
  }
  for (const item of draft.collection.filter((item) => item.available)) {
    const design =
      item.design ||
      catalog.recipes.find((recipe) => recipe.id === item.recipeId)?.design;
    const checked = validateDesign(design, draft, catalog);
    requireValue(
      checked.ok,
      checked.issues[0]?.message ||
        "Price every item in available bouquets before publishing.",
    );
    requireValue(
      checked.design.items.length > 0,
      "Add at least one flower to every available bouquet before publishing.",
    );
  }
  requireValue(
    !draft.products.some((item) => item.available && item.priceCents === null),
    "Set a fixed price for every available product before publishing.",
  );
  requireValue(
    draft.home.sections.includes("builder") ||
      draft.collection.some((item) => item.available) ||
      draft.products.some((item) => item.available),
    "Add an available product or bouquet, or enable the open builder before publishing.",
  );
  return draft;
}

export function readiness(shop) {
  const result = [];
  if (!entitled(shop))
    result.push({
      code: "billing_setup_pending",
      message:
        "Subscription billing setup is pending. Publishing is unavailable.",
    });
  if (shop.square?.status !== "connected")
    result.push({
      code: "square_setup_pending",
      message: "Square provider setup is pending. Checkout is unavailable.",
    });
  if (
    !shop.draft.collection.length &&
    !shop.draft.products?.length &&
    !shop.draft.home?.sections?.includes("builder")
  )
    result.push({
      code: "collection_empty",
      message: "Add a bouquet or fixed product, or enable the open builder.",
    });
  if (!shop.draft.city)
    result.push({ code: "city_missing", message: "Add your city." });
  return result;
}

export async function readImage(request, kind) {
  const mime = request.headers.get("content-type")?.split(";")[0].toLowerCase();
  requireValue(
    ["image/png", "image/jpeg", "image/webp"].includes(mime),
    "Upload a PNG, JPEG, or WebP image.",
    415,
  );
  const limit = (kind === "logo" ? 80 : kind === "hero" ? 250 : 150) * 1024;
  const length = Number(request.headers.get("content-length"));
  requireValue(
    !length || (Number.isSafeInteger(length) && length <= limit),
    `Image must be at most ${limit / 1024} KiB.`,
    413,
  );
  requireValue(request.body, "An image is required.");
  const reader = request.body.getReader(),
    parts = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, `Image must be at most ${limit / 1024} KiB.`);
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  const view = new DataView(bytes.buffer);
  let width = 0,
    height = 0;
  if (mime === "image/png") {
    requireValue(
      size >= 45 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) &&
        view.getUint32(8) === 13 &&
        String.fromCharCode(...bytes.slice(12, 16)) === "IHDR",
      "Invalid PNG image.",
    );
    requireValue(
      String.fromCharCode(...bytes.slice(-8, -4)) === "IEND",
      "PNG image is incomplete.",
    );
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (mime === "image/jpeg") {
    requireValue(
      size >= 12 &&
        bytes[0] === 255 &&
        bytes[1] === 216 &&
        bytes[size - 2] === 255 &&
        bytes[size - 1] === 217,
      "Invalid JPEG image.",
    );
    for (let i = 2; i + 3 < size; ) {
      requireValue(bytes[i++] === 255, "Invalid JPEG image.");
      while (bytes[i] === 255) i++;
      const marker = bytes[i++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      requireValue(i + 1 < size, "Invalid JPEG image.");
      const chunk = view.getUint16(i);
      requireValue(chunk >= 2 && i + chunk <= size, "Invalid JPEG image.");
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      ) {
        requireValue(chunk >= 8, "Invalid JPEG dimensions.");
        height = view.getUint16(i + 3);
        width = view.getUint16(i + 5);
        break;
      }
      i += chunk;
    }
  } else {
    requireValue(
      size >= 30 &&
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
        view.getUint32(4, true) === size - 8,
      "Invalid WebP image.",
    );
    const type = String.fromCharCode(...bytes.slice(12, 16));
    if (type === "VP8X") {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (type === "VP8L") {
      requireValue(bytes[20] === 47, "Invalid WebP image.");
      width = 1 + (((bytes[22] & 63) << 8) | bytes[21]);
      height =
        1 + (((bytes[24] & 15) << 10) | (bytes[23] << 2) | (bytes[22] >> 6));
    } else if (type === "VP8 ") {
      requireValue(
        bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42,
        "Invalid WebP image.",
      );
      width = view.getUint16(26, true) & 16383;
      height = view.getUint16(28, true) & 16383;
    }
  }
  requireValue(
    width > 0 &&
      height > 0 &&
      width <= 2400 &&
      height <= 2400 &&
      width * height <= 5760000,
    "Image dimensions must be between 1 and 2400 pixels.",
  );
  return { mime, bytes };
}
