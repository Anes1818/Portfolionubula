/* Shared owner studio. Only the explicit runtime and artwork allowlist is public. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const referenceRecipes = require("../shop-factory/reference-recipes.cjs");

const root = path.resolve(__dirname, "../..");
const source = path.join(root, "demo/nebula-builder");
const output = path.join(root, "platform/public/studio");
const scripts = [
  "shop-context.js",
  "config.js",
  "asset-meta.js",
  "embedded-loader.js",
  "dome-engine-v2.js",
  "template-engine.js",
  "geometry.js",
  "fall.js",
  "fall-details.js",
  "romance.js",
  "halloween-layout.js",
  "halloween.js",
  "classic-recipes.js",
  "pink-recipe.js",
  "rose-artwork.js",
  "lily-arrangement.js",
  "sunflower-arrangement.js",
  "gift-options.js",
  "infill-layout.js",
  "midnight-artwork.js",
  "crimson-arrangement.js",
  "celebration-arrangement.js",
  "classic-wrapping.js",
  "reference-flowers.js",
  "filler-options.js",
  "customization.js",
  "customization-ui.js",
  "floral-lettering.js",
  "model.js",
  "i18n.js",
  "i18n-v6.js",
  "renderer.js",
  "design-link.js",
  "saved-bouquets.js",
  "request.js",
  "peony.js",
];
const engineFiles = [
  "config.js",
  "dome-engine-v2.js",
  "template-engine.js",
  "geometry.js",
  "model.js",
  "renderer.js",
  "design-link.js",
  "saved-bouquets.js",
  "app.js",
];
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const shared = path.join(root, "platform/shared");
const satinSource = path.join(root, "clients/raysbouquetz");
const policyScripts = scripts.filter(
  (file) =>
    ![
      "shop-context.js",
      "embedded-loader.js",
      "customization-ui.js",
      "renderer.js",
      "i18n.js",
      "i18n-v6.js",
      "design-link.js",
      "saved-bouquets.js",
      "request.js",
    ].includes(file),
);

// The policy uses the renderer's own validation, geometry and price functions.
// Wrapping their unchanged source in a factory avoids eval and shared mutable
// globals, so this module works in Workers and in the browser.
function buildPolicyRuntime() {
  const ctx = {
    console,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    structuredClone,
    setTimeout,
    clearTimeout,
    location: {
      protocol: "https:",
      hostname: "localhost",
      pathname: "/studio/studio.html",
      search: "",
      hash: "",
    },
    localStorage: {
      setItem() {},
      getItem() {
        return null;
      },
    },
    history: { replaceState() {} },
    document: {
      addEventListener() {},
      getElementById() {
        return null;
      },
    },
    NebulaI18n: { en: {}, es: {} },
    NebulaRenderer: { exportCanvas() {} },
    NebulaShop: { key: (x) => x },
    NEBULA_SHOP: {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const pieces = [];
  for (const file of policyScripts) {
    const sourceText = fs.readFileSync(path.join(source, file), "utf8");
    new vm.Script(sourceText, { filename: file }).runInContext(ctx);
    const names = Object.keys(ctx).filter((key) =>
      /^(?:Nebula|NEBULA_|DomeEngine)/.test(key),
    );
    const bound = sourceText.replace(
      /\b(g|window|global)\.(Nebula\w+|NEBULA_\w+|DomeEngine)\s*=/g,
      (match, owner, key) => key + "=" + match,
    );
    pieces.push(
      "// " +
        file +
        ": global exports bound to this isolated factory.\n" +
        names.map((key) => "var " + key + "=window." + key + ";").join("\n") +
        "\n" +
        bound +
        "\n" +
        names.map((key) => "var " + key + "=window." + key + ";").join("\n"),
    );
  }
  const satinPricing = JSON.parse(
    fs.readFileSync(path.join(satinSource, "builder-preview.json"), "utf8"),
  ).pricing;
  const art = Object.fromEntries(
    JSON.parse(
      fs.readFileSync(
        path.join(satinSource, "generated-art-metadata.json"),
        "utf8",
      ),
    ).map((row) => [row.file, row]),
  );
  const satinHeader =
    "var RAY_BUILDER={platform:true,pricing:" +
    JSON.stringify(satinPricing) +
    ",recipes:[]};var RAY_STORE={designs:[]};var RAY_ART=" +
    JSON.stringify(art) +
    ";var RayPricing={convertCash:()=>({cadCents:0})};window.RAY_BUILDER=RAY_BUILDER;window.RAY_STORE=RAY_STORE;window.RAY_ART=RAY_ART;";
  const satinRuntime = fs.readFileSync(
    path.join(satinSource, "builder-runtime.js"),
    "utf8",
  );
  const header =
    '/* Generated from unchanged shared engines by build-platform.cjs. */\nexport function createRuntime(preset="fresh") {\nconst location={protocol:"https:",hostname:"localhost",pathname:"/studio/studio.html",search:"",hash:""};const localStorage={setItem(){},getItem(){return null;}};const history={replaceState(){}};const document={addEventListener(){},getElementById(){return null;}};const window={NEBULA_SHOP:{},NebulaI18n:{en:{},es:{}},NebulaRenderer:{exportCanvas(){}},NebulaShop:{key:x=>x}};var NebulaI18n=window.NebulaI18n,NebulaRenderer=window.NebulaRenderer,NebulaShop=window.NebulaShop;\n';
  fs.mkdirSync(shared, { recursive: true });
  fs.writeFileSync(
    path.join(shared, "runtime.mjs"),
    header +
      pieces.join("\n") +
      '\nconst freshPrice=NebulaModel.price;\nif(preset==="satin"){\n' +
      satinHeader +
      "\n" +
      satinRuntime +
      "\nNebulaCustomization=window.NebulaCustomization;NebulaRoseArt=window.NebulaRoseArt;NebulaModel.price=freshPrice;\n}\nreturn {CAT:NebulaConfig.CAT,CONFIG:NebulaConfig.CONFIG,Model:NebulaModel,Geometry:NebulaGeometry,Templates:NebulaTemplates,Details:NebulaDetails,Satin:window.RayBuilder};\n}\n",
  );
  write("satin/builder-runtime.js", satinRuntime);
  write("satin/runtime-data.js", satinHeader);
  const assetNames = new Set([
    ...Object.keys(art).filter((file) =>
      /^(?:satin-|foam-|wrap-triangle-|bow-lilac-|graduation-cap-)/.test(file),
    ),
    "satin-rose-red-glitter-v1.png",
  ]);
  for (const file of assetNames) {
    assert.match(file, /^[a-z0-9-]+\.png$/);
    write(
      "satin/art/" + file,
      fs.readFileSync(path.join(satinSource, "public/art", file)),
    );
  }
  write(
    "satin/builder-theme.css",
    fs.readFileSync(path.join(satinSource, "builder-theme.css")),
  );
  write(
    "assets/money/folded-dollar-v1.png",
    fs.readFileSync(path.join(source, "assets/money/folded-dollar-v1.png")),
  );
  return { art, satinPricing };
}

