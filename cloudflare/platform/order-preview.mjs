import { requireValue } from "../rays-payments/security.mjs";
import { readImage } from "./validation.mjs";

// Raster only. No remote URL fetching, SVG, HTML, public media token or pricing authority.
export async function orderPreview(value) {
  if (value === undefined || value === null) return null;
  requireValue(
    typeof value === "string" && value.length <= 110000,
    "Bouquet preview is too large.",
    413,
  );
  const match = value.match(
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  requireValue(match, "Choose a raster bouquet preview.");
  let bytes;
  try {
    bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  } catch {
    requireValue(false, "Invalid bouquet preview.");
  }
  await readImage(
    new Request("https://internal/preview", {
      method: "POST",
      headers: { "Content-Type": match[1] },
      body: bytes,
    }),
    "logo",
  );
  return value;
}

export const orderReference = (q) =>
  q.reference || "NB-" + q.id.slice(0, 10).toUpperCase();
export const merchantOrderPath = (q) =>
  "/dashboard/orders?request=" + encodeURIComponent(q.sourceRequestId);
