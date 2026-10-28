/* Shared owner studio. Only the explicit runtime and artwork allowlist is public. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");

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

function write(file, bytes) {
  const target = path.resolve(output, file);
  assert.ok(
    target.startsWith(output + path.sep),
    "Output must stay inside studio",
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}

function runtimeCatalog() {
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
    version: 1,
    presets: [
      { id: "fresh", name: "Fresh flowers", available: true },
      { id: "satin", name: "Satin and eternal flowers", available: false },
    ],
    flowers: Object.entries(ctx.NebulaConfig.CAT).map(([id, row]) => ({
      id,
      en: row.en,
      family: row.family,
      priceCents: row.priceCents,
      classic: row.classic === true && row.classicOffered !== false,
      preset: "fresh",
      image: "/studio/" + ctx.NEBULA_META.flowers[id]?.head,
    })),
    extras: Object.entries(ctx.NebulaConfig.CONFIG.extrasCents).map(
      ([id, priceCents]) => ({
        id,
        label: ctx.NebulaI18n.en[id] || id.replaceAll("_", " "),
        priceCents,
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
    })),
  };
  return { catalog, recipes };
}

function build() {
  fs.mkdirSync(output, { recursive: true });
  const { catalog, recipes } = runtimeCatalog();
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
  write("library.json", JSON.stringify({ version: 1, recipes }) + "\n");
  write(
    "runtime-manifest.json",
    JSON.stringify({ scripts, app: "app.js", hashes }, null, 2) + "\n",
  );
  let html = fs
    .readFileSync(path.join(source, "studio.html"), "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, "")
    .replace(/<meta\b[^>]*property="og:[^>]*>/gi, "")
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
        "@media(max-width:820px){.platform-bar{display:grid;grid-template-columns:1fr auto;padding:8px 12px;gap:5px 10px;flex-shrink:0;font-size:12px}.platform-bar p{grid-column:1/-1;grid-row:2;font-size:10px;line-height:1.4;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.platform-bar button{width:auto;min-height:40px;padding:8px 12px;font-size:12px}.platform-bar #platformSaveStatus{grid-column:1/-1;font-size:11px;line-height:1.4}body[data-organic=true]:not(.preview-focus) .art-surface,body[data-berry-dome=true]:not(.preview-focus) .art-surface{height:clamp(196px,25dvh,245px)}body.preview-focus .platform-bar{display:none}}" +
        '</style><script type="module" src="builder-adapter.js"></script></head>',
    )
    .replace(
      "<body>",
      '<body class="platform-loading"><section id="platformBoot" class="platform-status" role="status"><h1>Opening your collection studio…</h1><p>Loading your signed-in shop and saved design.</p></section>',
    )
    .replace(
      "</body>",
      '<noscript><p class="platform-status">Sign in and enable JavaScript to edit your shop’s collection.</p></noscript></body>',
    );
  write("studio.html", html);
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
      recipes.length +
      " fresh recipes. Engine identity and syntax checks passed.",
  );
  return { catalog, scripts, engineFiles, output };
}

if (require.main === module) build();
module.exports = { build, runtimeCatalog, scripts, engineFiles };