function addSatinCatalog(catalog) {
  const code = fs
    .readFileSync(path.join(shared, "runtime.mjs"), "utf8")
    .replace("export function createRuntime", "function createRuntime");
  const ctx = {
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    structuredClone,
    setTimeout,
    clearTimeout,
    console,
  };
  vm.runInNewContext(
    code + '\nglobalThis.runtime=createRuntime("satin");',
    ctx,
  );
  const runtime = ctx.runtime,
    { Model: M, Satin: B } = runtime;
  const id = (raw) => "satin_" + raw;
  const flowerIds = [
    ...B.flowers.map((row) => row[0]),
    ...B.notes.keys(),
    "__choc",
  ];
  for (const rawId of flowerIds) {
    const row = runtime.CAT[rawId];
    catalog.flowers.push({
      id: id(rawId),
      runtimeId: rawId,
      en: row.en,
      family: row.family,
      preset: "satin",
      ...(rawId === "foam_rose_white" ? { optional: true } : {}),
      priceCents: ["rose", "foam"].includes(row.family) ? row.priceCents : null,
      classic: false,
      modes: ["dome", "heart"],
      image:
        "/studio/" +
        (B.notes.has(rawId)
          ? "assets/money/folded-dollar-v1.png"
          : "satin/" +
            (rawId === "__choc"
              ? "../assets/finishes/extra_chocolate_gold.webp"
              : runtime.Satin.flowers.find((row) => row[0] === rawId)
                ? "art/" +
                  runtime.Satin.flowers.find((row) => row[0] === rawId)[4]
                : "")),
    });
  }
  const pricing = JSON.parse(
    fs.readFileSync(path.join(satinSource, "builder-preview.json"), "utf8"),
  ).pricing;
  for (const rawId of [
    "butterfly",
    "crown",
    "sash",
    ...Object.keys(runtime.Details.types),
  ])
    catalog.extras.push({
      id: id(rawId),
      runtimeId: rawId,
      label:
        {
          bow_lilac: "Lilac satin bow",
          bow_black: "Black satin bow",
          graduation_cap: "Graduation cap",
          snoopy: "Snoopy plush",
          kitty: "Kitty plush",
          snoopy_topper: "Snoopy topper",
        }[rawId] || rawId[0].toUpperCase() + rawId.slice(1),
      preset: "satin",
      priceCents: pricing.extrasCents[rawId] ?? null,
    });
  function canonical(s) {
    const convert = (value) => id(value);
    for (const item of s.items) item.id = convert(item.id);
    s.template.palette = s.template.palette.map(convert);
    s.template.accent.id = convert(s.template.accent.id);
    for (const key of ["wall", "fill", "center"])
      s.template.zones[key] = convert(s.template.zones[key]);
    for (const key of Object.keys(s.template.overrides))
      if (s.template.overrides[key] !== null)
        s.template.overrides[key] = convert(s.template.overrides[key]);
    for (const detail of s.finishes.decorations) detail.id = id(detail.id);
    return s;
  }
  for (const [slug, name, mode, count, palette, paper, cover] of [
    [
      "pastel-cloud",
      "Pastel satin cloud",
      "dome",
      30,
      ["rose_pink", "rose_blue", "rose_peach"],
      "custom",
      "satin-rose-pink-v1.png",
    ],
    [
      "ruby-celebration",
      "Ruby satin celebration",
      "dome",
      18,
      ["rose_red_glitter"],
      "black",
      "satin-rose-red-glitter-v1.png",
    ],
    [
      "ivory-keepsake",
      "Ivory keepsake",
      "dome",
      30,
      ["rose_ivory"],
      "ivory",
      "satin-rose-ivory-v1.png",
    ],
    [
      "purple-promise",
      "Purple promise",
      "dome",
      30,
      ["rose_violet", "rose_lilac"],
      "custom",
      "satin-rose-purple-v1.png",
    ],
    [
      "pink-heart",
      "Pink satin heart",
      "heart",
      41,
      ["rose_pink"],
      "black",
      "satin-rose-pink-v1.png",
    ],
    [
      "ruby-heart",
      "Ruby satin heart",
      "heart",
      41,
      ["rose_red"],
      "black",
      "satin-rose-red-v1.png",
    ],
  ]) {
    const s = M.defaultMode(mode);
    M.resize(s, count);
    s.template.palette = [...palette];
    s.template.accent.id = palette[0];
    for (const key of ["wall", "fill", "center"])
      s.template.zones[key] = palette[key === "fill" ? palette.length - 1 : 0];
    s.finishes.paper = paper;
    s.title = name;
    M.syncTemplate(s);
    assert.ok(M.validate(s), "Invalid satin recipe " + slug);
    canonical(s);
    const counts = {};
    for (const item of s.items) counts[item.id] = (counts[item.id] || 0) + 1;
    catalog.recipes.push({
      id: "satin-" + slug,
      name,
      en: name,
      description: name + " with triangular paper wrapping.",
      mode,
      preset: "satin",
      cover: "/studio/satin/art/" + cover,
      counts,
      design: s,
    });
  }
  const foam = referenceRecipes.foam;
  const s = M.defaultMode("dome");
  M.resize(s, foam.capacity, "foam_rose_white");
  const white = "foam_rose_white";
  s.template.palette = [white];
  s.template.accent.id = white;
  for (const key of ["wall", "fill", "center"]) s.template.zones[key] = white;
  s.template.overrides = {};
  s.title = foam.name;
  Object.assign(s.finishes, {
    paper: foam.paper, tint: foam.tint, sash: foam.sash, sashText: foam.message,
  });
  M.syncTemplate(s);
  assert.ok(M.validate(s), "Invalid Aqua Keepsake recipe");
  catalog.recipes.push(referenceRecipes.catalogRecipe(foam, canonical(s), "satin"));
}

