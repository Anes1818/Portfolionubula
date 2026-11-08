import { validateDesign } from "./policy.mjs";

// Owners can explore the library. Availability for customers is saved separately.
export const explorationDraft = (draft) => ({
  ...draft,
  disabledFlowers: [],
  disabledExtras: [],
});
export function bouquetRequirements(draft, card, catalog) {
  const design =
    card?.design ||
    catalog.recipes.find((row) => row.id === card?.recipeId)?.design;
  const result = validateDesign(design, explorationDraft(draft), catalog, {
    allowUnpriced: true,
  });
  if (!result.ok || !result.design.items.length)
    throw Error(
      result.issues[0]?.message || "Add a flower to your bouquet first.",
    );
  const fields = new Map();
  const add = (line, bucket, rows) => {
    const row = rows.find((row) => row.id === line.id);
    if (!row) throw Error("This bouquet has an unavailable finishing option.");
    fields.set(bucket + ":" + row.id, {
      id: row.id,
      bucket,
      label: row.en || row.label || row.id,
      value: draft[bucket][row.id] ?? null,
    });
  };
  for (const line of result.pricing.lines)
    add(line, "flowerPrices", catalog.flowers);
  for (const line of result.pricing.extraLines)
    add(
      line,
      line.source === "flower" ? "flowerPrices" : "extrasCents",
      line.source === "flower" ? catalog.flowers : catalog.extras,
    );
  return { design: result.design, fields: [...fields.values()] };
}
export function hideUnpriced(draft, catalog) {
  const next = structuredClone(draft);
  for (const [rows, bucket, disabled] of [
    [catalog.flowers, "flowerPrices", "disabledFlowers"],
    [catalog.extras, "extrasCents", "disabledExtras"],
  ])
    next[disabled] = [
      ...new Set([
        ...next[disabled],
        ...rows
          .filter(
            (row) =>
              (!row.preset ||
                next.preset === "mixed" ||
                row.preset === next.preset) &&
              !Number.isSafeInteger(next[bucket][row.id]),
          )
          .map((row) => row.id),
      ]),
    ];
  return next;
}
export function finishBouquetDraft(
  draft,
  cardId,
  catalog,
  { title, prices, cover, limitLibrary = true },
) {
  const card = draft.collection.find((row) => row.id === cardId);
  if (!card)
    throw Error("This bouquet was removed. Reopen your shop before saving.");
  const required = bouquetRequirements(draft, card, catalog);
  let next = structuredClone(draft);
  for (const field of required.fields) {
    const value = prices[field.bucket + ":" + field.id];
    if (!Number.isSafeInteger(value) || value < 0 || value > 1000000)
      throw Error(
        "Enter your price for " +
          field.label +
          ". Enter 0 only if it is included.",
      );
    next[field.bucket][field.id] = value;
    const disabled =
      field.bucket === "flowerPrices" ? "disabledFlowers" : "disabledExtras";
    next[disabled] = next[disabled].filter((id) => id !== field.id);
  }
  if (limitLibrary) next = hideUnpriced(next, catalog);
  const target = next.collection.find((row) => row.id === cardId);
  target.title = title.trim();
  if (!target.title || target.title.length > 80)
    throw Error("Give your bouquet a name of up to 80 characters.");
  if (cover) target.cover = cover;
  if (!next.home.sections.includes("custom"))
    next.home.sections.unshift("custom");
  if (!next.home.sections.includes("builder"))
    next.home.sections.push("builder");
  const checked = validateDesign(required.design, next, catalog);
  if (!checked.ok)
    throw Error(checked.issues[0]?.message || "Review the bouquet prices.");
  return next;
}
