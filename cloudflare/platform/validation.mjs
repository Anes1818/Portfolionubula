import { HttpError, requireValue } from "../rays-payments/security.mjs";

export const DRAFT_LIMIT = 80 * 1024;
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
  };
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

function boundedDesign(value) {
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

export function validateDraft(value, catalog) {
  object(value, "Draft", draftFields);
  requireValue(
    encoder.encode(JSON.stringify(value)).length <= DRAFT_LIMIT,
    "Draft is too large.",
    413,
  );
  const result = {};
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
  requireValue(
    value.logoMediaId === undefined ||
      value.logoMediaId === null ||
      value.logoMediaId === "slot-1",
    "Logo media must use slot 1.",
  );
  result.logoMediaId = value.logoMediaId ?? null;
  const flowers = catalog?.flowers
    ? new Set(catalog.flowers.map((item) => item.id))
    : null;
  const extras = catalog?.extras
    ? new Set(catalog.extras.map((item) => item.id))
    : null;
  const recipes = catalog?.recipes
    ? new Set(catalog.recipes.map((item) => item.id))
    : null;
  result.flowerPrices = prices(value.flowerPrices, "Flower prices", flowers);
  result.extrasCents = prices(value.extrasCents, "Extra prices", extras);
  requireValue(
    Array.isArray(value.disabledFlowers) &&
      value.disabledFlowers.length <= 200 &&
      new Set(value.disabledFlowers).size === value.disabledFlowers.length,
    "Disabled flowers must be a unique list of up to 200 IDs.",
  );
  result.disabledFlowers = value.disabledFlowers.map((id) => {
    safeId(id);
    if (flowers)
      requireValue(
        flowers.has(id),
        "Disabled flowers contains an unknown flower.",
      );
    return id;
  });
  requireValue(
    Array.isArray(value.collection) && value.collection.length <= 4,
    "A collection can contain up to four bouquets.",
  );
  const ids = new Set();
  result.collection = value.collection.map((item) => {
    object(item, "Collection bouquet", [
      "id",
      "title",
      "recipeId",
      "design",
      "cover",
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
    requireValue(
      item.cover === null ||
        (typeof item.cover === "string" && /^slot-[2-5]$/.test(item.cover)),
      "Bouquet cover must use media slot 2–5.",
    );
    return {
      id,
      title: text(item.title, "Bouquet title", 80, true),
      recipeId,
      design,
      cover: item.cover,
    };
  });
  return result;
}

export function readiness(shop) {
  const result = [
    {
      code: "billing_setup_pending",
      message:
        "Subscription billing setup is pending. Publishing is unavailable.",
    },
    {
      code: "square_setup_pending",
      message: "Square provider setup is pending. Checkout is unavailable.",
    },
  ];
  if (!shop.draft.collection.length)
    result.push({
      code: "collection_empty",
      message: "Add at least one bouquet to your collection.",
    });
  if (!shop.draft.city)
    result.push({ code: "city_missing", message: "Add your city." });
  if (shop.draft.preset === "satin")
    result.push({
      code: "satin_preparing",
      message: "The satin preset is still being prepared.",
    });
  return result;
}

export async function readImage(request, kind) {
  const mime = request.headers.get("content-type")?.split(";")[0].toLowerCase();
  requireValue(
    ["image/png", "image/jpeg", "image/webp"].includes(mime),
    "Upload a PNG, JPEG, or WebP image.",
    415,
  );
  const limit = kind === "logo" ? 80 * 1024 : 150 * 1024;
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
