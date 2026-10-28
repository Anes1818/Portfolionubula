/* Owner collection adapter. The shared bouquet engines are loaded byte-for-byte. */
const byId = (id) => document.getElementById(id);
const clone = (value) => JSON.parse(JSON.stringify(value));
const cents = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= 100000000;
const clean = (value, max) =>
  typeof value === "string" &&
  value.length <= max &&
  !/[\u0000-\u001f<>]/.test(value);
let currentShop, currentCard, session, saveButton, saveStatus;

function message(title, text, { login = false } = {}) {
  const host = byId("platformBoot");
  host.hidden = false;
  host.replaceChildren();
  const heading = document.createElement("h1"),
    detail = document.createElement("p");
  heading.textContent = title;
  detail.textContent = text;
  const back = document.createElement("a");
  back.textContent = login ? "Sign in to continue" : "Back to my collection";
  back.href = login
    ? "/login?returnTo=" +
      encodeURIComponent(location.pathname + location.search)
    : "/dashboard/collection" +
      (currentShop ? "?shop=" + encodeURIComponent(currentShop.id) : "");
  host.append(heading, detail, back);
}

async function loadJson(file) {
  const response = await fetch(new URL(file, import.meta.url), {
    credentials: "same-origin",
  });
  if (!response.ok)
    throw Error("The shared studio files could not load. Please reload.");
  return response.json();
}

function validateShop(shop, catalog, expectedId) {
  if (
    !shop ||
    shop.id !== expectedId ||
    !/^[A-Za-z0-9_-]{1,60}$/.test(shop.id) ||
    !Number.isSafeInteger(shop.version) ||
    shop.version < 1 ||
    !shop.draft ||
    typeof shop.draft !== "object" ||
    Array.isArray(shop.draft)
  )
    throw Error(
      "The shop profile could not be verified. Return to your dashboard and reopen the studio.",
    );
  const draft = shop.draft;
  if (
    !clean(draft.name, 80) ||
    !draft.name.trim() ||
    !["fresh", "satin"].includes(draft.preset) ||
    !/^[A-Z]{3}$/.test(draft.currency) ||
    !Array.isArray(draft.collection) ||
    draft.collection.length > 4
  )
    throw Error(
      "Finish your shop name, currency and collection before opening its studio.",
    );
  const format = new Intl.NumberFormat("en", {
    style: "currency",
    currency: draft.currency,
  }).resolvedOptions();
  if (format.maximumFractionDigits !== 2 || format.minimumFractionDigits !== 2)
    throw Error(
      "This studio currently supports currencies with two decimal places.",
    );
  const prices = (value, known) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    return Object.entries(value).every(
      ([id, amount]) => known.has(id) && (amount === null || cents(amount)),
    );
  };
  const flowers = new Set(catalog.flowers.map((row) => row.id));
  const extras = new Set(catalog.extras.map((row) => row.id));
  if (
    draft.preset === "fresh" &&
    (!prices(draft.flowerPrices, flowers) ||
      !prices(draft.extrasCents, extras) ||
      !Array.isArray(draft.disabledFlowers) ||
      draft.disabledFlowers.some((id) => !flowers.has(id)))
  )
    throw Error(
      "The shop catalogue needs attention. Review its offered flowers and prices.",
    );
  if (
    draft.collection.some(
      (card) =>
        !card ||
        !clean(card.id, 80) ||
        !clean(card.title, 100) ||
        !(
          typeof card.recipeId === "string" ||
          (card.recipeId === null &&
            card.design &&
            typeof card.design === "object")
        ),
    )
  )
    throw Error("The saved collection could not be verified.");
  return shop;
}

