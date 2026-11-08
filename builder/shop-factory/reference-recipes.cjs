/* Coordinates are relative to the dome radius. A focal assignment claims one
 * real slot. Filler counts and finishing touches live outside the template. */
const fresh = [
  {
    id: "blush-and-ivory", name: "Blush & Ivory", capacity: 61,
    description: "Blush and ivory roses, pink gerberas, white mums and chamomile.",
    paper: "custom", tint: "#edc5bc", wrap: "ruffle",
    bed: ["rose_pink", "rose_ivory", "rose_pink", "rose_cream"],
    accents: [
      ["gerbera_blush", [[-.4,-.65],[.45,-.68],[-.75,-.05],[.02,-.1],[.72,.14],[-.47,.62],[.3,.73]]],
      ["mum_white", [[.03,-.81],[-.37,-.27],[.38,-.28],[-.59,.29],[.34,.33],[-.05,.58],[.74,-.34]]],
    ],
    fillers: { chamomile_spray: 8 },
  },
  {
    id: "golden-autumn-mix", name: "Golden Autumn Mix", capacity: 46,
    description: "Sunflowers and warm callas over autumn roses, ranunculus and chamomile.",
    paper: "custom", tint: "#f3d079", wrap: "ruffle",
    bed: ["rose_cream", "spray_rose_yellow", "rose_orange", "spray_rose_yellow", "rose_ivory"],
    accents: [
      ["sunflower", [[0,-.78],[-.74,-.31],[.65,.48],[-.35,.48]]],
      ["calla_peach", [[-.22,-.27],[.25,-.16],[.02,.44]]],
      ["gerbera_peach", [[.55,-.63],[-.52,-.04],[.12,.24],[.78,.09],[-.58,.62]]],
      ["ranunculus_coral", [[.02,.02],[-.64,.22],[.3,.66],[.69,-.36],[-.29,-.64]]],
      ["mum_rust", [[.13,.78],[-.88,.27],[-.36,-.44],[.88,.36]]],
    ],
    fillers: { chamomile_spray: 6 },
    sash: "blank_cocoa", message: "Still falling for you", sashPlacement: "diagonal", sashOffset: -45,
    details: [["pumpkin_plush", -.66, .45, .88, -10], ["satin_cocoa", .34, -.63, .7, 12]],
  },
  {
    id: "ivory-and-rust", name: "Ivory & Rust", capacity: 35,
    description: "A centre of white roses, a rust mum border and gold button mum sprigs.",
    paper: "kraft", wrap: "round", bed: ["rose_white", "rose_white_cupped"], rim: "mum_rust", rimCount: 17,
    fillers: { mum_button_gold: 4 },
    sash: "blank_cocoa", message: "Happy Birthday",
    details: [["satin_cocoa", -.57, .03, .92, -9]],
  },
  {
    id: "midnight-orchard", name: "Midnight Orchard", capacity: 32,
    description: "Wine, fuchsia and lime flowers with a bold red daisy mum and green gap accents.",
    paper: "black", wrap: "round",
    bed: ["mum_magenta", "carnation_picotee", "rose_fuchsia", "carnation_picotee"],
    accents: [
      ["mum_red_daisy", [[.37,.2]]],
      ["hydrangea_lime", [[-.35,.33],[.52,-.31]]],
      ["calla_black", [[.1,-.65],[-.54,-.04],[.63,.54]]],
      ["alstroemeria_fuchsia", [[-.35,-.67],[-.77,-.38],[.1,-.36]]],
      ["mum_button_lime", [[-.66,.03],[.47,.62],[.3,-.36]]],
      ["rose_fuchsia", [[-.15,-.12],[.12,.02]]],
    ],
    fillers: { hypericum_green: 3, bupleurum_lime: 3, stock_purple: 3 },
  },
];
const foam = {
  id: "satin-aqua-keepsake", name: "Aqua Keepsake", capacity: 24,
  description: "Cupped white foam roses, aqua triangle wrap and a personal message.",
  paper: "custom", tint: "#a5d4d5", sash: "blank_champagne",
  message: "Will you be my girlfriend?",
};
const midnightClassic = {
  id: "midnight-orchard-classic",
  name: "Midnight Orchard · Classic",
  description: "Hand-tied wine and lime flowers in smoke-black paper, with upright black callas.",
  // Taller blooms and callas stand at the shoulders and back. Large heads
  // frame the front, with the red daisy offset like the reference bouquet.
  stems: [
    ["alstroemeria_fuchsia", [[-.22,-.69],[.04,-.73],[-.70,-.37]]],
    ["calla_black", [[.31,-.61],[-.43,-.42]]],
    ["mum_magenta", [[.59,-.53],[.82,-.19],[-.13,-.31],[.07,.55]]],
    ["rose_fuchsia", [[-.08,-.07],[.24,-.15],[.18,.15]]],
    ["hydrangea_lime", [[-.44,.37],[.48,-.10]]],
    ["mum_button_lime", [[-.61,-.13],[.63,.42],[.37,.63]]],
    ["carnation_picotee", [[-.87,-.22],[-.87,.13],[-.67,.42],[-.14,.24],[.86,.18]]],
    ["mum_red_daisy", [[.55,.22]]],
  ],
  fillers: { hypericum_green: 3, bupleurum_lime: 3, stock_purple: 2 },
};