function write(file, bytes) {
  const target = path.resolve(output, file);
  assert.ok(
    target.startsWith(output + path.sep),
    "Output must stay inside studio",
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}

function referenceRuntime() {
  const listeners = [];
  const ctx = {
    console,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    structuredClone,
    setTimeout,
    clearTimeout,
    location: {
      protocol: "https:",
      hostname: "localhost",
      pathname: "/studio/studio.html",
      search: "",
    },
    document: {
      addEventListener(type, fn) {
        if (type === "DOMContentLoaded") listeners.push(fn);
      },
      getElementById() {
        return null;
      },
    },
    NEBULA_SHOP: { id: "platform-build", demo: true },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const file of scripts.filter((file) => file !== "renderer.js")) {
    new vm.Script(fs.readFileSync(path.join(source, file), "utf8"), {
      filename: file,
    }).runInContext(ctx);
  }
  for (const callback of listeners) callback();
  return ctx;
}

function runtimeCatalog() {
  const ctx = referenceRuntime();
  const recipes = JSON.parse(
    fs.readFileSync(
      path.join(root, "builder/shop-factory/library.json"),
      "utf8",
    ),
  ).recipes.filter((row) => row.id !== "money-bloom");
  for (const row of recipes) {
    assert.ok(
      ctx.NebulaLink.decode(row.code)?.design,
      "Invalid library design: " + row.id,
    );
    assert.ok(
      fs.existsSync(
        path.join(root, "builder/shop-factory/covers", row.id + ".webp"),
      ),
      "Missing cover: " + row.id,
    );
  }
  const catalog = {
    version: 2,
    presets: [
      { id: "fresh", name: "Fresh flowers", available: true },
      { id: "satin", name: "Satin and eternal flowers", available: true },
      { id: "mixed", name: "Fresh + satin flowers", available: true },
    ],
    flowers: Object.entries(ctx.NebulaConfig.CAT).map(([id, row]) => ({
      id,
      en: row.en,
      family: row.family,
      priceCents: row.priceCents,
      classic: row.classic === true && row.classicOffered !== false,
      preset: "fresh",
      runtimeId: id,
      ...(row.optional ? { optional: true } : {}),
      modes: [
        ...(row.classic === true && row.classicOffered !== false
          ? ["classic"]
          : []),
        ...(row.top !== false ? ["dome", "heart"] : []),
      ],
      image: "/studio/" + ctx.NEBULA_META.flowers[id]?.head,
    })),
    extras: Object.entries(ctx.NebulaConfig.CONFIG.extrasCents).map(
      ([id, priceCents]) => ({
        id,
        label:
          id === "filler" ? "Baby’s breath"
            : id === "whiteLilyBud" ? ctx.NebulaReferenceFlowers.whiteBud.label
            : ctx.NebulaI18n.en[id] || id.replaceAll("_", " "),
        priceCents,
        preset: "fresh",
        ...(id === "whiteLilyBud" ? { optional: true, image: "/studio/" + ctx.NebulaReferenceFlowers.whiteBud.url } : {}),
      }),
    ),
    recipes: recipes.map((row) => ({
      id: row.id,
      name: row.en,
      en: row.en,
      description: row.description,
      mode: row.mode,
      preset: "fresh",
      cover: "/studio/assets/catalog/thumbs/" + row.id + ".webp",
      design: ctx.NebulaLink.decode(row.code).design,
      counts: row.counts,
    })),
  };
  return { catalog, recipes, ctx };
}

function build() {
  fs.mkdirSync(output, { recursive: true });
  buildPolicyRuntime();
  const { catalog, recipes, ctx } = runtimeCatalog();
  addSatinCatalog(catalog);
  for (const spec of referenceRecipes.fresh) {
    const design = referenceRecipes.prepareFresh(spec, ctx);
    assert.ok(design, "Invalid reference bouquet " + spec.id);
    catalog.recipes.push(referenceRecipes.catalogRecipe(spec, design, "fresh"));
  }
  const midnightClassic = referenceRecipes.midnightClassic;
  const classicDesign = referenceRecipes.prepareClassic(midnightClassic, ctx);
  assert.ok(classicDesign, "Invalid Classic Midnight Orchard");
  catalog.recipes.push(referenceRecipes.catalogRecipe(midnightClassic, classicDesign, "fresh"));
  for (const spec of [...referenceRecipes.fresh, referenceRecipes.foam, midnightClassic]) {
    const file = path.join(root, "builder/shop-factory/covers", spec.id + ".webp");
    write("assets/catalog/thumbs/" + spec.id + ".webp", fs.readFileSync(file));
  }
  const hashes = {};
  for (const file of [...scripts, "app.js", "app.css"]) {
    const bytes = fs.readFileSync(path.join(source, file));
    if (file.endsWith(".js"))
      new vm.Script(bytes.toString("utf8"), { filename: file });
    write(file, bytes);
    hashes[file] = sha(bytes);
  }
  // Asset paths come from the existing public build manifest. No repository tree,
  // customer intake, old pages, tests, source artwork, or credentials are copied.
  const manifest = JSON.parse(
    fs.readFileSync(path.join(source, "build-manifest.json"), "utf8"),
  );
  const image = /^assets\/[a-zA-Z0-9/._-]+\.(?:png|webp|jpe?g|svg|woff2?)$/;
  let assetCount = 0;
  for (const file of Object.keys(manifest.files).filter((file) =>
    image.test(file),
  )) {
    const bytes = fs.readFileSync(path.join(source, file));
    write(file, bytes);
    assetCount++;
  }
  for (const row of recipes)
    write(
      "assets/catalog/thumbs/" + row.id + ".webp",
      fs.readFileSync(
        path.join(root, "builder/shop-factory/covers", row.id + ".webp"),
      ),
    );
  const adapter = fs.readFileSync(
    path.join(root, "platform/builder-adapter.js"),
  );
  write("builder-adapter.js", adapter);
  for (const file of ["policy.mjs", "runtime.mjs"])
    fs.writeFileSync(
      path.join(root, "platform/public", file),
      fs.readFileSync(path.join(shared, file)),
    );
  write("library.json", JSON.stringify({ version: 1, recipes }) + "\n");
  const satinScripts = scripts.filter((file) =>
    [
      "shop-context.js",
      "config.js",
      "asset-meta.js",
      "embedded-loader.js",
      "dome-engine-v2.js",
      "template-engine.js",
      "geometry.js",
      "fall.js",
      "fall-details.js",
      "romance.js",
      "halloween-layout.js",
      "halloween.js",
      "classic-recipes.js",
      "model.js",
      "i18n.js",
      "i18n-v6.js",
      "renderer.js",
      "design-link.js",
      "saved-bouquets.js",
      "request.js",
    ].includes(file),
  );
  write(
    "satin/runtime-manifest.json",
    JSON.stringify(
      { scripts: satinScripts, app: "satin/app.js", satin: true },
      null,
      2,
    ) + "\n",
  );
  const originalApp = fs.readFileSync(path.join(source, "app.js"), "utf8");
  const bankLoop =
    "for(const mode of ['classic','dome','heart'])if(!banks[mode])";
  assert.ok(
    originalApp.includes(bankLoop),
    "Recheck the satin mode-bank integration.",
  );
  write(
    "satin/app.js",
    originalApp.replace(
      bankLoop,
      "for(const mode of ['dome','heart'])if(!banks[mode])",
    ),
  );
  write(
    "runtime-manifest.json",
    JSON.stringify({ scripts, app: "app.js", hashes }, null, 2) + "\n",
  );
  let html = fs
    .readFileSync(path.join(source, "studio.html"), "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, "")
    .replace(/<meta\b[^>]*property="og:[^>]*>/gi, "")
    .replace(/\s*<details id="aboutBlock"[\s\S]*?<\/details>/, "")
    .replace(/\s*<div class="move-toolbar">[^\n]*?<\/div>/, "")
    .replace(
      /<title>[\s\S]*?<\/title>/,
      "<title>Your collection studio — Nebula</title>",
    )
    .replace("assets/brand/nebula-logo.jpg", "assets/brand/logo-mark.webp")
    .replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
  html = html
    .replace(
      "</head>",
      '<link rel="stylesheet" href="app.css"><style>' +
        "[hidden]{display:none!important}body.platform-loading>header,body.platform-loading>main,body.platform-loading>footer,body.platform-loading>.studio-credit{visibility:hidden}" +
        "#orderButton,#orderDialog,#smsDialog,#orderSend,#smsOpen,.order-dialog{display:none!important}" +
        ".platform-bar{padding:14px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:#f2e8e3;color:#672a3f;border-bottom:1px solid #e7dfd8}" +
        ".platform-bar p{margin:0;flex:1;min-width:180px;font-size:14px}.platform-bar a{color:inherit}.platform-bar button{font:inherit}" +
        ".platform-status{max-width:650px;margin:12vh auto;padding:28px;line-height:1.6}.platform-status h1{font:32px Georgia}" +
        "#platformSaveStatus{font-size:13px;flex-basis:100%}#platformSaveCollection{white-space:nowrap}" +
        "#platformSaveStatus:empty{display:none}" +
        "@media(max-width:820px){.platform-bar{display:grid;grid-template-columns:1fr auto;padding:8px 12px;gap:5px 10px;flex-shrink:0;font-size:12px}.platform-bar p{grid-column:1/-1;grid-row:2;font-size:10px;line-height:1.4;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.platform-bar button{width:auto;min-height:40px;padding:8px 12px;font-size:12px}.platform-bar #platformSaveStatus{grid-column:1/-1;font-size:11px;line-height:1.4}body[data-organic=true]:not(.preview-focus) .art-surface,body[data-berry-dome=true]:not(.preview-focus) .art-surface{height:clamp(196px,25dvh,245px)}body.preview-focus .platform-bar{display:none}.platform-bar input,.platform-bar select{font-size:16px;min-height:44px;min-width:0;max-width:100%;grid-column:1/-1}.platform-bar button,.platform-bar>a{min-height:44px}.platform-bar>a{display:flex;align-items:center}.platform-bar p{font-size:12px}.platform-bar #platformSaveStatus{overflow-wrap:anywhere}}" +
        '</style><script type="module" src="builder-adapter.js"></script></head>',
    )
    .replace(
      "<body>",
      '<body class="platform-studio platform-loading"><section id="platformBoot" class="platform-status" role="status"><h1>Opening your collection studio…</h1><p>Loading your signed-in shop and saved design.</p></section>',
    )
    .replace(
      "</body>",
      '<noscript><p class="platform-status">Sign in and enable JavaScript to edit your shop’s collection.</p></noscript></body>',
    );
  write("studio.html", html);
  require("node:child_process").execFileSync(
    "python",
    [path.join(__dirname, "optimize-platform-art.py")],
    { stdio: "inherit" },
  );
  const delivery = JSON.parse(
    fs.readFileSync(path.join(output, "satin/art-delivery.json"), "utf8"),
  );
  for (const rows of [catalog.flowers, catalog.recipes])
    for (const row of rows) {
      for (const key of ["image", "cover"]) {
        const file = row[key]?.split("/").pop();
        if (row[key]?.startsWith("/studio/satin/art/") && delivery[file])
          row[key] = "/studio/satin/art/" + delivery[file];
      }
    }
  fs.writeFileSync(
    path.join(root, "platform/public/catalog.json"),
    JSON.stringify(catalog, null, 2) + "\n",
  );
  for (const file of engineFiles)
    assert.equal(
      sha(fs.readFileSync(path.join(output, file))),
      sha(fs.readFileSync(path.join(source, file))),
      "Engine changed while staging: " + file,
    );
  console.log(
    "Built shared studio: " +
      scripts.length +
      " unchanged runtime scripts, " +
      assetCount +
      " artwork assets, " +
      catalog.recipes.filter(row => row.preset === "fresh").length +
      " fresh recipes. Engine identity and syntax checks passed.",
  );
  return { catalog, scripts, engineFiles, output };
}

if (require.main === module) build();
module.exports = { build, runtimeCatalog, scripts, engineFiles };
