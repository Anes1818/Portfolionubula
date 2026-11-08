import { createRuntime } from "./runtime.mjs";

const MAX_CENTS = 100000000;
const isRecord = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);
const cents = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= MAX_CENTS;
const copy = (value) => JSON.parse(JSON.stringify(value));
const issue = (code, path, message, id) => ({
  code,
  path,
  message,
  ...(id ? { id } : {}),
});
// Evaluation is synchronous and resets every price before use. Reuse initialized
// geometry helpers without rebuilding the entire shared runtime for every card.
const runtimeCache = new Map();
const runtimeFor = (preset) => {
  if (!runtimeCache.has(preset))
    runtimeCache.set(preset, createRuntime(preset));
  return runtimeCache.get(preset);
};

/** Missing prices are deliberately null. A draft can be saved before pricing. */
export function normalizePolicy(draft, catalog) {
  const issues = [];
  if (
    !isRecord(draft) ||
    !catalog ||
    !Array.isArray(catalog.flowers) ||
    !Array.isArray(catalog.extras)
  )
    return {
      ok: false,
      issues: [
        issue(
          "invalid_policy",
          "draft",
          "A shop and a catalogue are required.",
        ),
      ],
      policy: null,
    };
  const preset = draft.preset || "fresh";
  if (!["fresh", "satin", "mixed"].includes(preset))
    issues.push(
      issue("invalid_preset", "preset", "Choose fresh or satin flowers."),
    );
  const availableModes =
    preset === "satin" ? ["dome", "heart"] : ["classic", "dome", "heart"];
  const policy = {
    preset,
    currency: draft.currency || "USD",
    flowerPrices: {},
    extrasCents: {},
    disabledFlowers: [],
    disabledExtras: [],
    enabledModes: [],
  };
  for (const [field, rows] of [
    ["flowerPrices", catalog.flowers],
    ["extrasCents", catalog.extras],
  ]) {
    if (draft[field] !== undefined && !isRecord(draft[field]))
      issues.push(
        issue(
          "invalid_prices",
          field,
          "Prices must be an object of integer cents.",
        ),
      );
    const known = new Set(rows.map((row) => row.id));
    for (const [id, value] of Object.entries(
      isRecord(draft[field]) ? draft[field] : {},
    )) {
      if (!known.has(id))
        issues.push(
          issue(
            "unknown_id",
            `${field}.${id}`,
            "This catalogue item does not exist.",
            id,
          ),
        );
      else if (value !== null && !cents(value))
        issues.push(
          issue(
            "invalid_price",
            `${field}.${id}`,
            "Enter a nonnegative whole number of cents.",
            id,
          ),
        );
    }
    for (const row of rows)
      if (!row.preset || preset === "mixed" || row.preset === preset)
        policy[field][row.id] =
          Object.hasOwn(draft[field] || {}, row.id) &&
          cents(draft[field][row.id])
            ? draft[field][row.id]
            : null;
  }
  for (const [field, rows] of [
    ["disabledFlowers", catalog.flowers],
    ["disabledExtras", catalog.extras],
  ]) {
    const values = draft[field] ?? [];
    if (
      !Array.isArray(values) ||
      values.some((value) => typeof value !== "string")
    )
      issues.push(
        issue(
          "invalid_disabled",
          field,
          "Disabled items must be a list of catalogue IDs.",
        ),
      );
    else {
      const known = new Set(rows.map((row) => row.id));
      for (const id of values)
        if (!known.has(id))
          issues.push(
            issue(
              "unknown_id",
              field,
              "This catalogue item does not exist.",
              id,
            ),
          );
      policy[field] = [...new Set(values.filter((id) => known.has(id)))];
    }
  }
  const modes = draft.enabledModes ?? availableModes;
  if (
    !Array.isArray(modes) ||
    modes.some((mode) => !availableModes.includes(mode)) ||
    !modes.length
  )
    issues.push(
      issue(
        "invalid_modes",
        "enabledModes",
        "Choose at least one mode supported by this preset.",
      ),
    );
  else policy.enabledModes = [...new Set(modes)];
  return { ok: issues.length === 0, issues, policy };
}

/** Translate only semantic catalogue references; artwork/layout keys stay intact. */
export function mapDesignIds(design, catalog, preset, direction = "runtime") {
  const out = copy(design),
    rows = catalog.flowers.filter((row) => row.preset === preset);
  const mapping = new Map(
    rows.map((row) =>
      direction === "runtime"
        ? [row.id, row.runtimeId || row.id]
        : [row.runtimeId || row.id, row.id],
    ),
  );
  const map = (id) => (id === null ? null : mapping.get(id) || id);
  for (const item of out.items || []) item.id = map(item.id);
  if (out.template) {
    out.template.palette = (out.template.palette || []).map(map);
    if (out.template.accent)
      out.template.accent.id = map(out.template.accent.id);
    if (out.template.zones)
      for (const key of ["wall", "fill", "center"])
        out.template.zones[key] = map(out.template.zones[key]);
    if (out.template.overrides)
      for (const key of Object.keys(out.template.overrides))
        out.template.overrides[key] = map(out.template.overrides[key]);
  }
  if (preset === "satin") {
    const extraMap = new Map(
      catalog.extras
        .filter((row) => row.preset === "satin")
        .map((row) =>
          direction === "runtime"
            ? [row.id, row.runtimeId || row.id]
            : [row.runtimeId || row.id, row.id],
        ),
    );
    for (const detail of out.finishes?.decorations || [])
      detail.id = extraMap.get(detail.id) || detail.id;
  }
  return out;
}

