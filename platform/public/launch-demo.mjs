// Public samples never create a merchant, request, payment or subscription.
const key = "nebula:trial-bouquet:v1";
export function readTrial(storage, now = Date.now()) {
  try {
    storage ||= globalThis.sessionStorage;
    const raw = storage.getItem(key);
    if (!raw || raw.length > 150000) return null;
    const value = JSON.parse(raw);
    return value?.version === 1 &&
      Number.isFinite(value.savedAt) &&
      value.savedAt <= now &&
      now - value.savedAt < 86400000 &&
      ["fresh", "satin"].includes(value.preset) &&
      value.design &&
      Array.isArray(value.design.items) &&
      value.design.items.length > 0 &&
      value.design.items.length <= 300
      ? value
      : null;
  } catch {
    return null;
  }
}
export function keepTrial(design, preset, storage = sessionStorage) {
  const value = { version: 1, savedAt: Date.now(), preset, design };
  const raw = JSON.stringify(value);
  if (raw.length > 150000 || !["fresh", "satin"].includes(preset))
    throw Error(
      "This design could not be kept. You can start a bouquet in your shop.",
    );
  storage.setItem(key, raw);
}
export function clearTrial(storage) {
  try {
    storage ||= globalThis.sessionStorage;
    storage.removeItem(key);
  } catch {}
}
export function demoShop(catalog, preset) {
  const satin = preset === "satin";
  return {
    id: "nebula-demo",
    version: 1,
    slug: "nebula-demo",
    features: { requestsEnabled: false, checkoutEnabled: false },
    draft: {
      name: "Nebula demo",
      tagline: "Try your bouquet idea · sample prices",
      preset,
      currency: "USD",
      country: "",
      city: "",
      timeZone: "UTC",
      collection: [],
      products: [],
      disabledFlowers: [],
      disabledExtras: [],
      enabledModes: satin ? ["dome", "heart"] : ["classic", "dome", "heart"],
      flowerPrices: Object.fromEntries(
        catalog.flowers.map((row) => [row.id, row.priceCents ?? 400]),
      ),
      extrasCents: Object.fromEntries(
        catalog.extras.map((row) => [row.id, row.priceCents ?? 0]),
      ),
      theme: { primary: "#672a3f", background: "#f7f5ef" },
    },
  };
}