function prepareClassic(spec, ctx) {
  const { NebulaModel: M, NebulaClassic: Classic, NebulaDetails: D } = ctx;
  const design = M.empty();
  const frame = Classic.frame();
  design.frames.classic = frame;
  design.title = spec.name;
  design.items = spec.stems.flatMap(([id, points]) => points.map(([x, y]) => {
    const item = M.newItem(design, id);
    item.anchors.classic = {
      x: frame.center.x + x * 217,
      y: frame.center.y + y * 204,
      manual: true,
    };
    return item;
  }));
  Object.assign(design.finishes, {
    paper: "black",
    studio: { v: 1, wrap: "smoke-upright", referenceFillers: { ...spec.fillers } },
    decorations: [D.create("satin_black")],
  });
  return M.validate(design);
}

function prepareFresh(spec, ctx) {
  const { NebulaModel: M, NebulaTemplates: T, NebulaDetails: D } = ctx;
  const s = M.defaultMode("dome");
  M.resize(s, spec.capacity);
  const { points, frame } = T.layout(s.mode, spec.capacity);
  const assignments = {};
  for (const [id, targets] of spec.accents || []) {
    for (const [x, y] of targets) {
      const nearest = points.filter(p => !Object.hasOwn(assignments, p.slot)).sort(
        (a, b) => Math.hypot(a.x - x * frame.radius, a.y - y * frame.radius) -
          Math.hypot(b.x - x * frame.radius, b.y - y * frame.radius),
      )[0];
      assignments[nearest.slot] = id;
    }
  }
  if (spec.rim) {
    for (const p of [...points].sort((a, b) => b.r - a.r).slice(0, spec.rimCount))
      assignments[p.slot] = spec.rim;
  }
  for (const p of points) {
    if (!Object.hasOwn(assignments, p.slot))
      assignments[p.slot] = spec.bed[(p.slot * 7 + Math.floor(p.slot / 5)) % spec.bed.length];
  }
  s.template.overrides = assignments;
  s.title = spec.name;
  Object.assign(s.finishes, {
    paper: spec.paper, tint: spec.tint || s.finishes.tint,
    studio: { v: 1, wrap: spec.wrap, referenceFillers: { ...spec.fillers } },
    sash: spec.sash || "none", sashText: spec.message || "",
    sashPlacement: spec.sashPlacement || "auto", sashOffset: spec.sashOffset || 0,
    decorations: (spec.details || []).map(([id,x,y,scale,rotation]) =>
      ({ ...D.create(id), x, y, scale, rotation })),
  });
  M.syncTemplate(s);
  return M.validate(s);
}

function catalogRecipe(spec, design, preset) {
  const counts = {};
  for (const item of design.items) counts[item.id] = (counts[item.id] || 0) + 1;
  return {
    id: spec.id, name: spec.name, en: spec.name, description: spec.description,
    mode: design.mode, preset, counts, design,
    cover: "/studio/assets/catalog/thumbs/" + spec.id + ".webp",
  };
}

module.exports = { fresh, foam, midnightClassic, prepareClassic, prepareFresh, catalogRecipe };