export function designPreset(design, catalog, fallback = "fresh") {
  if (["fresh", "satin"].includes(design?.flowerType)) return design.flowerType;
  const refs = [
    ...(Array.isArray(design?.items) ? design.items : []).map(
      (item) => item?.id,
    ),
    ...(Array.isArray(design?.template?.palette)
      ? design.template.palette
      : []),
    design?.template?.accent?.id,
    ...Object.values(design?.template?.zones || {}),
    ...Object.values(design?.template?.overrides || {}),
  ];
  return (
    catalog?.flowers?.find((row) => refs.includes(row.id))?.preset || fallback
  );
}

function evaluate(design, draft, catalog, { allowUnpriced = false } = {}) {
  const mixed = draft?.preset === "mixed";
  if (mixed) {
    const shopPolicy = normalizePolicy(draft, catalog);
    if (!shopPolicy.ok)
      return {
        ok: false,
        issues: shopPolicy.issues,
        design: null,
        pricing: null,
      };
    const preset = designPreset(design, catalog);
    draft = {
      ...draft,
      preset,
      enabledModes: shopPolicy.policy.enabledModes.filter(
        (mode) => preset !== "satin" || mode !== "classic",
      ),
    };
  }
  const normalized = normalizePolicy(draft, catalog),
    issues = [...normalized.issues],
    policy = normalized.policy;
  if (!normalized.ok) return { ok: false, issues, design: null, pricing: null };
  if (
    !isRecord(design) ||
    !Array.isArray(design.items) ||
    design.items.length > 100
  )
    return {
      ok: false,
      issues: [
        issue(
          "invalid_design",
          "design",
          "A bouquet may contain at most 100 items.",
        ),
      ],
      design: null,
      pricing: null,
    };
  if (new TextEncoder().encode(JSON.stringify(design)).length > 24576)
    issues.push(
      issue(
        "design_too_large",
        "design",
        "A saved bouquet must be at most 24 KiB.",
      ),
    );
  if (!policy.enabledModes.includes(design.mode))
    issues.push(
      issue("disabled_mode", "mode", "This bouquet mode is not offered."),
    );
  const flowers = new Map(catalog.flowers.map((row) => [row.id, row]));
  const extras = new Map(
    catalog.extras
      .filter((row) => !row.preset || row.preset === policy.preset)
      .map((row) => [row.id, row]),
  );
  const disabledFlowers = new Set(policy.disabledFlowers),
    disabledExtras = new Set(policy.disabledExtras);
  const checkFlower = (id, path, priced = true, asFinish = false) => {
    const row = flowers.get(id);
    if (!row)
      issues.push(
        issue("unknown_flower", path, "This flower does not exist.", id),
      );
    else if (row.preset !== policy.preset)
      issues.push(
        issue(
          "incompatible_preset",
          path,
          "This flower belongs to another preset.",
          id,
        ),
      );
    else if (!asFinish && row.modes && !row.modes.includes(design.mode))
      issues.push(
        issue(
          "incompatible_mode",
          path,
          "This flower is unavailable in this bouquet mode.",
          id,
        ),
      );
    else if (disabledFlowers.has(id))
      issues.push(
        issue(
          "disabled_flower",
          path,
          "This flower is not offered by this shop.",
          id,
        ),
      );
    else if (priced && !allowUnpriced && !cents(policy.flowerPrices[id]))
      issues.push(
        issue("unpriced_flower", path, "This flower needs a shop price.", id),
      );
  };
  design.items.forEach((item, index) =>
    checkFlower(item?.id, `items.${index}.id`),
  );
  // A generic per-note catalogue does not imply Ray's separate cash-supply,
  // currency-conversion or deposit policy. Keep imported artwork editable, but
  // never publish/request a design whose price would ignore those terms.
  if (
    !allowUnpriced &&
    policy.preset === "satin" &&
    (design.finishes?.studio?.cashSupply === "customer" ||
      design.finishes?.studio?.paymentPlan !== undefined)
  )
    issues.push(
      issue(
        "unsupported_cash_terms",
        "finishes.studio",
        "Customer-supplied cash and payment-plan choices need a dedicated approved pricing policy. Use the shop’s per-note catalogue price instead.",
      ),
    );
  // Unused palette/accent references remain valid editing controls. Reject unknown
  // or foreign references, but availability/pricing applies to rendered units.
  const t = design.template;
  if (t) {
    const refs = [
      ...(Array.isArray(t.palette) ? t.palette : []),
      t.accent?.id,
      ...Object.values(t.zones || {}).filter(
        (value) => typeof value === "string" && flowers.has(value),
      ),
      ...Object.values(t.overrides || {}).filter((value) => value !== null),
    ];
    for (const id of refs)
      if (!flowers.has(id) || flowers.get(id).preset !== policy.preset)
        checkFlower(id, "template", false);
  }
  const runtime = runtimeFor(policy.preset),
    raw = mapDesignIds(design, catalog, policy.preset),
    model = runtime.Model;
  let canonical;
  try {
    canonical = model.validate(raw);
  } catch {}
  if (!canonical)
    issues.push(
      issue(
        "invalid_design",
        "design",
        "The bouquet has invalid quantities, geometry or finishing details.",
      ),
    );
  if (!canonical || issues.length)
    return { ok: false, issues, design: null, pricing: null };
  for (const row of catalog.flowers.filter(
    (row) => row.preset === policy.preset,
  ))
    runtime.CAT[row.runtimeId || row.id].priceCents =
      policy.flowerPrices[row.id] ?? 0;
  runtime.CONFIG.baseCents = 0;
  runtime.CONFIG.laborCents = { classic: 0, dome: 0, heart: 0 };
  runtime.CONFIG.currency = policy.currency;
  for (const row of extras.values())
    runtime.CONFIG.extrasCents[row.runtimeId || row.id] =
      policy.extrasCents[row.id] ?? 0;
  let calculated;
  try {
    calculated = model.price(canonical);
  } catch {
    issues.push(
      issue("invalid_pricing", "design", "The bouquet could not be priced."),
    );
  }
  if (!calculated) return { ok: false, issues, design: null, pricing: null };
  const runtimeFlowers = new Map(
    catalog.flowers
      .filter((row) => row.preset === policy.preset)
      .map((row) => [row.runtimeId || row.id, row]),
  );
  const runtimeExtras = new Map(
    [...extras.values()].map((row) => [row.runtimeId || row.id, row]),
  );
  const sourceFlower = {
    interiorGreenery: "eucalyptus",
    greenRim: "eucalyptus",
    lily_bud: "lily_bud",
    whiteSprays: "white_flower_spray",
  };
  const extraLines = calculated.extraLines.map((line) => {
    const flowerId = sourceFlower[line.id] ||
      (runtime.CAT[line.id]?.referenceFiller ? line.id : null);
    if (flowerId) {
      const row = runtimeFlowers.get(flowerId);
      checkFlower(row?.id, "finishes." + line.id, true, true);
      return {
        ...line,
        id: row?.id || flowerId,
        source: "flower",
        unitCents: policy.flowerPrices[row?.id] ?? 0,
      };
    }
    const row = runtimeExtras.get(
        line.id === "breathBorder" ? "filler" : line.id,
      ),
      id = row?.id || line.id;
    if (!row)
      issues.push(
        issue(
          "unknown_extra",
          "finishes." + line.id,
          "This finishing item is unavailable.",
          id,
        ),
      );
    else if (disabledExtras.has(id))
      issues.push(
        issue(
          "disabled_extra",
          "finishes." + line.id,
          "This finishing item is not offered.",
          id,
        ),
      );
    else if (!allowUnpriced && !cents(policy.extrasCents[id]))
      issues.push(
        issue(
          "unpriced_extra",
          "finishes." + line.id,
          "This finishing item needs a shop price.",
          id,
        ),
      );
    return {
      ...line,
      id,
      source: "extra",
      unitCents: policy.extrasCents[id] ?? 0,
    };
  });
  const lines = calculated.lines.map((line) => ({
    ...line,
    id: runtimeFlowers.get(line.id)?.id || line.id,
  }));
  const totalCents = calculated.totalCents;
  if (!Number.isSafeInteger(totalCents) || totalCents < 0)
    issues.push(
      issue("invalid_total", "design", "The bouquet total is invalid."),
    );
  const pricing = {
    ok: issues.length === 0,
    issues,
    currency: policy.currency,
    lines,
    extraLines,
    flowersCents: calculated.flowersCents,
    extrasCents: calculated.extrasCents,
    baseCents: 0,
    laborCents: 0,
    totalCents,
  };
  return {
    ok: issues.length === 0,
    issues,
    design: {
      ...mapDesignIds(canonical, catalog, policy.preset, "catalog"),
      ...(mixed ? { flowerType: policy.preset } : {}),
    },
    pricing,
  };
}

export function validateDesign(design, draft, catalog, options = {}) {
  return evaluate(design, draft, catalog, options);
}
export function priceDesign(design, draft, catalog) {
  const result = evaluate(design, draft, catalog);
  return (
    result.pricing || {
      ok: false,
      issues: result.issues,
      currency: draft?.currency,
      lines: [],
      extraLines: [],
      flowersCents: 0,
      extrasCents: 0,
      baseCents: 0,
      laborCents: 0,
      totalCents: null,
    }
  );
}