function installPreviewLock() {
  const blocked =
    "#orderButton,#orderForm,#orderSend,#smsOpen,#smsCopy,#smsMessage," +
    '[href^="sms:"],[href^="tel:"],[href^="mailto:"],[href^="https://wa.me/"],' +
    '[href^="https://api.whatsapp.com/"]';
  document.addEventListener(
    "click",
    (event) => {
      if (event.target.closest?.(blocked)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  document.addEventListener(
    "submit",
    (event) => {
      if (event.target.id === "orderForm") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  const form = byId("orderForm");
  if (form) {
    form.inert = true;
    for (const input of form.elements) input.disabled = true;
  }
}

function script(file) {
  return new Promise((resolve, reject) => {
    const node = document.createElement("script");
    node.src = new URL(file, import.meta.url).href;
    node.async = false;
    node.onload = resolve;
    node.onerror = () =>
      reject(
        Error("The shared studio could not load " + file + ". Please reload."),
      );
    document.head.append(node);
  });
}

function configureRuntime(profile, library, initial) {
  const { CAT, CONFIG } = window.NebulaConfig;
  const offered = (id) =>
    cents(profile.flowerPrices[id]) && !profile.disabledFlowers.includes(id);
  for (const [id, row] of Object.entries(CAT)) {
    if (cents(profile.flowerPrices[id]))
      row.priceCents = profile.flowerPrices[id];
    if (!offered(id)) row.classic = row.classicOffered = row.top = false;
  }
  Object.assign(
    CONFIG.extrasCents,
    Object.fromEntries(
      Object.entries(profile.extrasCents).filter(([, amount]) => cents(amount)),
    ),
  );
  // Contact details never enter the renderer, download metadata, or request code.
  CONFIG.recipient = CONFIG.whatsapp = CONFIG.email = "";
  CONFIG.studio.phone = CONFIG.studio.instagram = "";
  const extraSource = {
    interiorGreenery: "eucalyptus",
    greenRim: "eucalyptus",
    lily_bud: "lily_bud",
    whiteSprays: "white_flower_spray",
  };
  const extraAllowed = (id) => cents(profile.extrasCents[id]);
  const assess = (state) => {
    if (
      !state ||
      state.photographic ||
      !state.items.every((item) => offered(item.id))
    )
      return { ok: false, restricted: true, reason: "unsupported" };
    for (const line of NebulaModel.price(state).extraLines) {
      const flower = extraSource[line.id];
      if (
        flower
          ? !offered(flower)
          : !extraAllowed(line.id === "breathBorder" ? "filler" : line.id)
      )
        return { ok: false, restricted: true, reason: "unsupported" };
    }
    return { ok: true, restricted: false };
  };
  Object.assign(NebulaShop, {
    restricted: false,
    assess,
    modeAllowed: () => true,
    recipeAllowed: (id) =>
      id === "platform-card" || library.some((row) => row.id === id),
    message: () =>
      "This design uses an unavailable flower or an extra without a price. Review your shop catalogue.",
  });
  const libraries = [NebulaClassic, NebulaRomance, NebulaSpooky, NebulaFall];
  for (const collection of libraries) {
    const original = collection.create;
    collection.create = (id) => {
      if (id === "platform-card") return NebulaModel.clone(initial);
      const entry = library.find((row) => row.id === id);
      return entry ? NebulaLink.decode(entry.code)?.design : original(id);
    };
  }
  NebulaRomance.recipes.push({
    id: "platform-card",
    en: currentCard.title,
    es: currentCard.title,
    count: initial.items.length,
    mode: initial.mode,
  });
  for (const entry of library)
    if (
      !libraries.some((collection) =>
        collection.recipes.some((row) => row.id === entry.id),
      )
    )
      NebulaRomance.recipes.push({
        id: entry.id,
        en: entry.en,
        es: entry.es,
        count: Object.values(entry.counts).reduce((a, b) => a + b, 0),
        mode: entry.mode,
      });
  for (const [lang, copy] of Object.entries({
    en: {
      studio: "YOUR COLLECTION STUDIO",
      demoEstimate: "DRAFT ESTIMATE",
      separateHint:
        "Choose flowers → explore your estimate → save to your collection",
      saveHint:
        "Download an image or an editable copy. Save to your collection using the button above.",
      priceDisclaimer:
        "Owner preview. These are your draft prices. No customer order or payment is created.",
      orderNoShop: "Orders are disabled in the owner studio.",
    },
    es: {
      studio: "ESTUDIO DE TU COLECCIÓN",
      demoEstimate: "ESTIMACIÓN DEL BORRADOR",
      separateHint:
        "Elige flores → revisa la estimación → guarda en tu colección",
      saveHint:
        "Descarga una imagen o una copia editable. Guarda en tu colección con el botón superior.",
      priceDisclaimer:
        "Vista del propietario. Son precios de borrador. No se crea ningún pedido ni pago.",
      orderNoShop: "Los pedidos están desactivados en este estudio.",
    },
  }))
    Object.assign(NebulaI18n[lang], copy);
  if (window.NebulaRequest)
    Object.assign(NebulaRequest, {
      recipient: () => "",
      url: () => {
        throw Error("Orders are disabled in this preview.");
      },
      compose: () => {
        throw Error("Orders are disabled in this preview.");
      },
    });
  if (window.NebulaCustomizationUI) {
    const render = NebulaCustomizationUI.render;
    NebulaCustomizationUI.render = (...args) => {
      render(...args);
      document.querySelectorAll("[data-detail]").forEach((node) => {
        if (!extraAllowed(node.dataset.detail)) node.hidden = true;
      });
    };
  }
  return assess;
}

function toolbar() {
  const bar = document.createElement("aside");
  bar.className = "platform-bar";
  const back = document.createElement("a"),
    notice = document.createElement("p");
  back.href =
    "/dashboard/collection?shop=" + encodeURIComponent(currentShop.id);
  back.textContent = "← My collection";
  notice.textContent =
    "Owner preview · " +
    currentCard.title +
    " · Orders and payments are disabled.";
  saveButton = document.createElement("button");
  saveButton.id = "platformSaveCollection";
  saveButton.type = "button";
  saveButton.className = "button primary small";
  saveButton.textContent = "Save to my collection";
  saveButton.addEventListener("click", saveCollection);
  saveStatus = document.createElement("span");
  saveStatus.id = "platformSaveStatus";
  saveStatus.setAttribute("role", "status");
  saveStatus.setAttribute("aria-live", "polite");
  bar.append(back, notice, saveButton, saveStatus);
  document.body.prepend(bar);
  const browse = byId("browseTemplates");
  if (browse) {
    browse.removeAttribute("data-i18n");
    browse.href = back.href;
    browse.textContent = "My collection";
  }
  document.querySelector(".brand").href = back.href;
  return bar;
}

async function saveCollection() {
  if (!NebulaApp.ready || saveButton.disabled) return;
  saveButton.disabled = true;
  saveStatus.textContent = "Saving your exact bouquet design…";
  try {
    const design = clone(NebulaApp.state);
    if (!NebulaShop.assess(design).ok) throw Error(NebulaShop.message());
    if (new TextEncoder().encode(JSON.stringify(design)).length > 24576)
      throw Error(
        "This design is too large for a collection card. Download an editable copy before simplifying it.",
      );
    const draft = clone(currentShop.draft);
    const card = draft.collection.find((row) => row.id === currentCard.id);
    if (!card)
      throw Error(
        "This collection card was removed. Download your design before returning to your collection.",
      );
    card.design = design;
    const result = await session.api(
      "/api/shops/" + encodeURIComponent(currentShop.id) + "/draft",
      {
        method: "PUT",
        body: { version: currentShop.version, draft },
      },
    );
    if (
      !result.shop ||
      result.shop.id !== currentShop.id ||
      !Number.isSafeInteger(result.shop.version) ||
      result.shop.version <= currentShop.version
    )
      throw Error(
        "The save could not be confirmed. Your current design remains in this browser.",
      );
    currentShop = result.shop;
    currentCard = currentShop.draft.collection.find(
      (row) => row.id === currentCard.id,
    );
    saveStatus.textContent =
      "Saved to your collection. Your cover and other shop settings are unchanged.";
    window.NebulaPlatformStudio.version = currentShop.version;
  } catch (error) {
    if (error.status === 409 || error.statusCode === 409) {
      try {
        localStorage.setItem(
          NebulaShop.key("platformConflict:" + currentCard.id),
          JSON.stringify({
            at: Date.now(),
            version: currentShop.version,
            design: NebulaApp.state,
          }),
        );
      } catch {}
      saveStatus.textContent =
        "Your shop changed in another tab. This design is kept here; download an editable copy, then reopen the latest collection before saving. Nothing was overwritten.";
      saveButton.dataset.conflict = "true";
    } else
      saveStatus.textContent =
        error.message ||
        "The save failed. Your design is still here; please retry.";
  } finally {
    saveButton.disabled = saveButton.dataset.conflict === "true";
  }
}

async function boot() {
  installPreviewLock();
  const params = new URLSearchParams(location.search);
  const shopId = params.get("shop"),
    cardId = params.get("card");
  if (
    !shopId ||
    !/^[A-Za-z0-9_-]{1,60}$/.test(shopId) ||
    !cardId ||
    cardId.length > 80
  )
    return message(
      "Choose a collection card first",
      "Open this studio from your shop’s collection so your design is saved to the right card.",
    );
  session = await import("/session.js");
  if (!(await session.getUser()))
    return message(
      "Sign in to open your shop studio",
      "Your draft collection is private to your shop account.",
      { login: true },
    );
  const result = await session.api("/api/shops/" + encodeURIComponent(shopId));
  const [catalog, manifest, library] = await Promise.all([
    loadJson("../catalog.json"),
    loadJson("runtime-manifest.json"),
    loadJson("library.json"),
  ]);
  currentShop = validateShop(result.shop, catalog, shopId);
  if (currentShop.draft.preset !== "fresh")
    return message(
      "Satin studio is being prepared",
      "Your satin collection is saved. Its compatible editing tools are being prepared; the fresh-flower editor will not change those designs.",
    );
  currentCard = currentShop.draft.collection.find((row) => row.id === cardId);
  if (!currentCard)
    return message(
      "This collection card is unavailable",
      "Return to your collection and open a current card.",
    );
  const draft = currentShop.draft;
  const scopeId = "platform-" + shopId.replaceAll("_", "-").toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(scopeId))
    throw Error("The shop storage scope is invalid.");
  window.NEBULA_SHOP = {
    id: scopeId,
    name: draft.name.trim(),
    byline: draft.tagline || "",
    currency: draft.currency,
    demo: true,
    baseCents: 0,
    laborCents: { classic: 0, dome: 0, heart: 0 },
    flowerPrices: clone(draft.flowerPrices),
    extrasCents: clone(draft.extrasCents),
    disabledFlowers: [...draft.disabledFlowers],
    disabledExtras: [],
    enabledModes: ["classic", "dome", "heart"],
    selectedRecipeIds: library.recipes.map((row) => row.id),
    requestChannel: "whatsapp",
    recipient: "",
    whatsapp: "",
    email: "",
    publicBaseUrl: location.origin + "/studio/",
    studio: {
      name: draft.name.trim(),
      site: location.hostname,
      phone: "",
      instagram: "",
      place: clean(draft.city, 80) ? draft.city : "",
      year: String(new Date().getFullYear()),
    },
    theme: { primary: draft.theme.primary, background: draft.theme.background },
  };
  // The original runtime accepts only local asset keys. Map a validated private
  // image to such a key in memory; no authenticated URL or token enters exports.
  const logoKey = "assets/brand/owner-logo.webp";
  if (draft.logoMediaId) {
    const response = await fetch(
      "/api/shops/" +
        encodeURIComponent(shopId) +
        "/media/" +
        encodeURIComponent(draft.logoMediaId),
      {
        headers: { Authorization: "Bearer " + (await session.token()) },
        cache: "no-store",
        credentials: "same-origin",
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok)
      throw Error(
        "Your shop logo could not load. Please retry from your dashboard.",
      );
    const url = URL.createObjectURL(await response.blob());
    window.NEBULA_EMBED = { [logoKey]: url };
    window.addEventListener("pagehide", () => URL.revokeObjectURL(url), {
      once: true,
    });
  } else {
    const mark = document.createElement("canvas");
    mark.width = mark.height = 160;
    const context = mark.getContext("2d");
    context.fillStyle = draft.theme.background;
    context.fillRect(0, 0, 160, 160);
    context.fillStyle = draft.theme.primary;
    context.font = "84px Georgia";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(draft.name.trim().slice(0, 1).toUpperCase(), 80, 85);
    window.NEBULA_EMBED = { [logoKey]: mark.toDataURL("image/png") };
  }
  window.NEBULA_SHOP.logo = logoKey;
  for (const [variable, value] of Object.entries({
    accent: draft.theme?.primary,
    bg: draft.theme?.background,
  }))
    if (/^#[0-9a-f]{6}$/i.test(value || ""))
      document.documentElement.style.setProperty("--" + variable, value);
  for (const file of manifest.scripts) await script(file);
  const recipe = library.recipes.find((row) => row.id === currentCard.recipeId);
  const initial =
    currentCard.design === null
      ? recipe && NebulaLink.decode(recipe.code)?.design
      : NebulaModel.validate(currentCard.design);
  if (!initial)
    throw Error(
      "This card’s saved recipe could not be opened. Return to your collection and choose a supported recipe.",
    );
  if (currentCard.design === null && currentCard.title)
    initial.title = currentCard.title;
  const assess = configureRuntime(window.NEBULA_SHOP, library.recipes, initial);
  if (!assess(initial).ok)
    throw Error(
      "This card uses an unavailable flower or an extra without a price. Update your shop catalogue before editing it.",
    );
  // The card is the authoritative entry design. Shared URLs cannot configure a
  // shop or replace another collection card silently.
  const url = new URL(location.href);
  url.searchParams.delete("saved");
  url.searchParams.set("template", "platform-card");
  url.hash = "";
  history.replaceState(null, "", url);
  // Existing artwork plugins register their labels for this lifecycle event.
  // They were deliberately loaded only after the authenticated profile arrived.
  document.dispatchEvent(new Event("DOMContentLoaded"));
  await script(manifest.app);
  window.NebulaPlatformStudio = {
    shopId,
    cardId,
    version: currentShop.version,
    preview: true,
  };
  toolbar();
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 45000;
    const check = () => {
      if (window.NebulaApp?.ready) return resolve();
      if (Date.now() >= deadline)
        return reject(
          Error(
            "The bouquet artwork could not load. Your saved collection is unchanged; please reload.",
          ),
        );
      setTimeout(check, 100);
    };
    check();
  });
  byId("platformBoot").hidden = true;
  document.body.classList.remove("platform-loading");
  document.title = draft.name + " — Collection studio";
}

boot().catch((error) => {
  const unauthorized = error.status === 401 || error.statusCode === 401;
  message(
    unauthorized
      ? "Sign in to open your shop studio"
      : "The studio could not open",
    error.message ||
      "Your saved collection has not changed. Return to your dashboard and try again.",
    { login: unauthorized },
  );
});
