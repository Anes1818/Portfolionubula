import { requireValue } from "../rays-payments/security.mjs";
const loaded = new WeakMap();
/** Semantic geometry/pricing executes inside the shop Durable Object, not the
 * 10ms edge request. This is trusted shared artwork, never merchant input. */
export async function canonicalCatalog(env) {
  requireValue(env.ASSETS?.fetch, "The shared catalogue is unavailable.", 503);
  if (!loaded.has(env.ASSETS))
    loaded.set(
      env.ASSETS,
      (async () => {
        const response = await env.ASSETS.fetch(
          new Request("https://assets/catalog.json"),
        );
        requireValue(response.ok, "The shared catalogue is unavailable.", 503);
        const catalog = await response.json();
        requireValue(
          Array.isArray(catalog.flowers) &&
            Array.isArray(catalog.extras) &&
            Array.isArray(catalog.recipes),
          "The shared catalogue is unavailable.",
          503,
        );
        return catalog;
      })().catch((error) => {
        loaded.delete(env.ASSETS);
        throw error;
      }),
    );
  return loaded.get(env.ASSETS);
}
