/* Tenant policy and persistence around the unchanged bouquet engines. */
import {
  normalizePolicy,
  validateDesign,
  mapDesignIds,
  designPreset,
} from "/policy.mjs";
import { bouquetSlots, nextBouquetSlot } from "/bouquet-slots.mjs";
import { demoShop, keepTrial, readTrial, clearTrial } from "/launch-demo.mjs";
const $ = (id) => document.getElementById(id),
  clone = (value) => JSON.parse(JSON.stringify(value));
const cents = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= 100000000;
const clean = (value, max) =>
  typeof value === "string" &&
  value.length <= max &&
  !/[\u0000-\u001f<>]/.test(value);
let shop,
  card,
  session,
  catalog,
  policy,
  saveButton,
  status,
  customer = false,
  blank = false,
  onboarding = false,
  exploring = false;
let requestedSlot = 0,
  trying = false,
  publicDemo = false;
const designDraft = () =>
  exploring
    ? { ...shop.draft, disabledFlowers: [], disabledExtras: [] }
    : shop.draft;
const flower = (id) =>
  catalog.flowers.find(
    (row) => row.preset === policy.preset && (row.runtimeId || row.id) === id,
  );
const extra = (id) =>
  catalog.extras.find(
    (row) =>
      (!row.preset || row.preset === policy.preset) &&
      (row.runtimeId || row.id) === id,
  );
const offered = (id) => {
  const row = flower(id);
  return (
    !!row &&
    !policy.disabledFlowers.includes(row.id) &&
    (!customer || cents(policy.flowerPrices[row.id]))
  );
};
const extraAllowed = (id) => {
  const row = extra(id);
  return (
    !!row &&
    !policy.disabledExtras.includes(row.id) &&
    (!customer || cents(policy.extrasCents[row.id]))
  );
};
const semantic = (state) => ({
  ...mapDesignIds(state, catalog, policy.preset, "catalog"),
  ...(shop?.draft.preset === "mixed" ? { flowerType: policy.preset } : {}),
});
function message(title, text, { login = false } = {}) {
  const host = $("platformBoot");
  host.hidden = false;
  host.replaceChildren();
  const h = document.createElement("h1"),
    p = document.createElement("p"),
    a = document.createElement("a");
  h.textContent = title;
  p.textContent = text;
  a.textContent = login
    ? "Sign in to continue"
    : customer
      ? "Back to the shop"
      : "Back to my collection";
  a.href = login
    ? "/login?returnTo=" +
      encodeURIComponent(location.pathname + location.search)
    : customer
      ? "/s/" + encodeURIComponent(shop?.slug || "")
      : "/dashboard/collection" +
        (shop ? "?shop=" + encodeURIComponent(shop.id) : "");
  host.append(h, p, a);
}
async function json(file) {
  const r = await fetch(new URL(file, import.meta.url), {
    credentials: "same-origin",
  });
  if (!r.ok) throw Error("The studio files could not load. Please reload.");
  return r.json();
}
function script(file) {
  return new Promise((resolve, reject) => {
    const n = document.createElement("script");
    n.src = new URL(file, import.meta.url).href;
    n.async = false;
    n.onload = resolve;
    n.onerror = () => reject(Error("The studio could not load " + file + "."));
    document.head.append(n);
  });
}
function verify(value, id) {
  if (
    !value ||
    value.id !== id ||
    !/^[A-Za-z0-9_-]{1,60}$/.test(id) ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1 ||
    !value.draft ||
    !Array.isArray(value.draft.collection) ||
    value.draft.collection.length > 6
  )
    throw Error(
      "The shop profile could not be verified. Reopen the studio from its shop page.",
    );
  const d = value.draft,
    p = normalizePolicy(d, catalog);
  if (
    !clean(d.name, 80) ||
    !d.name.trim() ||
    !/^[A-Z]{3}$/.test(d.currency) ||
    !p.ok
  )
    throw Error(
      p.issues[0]?.message ||
        "Finish your shop name, currency and catalogue first.",
    );
  const f = new Intl.NumberFormat("en", {
    style: "currency",
    currency: d.currency,
  }).resolvedOptions();
  if (f.maximumFractionDigits !== 2 || f.minimumFractionDigits !== 2)
    throw Error("The studio supports currencies with two decimal places.");
  policy = p.policy;
  Object.assign(d, {
    flowerPrices: policy.flowerPrices,
    extrasCents: policy.extrasCents,
    disabledFlowers: policy.disabledFlowers,
    disabledExtras: policy.disabledExtras,
    enabledModes: policy.enabledModes,
  });
  return value;
}
function lockLegacyOrders() {
  const selector =
    '#orderButton,#orderForm,#orderSend,#smsOpen,#smsCopy,#smsMessage,[href^="sms:"],[href^="tel:"],[href^="mailto:"],[href^="https://wa.me/"],[href^="https://api.whatsapp.com/"]';
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest?.(selector)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  document.addEventListener(
    "submit",
    (e) => {
      if (e.target.id === "orderForm") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  const form = $("orderForm");
  if (form) {
    form.inert = true;
    for (const input of form.elements) input.disabled = true;
  }
}
function newDesign(mode) {
  const M = NebulaModel,
    s = M.empty();
  s.mode = mode;
  if (mode === "classic") M.arrange(s, mode, { fresh: true });
  else {
    const id =
      Object.keys(NebulaConfig.CAT).find(
        (id) => offered(id) && flower(id)?.modes?.includes(mode),
      ) || "rose_red";
    s.finishes.paper = "black";
    s.template = NebulaTemplates.defaults(mode, 1);
    s.template.palette = [id];
    s.template.accent.id = id;
    for (const key of ["wall", "fill", "center"]) s.template.zones[key] = id;
    s.template.overrides = { 0: null };
    if (policy.preset === "satin") s.finishes.studio = { v: 1 };
    M.syncTemplate(s);
  }
  return s;
}
function configure(library, initial) {
  const { CAT, CONFIG } = NebulaConfig,
    d = shop.draft;
  for (const [id, row] of Object.entries(CAT)) {
    const entry = flower(id);
    row.priceCents = entry ? (policy.flowerPrices[entry.id] ?? 0) : 0;
    if (policy.preset === "satin" && entry) row.top = true;
    if (!offered(id)) row.classic = row.classicOffered = row.top = false;
  }
  CONFIG.baseCents = 0;
  CONFIG.laborCents = { classic: 0, dome: 0, heart: 0 };
  CONFIG.currency = d.currency;
  for (const row of catalog.extras.filter(
    (row) => row.preset === policy.preset,
  ))
    CONFIG.extrasCents[row.runtimeId || row.id] =
      policy.extrasCents[row.id] ?? 0;
  CONFIG.recipient = CONFIG.whatsapp = CONFIG.email = "";
  CONFIG.studio.phone = CONFIG.studio.instagram = "";
  const assess = (s) => {
    if (!s || s.photographic)
      return { ok: false, restricted: true, reason: "unsupported" };
    const r = validateDesign(semantic(s), designDraft(), catalog, {
      allowUnpriced: !customer,
    });
    return {
      ok: r.ok,
      restricted: !r.ok,
      reason: r.ok ? null : "unsupported",
      issues: r.issues,
    };
  };
  Object.assign(NebulaShop, {
    restricted: false,
    assess,
    modeAllowed: (mode) => policy.enabledModes.includes(mode),
    recipeAllowed: (id) =>
      id === "platform-card" || library.some((row) => row.id === id),
    message: () =>
      "This design uses a flower or finishing option your shop does not offer. Review its catalogue.",
  });
  for (const lib of [NebulaClassic, NebulaRomance, NebulaSpooky, NebulaFall]) {
    lib.recipes = [];
    lib.create = (id) =>
      id === "platform-card"
        ? clone(initial)
        : library.find((row) => row.id === id)
          ? mapDesignIds(
              library.find((row) => row.id === id).design,
              catalog,
              policy.preset,
            )
          : null;
  }
  NebulaRomance.recipes = [
    {
      id: "platform-card",
      en: card?.title || "New bouquet",
      es: card?.title || "Nuevo ramo",
      count: initial.items.length,
      mode: initial.mode,
    },
    ...library.map((row) => ({
      id: row.id,
      en: row.name,
      es: row.name,
      count: Object.values(row.counts || {}).reduce((a, b) => a + b, 0),
      mode: row.mode,
    })),
  ];
  NebulaModel.create = () => clone(initial);
  NebulaModel.defaultMode = newDesign;
  NebulaModel.order = (s, lang = "en") => ({
    format: "nebula-bouquet",
    version: 6,
    estimateOnly: true,
    currency: d.currency,
    design: clone(s),
    pickList: NebulaModel.price(s).lines.map((line) => ({
      ...line,
      name: CAT[line.id][lang],
    })),
    pricing: NebulaModel.price(s),
    notice: customer
      ? "Estimate only. Your florist confirms your order."
      : "Owner draft. No order or payment is created.",
  });
  for (const lang of ["en", "es"])
    for (const key of Object.keys(NebulaI18n[lang]))
      if (typeof NebulaI18n[lang][key] === "string")
        NebulaI18n[lang][key] = NebulaI18n[lang][key]
          .replace(/Ray[’']s(?: Bouquetz)?/g, d.name)
          .replace(/\bCAD\b/g, d.currency);
  Object.assign(NebulaI18n.en, {
    studio: customer ? d.name.toUpperCase() : "YOUR COLLECTION STUDIO",
    yourAtelier: d.name.toUpperCase(),
    demoEstimate: customer ? "BOUQUET ESTIMATE" : "DRAFT ESTIMATE",
    sampleShort: customer ? "estimate" : "draft",
    separateHint: customer
      ? "Choose your flowers and finishing touches."
      : "Choose flowers → explore your estimate → save to your collection",
    saveHint: customer
      ? "Download an image or an editable copy of your bouquet."
      : "Save an editable copy or use Save to my collection above.",
    priceDisclaimer: customer
      ? "Your florist confirms availability, delivery and the final order."
      : "Owner preview. Unpriced choices need prices before publishing. No order or payment is created.",
    orderNoShop: "Use the shop request button to contact your florist.",
  });
  if (window.NebulaRequest)
    Object.assign(NebulaRequest, {
      recipient: () => "",
      url: () => {
        throw Error("Use the shop request form.");
      },
      compose: () => {
        throw Error("Use the shop request form.");
      },
    });
  if (policy.preset === "satin") {
    $("family").value = "all";
    const moneyNote = document.createElement("p");
    moneyNote.id = "platformMoneyPolicy";
    moneyNote.className = "helper";
    moneyNote.hidden = publicDemo;
    moneyNote.textContent =
      "Folded notes use your florist’s price per note in " +
      d.currency +
      ". That price must include the cash and any styling. No automatic currency conversion or deposit is calculated here.";
    $("panel-flowers").prepend(moneyNote);
    const details = document.createElement("section"),
      heading = document.createElement("h3");
    details.className = "custom-section";
    heading.textContent = "Satin bows & gifts";
    details.append(heading, $("detailChoices"), $("detailEditor"));
    $("panel-finishing").prepend(details);
  }
  const restrict = () => {
    for (const n of document.querySelectorAll("[data-mode]")) {
      const hidden = !policy.enabledModes.includes(n.dataset.mode);
      if (n.hidden !== hidden) n.hidden = hidden;
    }
    for (const n of document.querySelectorAll("[data-detail]")) {
      const hidden = !extraAllowed(n.dataset.detail);
      if (n.hidden !== hidden) n.hidden = hidden;
    }
    for (const [id, key] of [
      ["crown", "crown"],
      ["sash", "sash"],
      ["initialEnabled", "floralInitial"],
    ]) {
      const host = $(id)?.closest("label"),
        hidden = !extraAllowed(key);
      if (host && host.hidden !== hidden) host.hidden = hidden;
    }
    const bf = $("butterflyMore")?.closest(".toggle-row");
    if (bf && bf.hidden === extraAllowed("butterfly"))
      bf.hidden = !extraAllowed("butterfly");
    const toggle = (id, allowed) => {
      const n = $(id);
      if (!n) return;
      const host = n.closest("label") || n.closest(".toggle-row");
      if (host && !allowed && !host.hidden) host.hidden = true;
    };
    for (const [id, key] of [
      ["chocolateBox", "chocolateBox"],
      ["spookyMask", "spookyMask"],
      ["spookyBow", "spookyBow"],
      ["ghostCount", "ghostCount"],
      ["thistleCount", "thistleCount"],
      ["spookyFiller", "filler"],
      ["pumpkin", "pumpkin"],
      ["cocoaBow", "bow"],
      ["fillerMore", "filler"],
      ["breathWrap", "filler"],
      ["whiteBudMore", "whiteLilyBud"],
    ])
      toggle(id, extraAllowed(key));
    for (const [id, key] of [
      ["greeneryMore", "eucalyptus"],
      ["greenRim", "eucalyptus"],
      ["whiteSprayMore", "white_flower_spray"],
      ["budMore", "lily_bud"],
    ])
      toggle(id, offered(key));
    for (const node of document.querySelectorAll("#satinColor option"))
      if (node.value) {
        const hidden = !extraAllowed(node.value);
        if (node.hidden !== hidden) node.hidden = hidden;
      }
    const breath = $("breathLevels");
    if (breath && !extraAllowed("filler") && !breath.hidden)
      breath.hidden = true;
    if (policy.preset === "satin") {
      const mode = window.NebulaApp?.state?.mode || initial.mode;
      if (mode === "heart" && $("customTintLabel") && !$("customTintLabel").hidden)
        $("customTintLabel").hidden = true;
      for (const id of [
        "autumnFinishes",
        "halloweenFinishes",
        "greenRimLabel",
        "ribbonChoices",
        "finishShortcuts",
      ])
        if ($(id) && !$(id).hidden) $(id).hidden = true;
      for (const n of document.querySelectorAll("[data-paper]")) {
        const hidden =
          !RayBuilder.wraps[mode]?.[n.dataset.paper];
        if (n.hidden !== hidden) n.hidden = hidden;
      }
      for (const option of $("sash")?.options || []) {
        const hidden = !["none", "blank_blackband", "blank_champagne"].includes(option.value);
        if (option.hidden !== hidden) option.hidden = hidden;
      }
      if (
        mode === "dome" &&
        !document.querySelector('[data-paper="blush"]')
      ) {
        const pink = document.createElement("button");
        pink.type = "button";
        pink.dataset.paper = "blush";
        pink.textContent = "Pink";
        pink.onclick = () => {
          const s = NebulaApp.state;
          s.finishes.paper = "blush";
          NebulaApp.setState(s);
        };
        $("paperChoices").append(pink);
      }
    }
    for (const n of document.querySelectorAll("[data-flower]")) {
      const row = flower(n.dataset.flower),
        small = n.querySelector("small");
      if (
        row &&
        !cents(policy.flowerPrices[row.id]) &&
        small &&
        small.textContent !== "Price needed"
      )
        small.textContent = "Price needed";
    }
  };
  new MutationObserver(restrict).observe(document.querySelector("main"), {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
  restrict();
  return assess;
}
function demoToolbar() {
  document.body.classList.add("public-builder-demo");
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/demo-studio.css";
  document.head.append(css);
  const bar = document.createElement("aside");
  bar.className = "demo-studio-bar";
  bar.innerHTML =
    '<a href="/demo">← Choose a bouquet</a><span>DEMO · Sample prices · No real orders</span><button id="demoReview" type="button">Preview the request</button><button id="demoStartShop" type="button">Use this for my shop ↗</button><p id="demoFeedback" role="status"></p>';
  materialSwitch();
  document.body.prepend(bar);
  const feedback = bar.querySelector("#demoFeedback");
  const continueToShop = () => {
    try {
      const r = validateDesign(semantic(NebulaApp.state), shop.draft, catalog);
      if (!r.ok || !r.design.items.length)
        throw Error(
          r.issues[0]?.message || "Add a flower before keeping this design.",
        );
      keepTrial(r.design, policy.preset);
      location.assign(
        "/login?mode=signup&returnTo=" +
          encodeURIComponent("/dashboard/collection"),
      );
    } catch (e) {
      feedback.textContent = e.message;
    }
  };
  bar.querySelector("#demoStartShop").onclick = continueToShop;
  bar.querySelector("#demoReview").onclick = async (event) => {
    const trigger = event.currentTarget;
    trigger.disabled = true;
    try {
      const snapshot = clone(NebulaApp.state);
      const r = validateDesign(semantic(snapshot), shop.draft, catalog);
      if (!r.ok || !r.design.items.length)
        throw Error(
          r.issues[0]?.message || "Add a flower to preview the request.",
        );
      await NebulaRenderer.awaitAssets(snapshot);
      const image = NebulaRenderer.exportCanvas(
        snapshot,
        480,
        480,
        NebulaApp.lang,
      ).toDataURL("image/jpeg", 0.8);
      const esc = (value) =>
        String(value).replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c],
        );
      const overlay = document.createElement("div");
      overlay.className = "demo-review-overlay";
      overlay.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="demoReviewTitle"><button type="button" class="demo-close" aria-label="Close demo request">×</button><p class="demo-kicker">EXAMPLE REQUEST · NOTHING IS SENT</p><h2 id="demoReviewTitle">The idea, ready to share.</h2><img src="${image}" alt="Your current bouquet design"><p>A florist receives the saved design, its contents and the customer’s contact and pickup or delivery details.</p><ul>${[...r.pricing.lines, ...r.pricing.extraLines].map((row) => `<li>${esc(row.quantity)} × ${esc(catalog.flowers.find((f) => f.id === row.id)?.en || catalog.extras.find((f) => f.id === row.id)?.label || row.id)}</li>`).join("")}</ul><p><strong>Sample estimate: ${esc(new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(r.pricing.totalCents / 100))}</strong></p><p class="demo-muted">Your shop uses your approved prices. Text and WhatsApp requests let you confirm the details; Square checkout is optional when available. This demo creates no order or payment.</p><button type="button" data-demo-continue>Use this for my shop ↗</button></section>`;
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const close = () => {
        overlay.remove();
        document.body.style.overflow = overflow;
        document.removeEventListener("keydown", keydown);
        trigger.focus();
      };
      const keydown = (event) => {
        if (event.key === "Escape") close();
        if (event.key !== "Tab") return;
        const buttons = [...overlay.querySelectorAll("button")];
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons.at(-1).focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === buttons.at(-1)
        ) {
          event.preventDefault();
          buttons[0].focus();
        }
      };
      overlay.querySelector(".demo-close").onclick = close;
      overlay.querySelector("[data-demo-continue]").onclick = continueToShop;
      document.addEventListener("keydown", keydown);
      document.body.append(overlay);
      overlay.querySelector(".demo-close").focus();
    } catch (e) {
      feedback.textContent = e.message;
    } finally {
      trigger.disabled = false;
    }
  };
  const browse = $("browseTemplates");
  if (browse) {
    browse.removeAttribute("data-i18n");
    browse.href = "/demo";
    browse.textContent = "Choose a bouquet";
  }
  const brand = document.querySelector(".brand");
  if (brand) brand.href = "/";
}
function materialSwitch() {
  const group = document.createElement("label");
  group.className = "material-switch";
  group.textContent = "Flower type";
  const select = document.createElement("select");
  select.id = "platformFlowerType";
  select.setAttribute("aria-label", "Flower collection");
  for (const [value, title] of [
    ["fresh", "Fresh flowers"],
    ["satin", "Satin flowers"],
  ])
    select.add(new Option(title, value, false, policy.preset === value));
  select.onchange = () => {
    const value = select.value;
    if (value === policy.preset) return;
    if (
      NebulaApp.state.items.length &&
      !confirm(
        "Start a new " +
          value +
          " bouquet? This replaces the current demo design.",
      )
    ) {
      select.value = policy.preset;
      return;
    }
    const url = new URL(location.href);
    url.hash = "";
    for (const key of ["recipe", "template", "mode", "blank"])
      url.searchParams.delete(key);
    url.searchParams.set("flowers", value);
    location.assign(url.href);
  };
  group.append(select);
  $("panel-flowers").prepend(group);
}
function toolbar() {
  if (publicDemo) return demoToolbar();
  const bar = document.createElement("aside");
  bar.className = "platform-bar";
  const back = document.createElement("a"),
    notice = document.createElement("p");
  back.href = customer
    ? "/s/" + encodeURIComponent(shop.slug)
    : "/dashboard/collection?shop=" + encodeURIComponent(shop.id);
  if (onboarding) back.href = "/s/" + encodeURIComponent(shop.slug);
  back.textContent = customer ? "← Back to the shop" : "← My collection";
  if (onboarding) back.textContent = "← My shop preview";
  notice.textContent = customer
    ? "Your bouquet · " + shop.draft.name
    : "Owner preview · " +
      (card?.title || "New bouquet") +
      " · Orders and payments are disabled.";
  if (onboarding)
    notice.textContent =
      "Build your bouquet · Your photo and prices come next · Private preview";
  bar.append(back, notice);
  if (shop.draft.preset === "mixed") {
    const label = document.createElement("label"),
      select = document.createElement("select");
    label.className = "material-switch";
    label.textContent = "Flower type";
    select.id = "platformFlowerType";
    select.setAttribute("aria-label", "Flower collection");
    for (const [value, name] of [
      ["fresh", "Fresh flowers"],
      ["satin", "Satin flowers"],
    ]) {
      if (
        customer &&
        !catalog.flowers.some(
          (row) =>
            row.preset === value &&
            !shop.draft.disabledFlowers.includes(row.id) &&
            cents(shop.draft.flowerPrices[row.id]),
        )
      )
        continue;
      select.add(new Option(name, value, false, value === policy.preset));
    }
    select.onchange = () => {
      const next = select.value;
      if (
        NebulaApp.state.items.length &&
        !confirm(
          "Start a new " +
            next +
            " bouquet? Save your current bouquet first if you want to keep it.",
        )
      ) {
        select.value = policy.preset;
        return;
      }
      const url = new URL(location.href);
      for (const key of ["card", "recipe", "template", "mode"])
        url.searchParams.delete(key);
      url.searchParams.set("blank", "1");
      url.searchParams.set("flowers", next);
      location.assign(url.href);
    };
    label.append(select);
    $("panel-flowers").prepend(label);
  }
  status = document.createElement("span");
  status.id = "platformSaveStatus";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  if (customer) {
    const request = document.createElement("button");
    request.type = "button";
    request.id = "platformRequestOrder";
    request.className = "button primary small";
    request.textContent = shop.features?.requestsEnabled
      ? shop.features?.checkoutEnabled
        ? "Review & pay"
        : "Request this bouquet"
      : "Online requests are not ready";
    request.disabled = !shop.features?.requestsEnabled;
    request.onclick = async () => {
      request.disabled = true;
      try {
        const r = validateDesign(
          semantic(NebulaApp.state),
          shop.draft,
          catalog,
        );
        if (!r.ok) throw Error(r.issues[0].message);
        if (!r.design.items.length)
          throw Error("Add at least one flower first.");
        const snapshot = clone(NebulaApp.state);
        await NebulaRenderer.awaitAssets(snapshot);
        const scene = NebulaRenderer.scene(snapshot),
          bounds = NebulaRenderer.artBounds(snapshot, scene);
        let preview;
        for (const size of [480, 360, 280]) {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const ctx = canvas.getContext("2d"),
            scale = Math.min((size - 24) / bounds.w, (size - 24) / bounds.h);
          ctx.fillStyle = "#f7f3eb";
          ctx.fillRect(0, 0, size, size);
          ctx.translate(
            (size - bounds.w * scale) / 2 - bounds.x * scale,
            (size - bounds.h * scale) / 2 - bounds.y * scale,
          );
          ctx.scale(scale, scale);
          NebulaRenderer.drawArt(ctx, snapshot, { scene });
          // Art only: no stale estimated-price or "no order placed" export footer.
          preview = canvas.toDataURL("image/jpeg", 0.76);
          if (preview.length <= 100000) break;
        }
        if (preview.length > 100000)
          throw Error("The bouquet preview is too large. Please try again.");
        const { openOrderRequest } = await import("/order-ui.js");
        await openOrderRequest({
          shop,
          kind: "design",
          design: r.design,
          previewImage: preview,
          ...(card ? { cardId: card.id } : {}),
        });
      } catch (e) {
        status.textContent = e.message;
      } finally {
        request.disabled = false;
      }
    };
    bar.append(request);
  } else {
    const review = document.createElement("button");
    review.type = "button";
    review.id = "platformPreviewOrder";
    review.className = "button secondary small";
    review.textContent = "Preview order";
    review.onclick = async () => {
      review.disabled = true;
      try {
        const r = validateDesign(
          semantic(NebulaApp.state),
          shop.draft,
          catalog,
          { allowUnpriced: true },
        );
        if (!r.ok) throw Error(r.issues[0]?.message || "Review your design.");
        if (!r.design.items.length)
          throw Error("Add at least one flower first.");
        const { openOrderRequest } = await import("/order-ui.js");
        await openOrderRequest({
          shop,
          kind: "design",
          design: r.design,
          preview: true,
          ...(card ? { cardId: card.id } : {}),
        });
      } catch (error) {
        status.textContent = error.message;
      } finally {
        review.disabled = false;
      }
    };
    bar.append(review);
    if (blank) {
      const title = document.createElement("input");
      title.id = "platformCardTitle";
      title.type = "text";
      title.maxLength = 80;
      title.placeholder = "Bouquet name";
      title.value = "Custom bouquet";
      if (onboarding) {
        title.value =
          "My bouquet " + (requestedSlot || shop.draft.collection.length + 1);
        title.hidden = true;
      }
      title.setAttribute("aria-label", "Bouquet name");
      const target = document.createElement("select");
      target.id = "platformSaveTarget";
      target.setAttribute("aria-label", "Save to an empty collection slot");
      for (const row of shop.draft.collection.filter(
        (row) => !row.design && !row.recipeId,
      )) {
        const option = document.createElement("option");
        option.value = row.id;
        option.textContent = row.title || "Empty slot";
        target.append(option);
      }
      if (shop.draft.collection.length < 6) {
        const option = document.createElement("option");
        option.value = "__new";
        option.textContent =
          "New collection slot (" +
          (shop.draft.collection.length + 1) +
          " of 6)";
        target.append(option);
      }
      if (!target.options.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "All six collection slots are full";
        target.append(option);
      }
      bar.append(title, target);
      if (onboarding) target.hidden = true;
    }
    saveButton = document.createElement("button");
    saveButton.id = "platformSaveCollection";
    saveButton.type = "button";
    saveButton.className = "button primary small";
    saveButton.textContent = onboarding
      ? "Next: photo & prices →"
      : "Save to my collection";
    saveButton.onclick = save;
    bar.append(saveButton);
    const cover = document.createElement("button");
    cover.id = "platformUseDesignCover";
    cover.type = "button";
    cover.className = "button secondary small";
    cover.textContent = "Use design as photo";
    cover.disabled = !card?.design;
    cover.onclick = useDesignCover;
    bar.append(cover);
    if (onboarding) cover.hidden = true;
  }
  bar.append(status);
  if (trying) {
    notice.textContent =
      "Customer preview · Try customising this recipe. Your saved bouquet stays unchanged.";
    for (const node of bar.querySelectorAll(
      "input,select,#platformSaveCollection,#platformUseDesignCover",
    ))
      node.hidden = true;
  }
  document.body.prepend(bar);
  if (blank && !customer) saveButton.disabled = !$("platformSaveTarget").value;
  const browse = $("browseTemplates");
  if (browse) {
    browse.removeAttribute("data-i18n");
    browse.href = back.href;
    browse.textContent = customer ? "Back to shop" : "My collection";
  }
  const brand = document.querySelector(".brand");
  if (brand) brand.href = back.href;
}
async function save() {
  if (!NebulaApp.ready || saveButton.disabled) return;
  saveButton.disabled = true;
  status.textContent = "Saving your exact bouquet design…";
  try {
    const r = validateDesign(
      semantic(NebulaApp.state),
      designDraft(),
      catalog,
      {
        allowUnpriced: true,
      },
    );
    if (!r.ok)
      throw Error(r.issues[0]?.message || "Review your design before saving.");
    if (!r.design.items.length)
      throw Error("Add at least one flower before saving.");
    const draft = clone(shop.draft);
    let target;
    if (blank) {
      const id = $("platformSaveTarget").value,
        title = $("platformCardTitle").value.trim();
      if (!clean(title, 80) || !title) throw Error("Give this bouquet a name.");
      if (id === "__new") {
        if (draft.collection.length >= 6)
          throw Error("All six collection slots are full.");
        if (requestedSlot && bouquetSlots(draft.collection)[requestedSlot - 1])
          throw Error(
            "This slot is already filled. Return to your bouquets to edit it.",
          );
        target = {
          id: requestedSlot
            ? "bouquet-slot-" + requestedSlot
            : "bouquet-" + crypto.randomUUID(),
          title,
          recipeId: null,
          design: null,
          cover: null,
          available: true,
          category: "",
        };
        draft.collection.push(target);
      } else {
        target = draft.collection.find(
          (row) => row.id === id && !row.design && !row.recipeId,
        );
        if (!target)
          throw Error(
            "Choose an empty slot. Existing bouquets are not overwritten.",
          );
        target.title = title;
      }
    } else target = draft.collection.find((row) => row.id === card.id);
    if (!target)
      throw Error(
        "This card was removed. Download your design before returning to your collection.",
      );
    target.design = r.design;
    if (exploring) {
      const flowers = new Set(r.pricing.lines.map((row) => row.id));
      const extras = new Set();
      for (const row of r.pricing.extraLines)
        (row.source === "flower" ? flowers : extras).add(row.id);
      draft.disabledFlowers = draft.disabledFlowers.filter(
        (id) => !flowers.has(id),
      );
      draft.disabledExtras = draft.disabledExtras.filter(
        (id) => !extras.has(id),
      );
    }
    if (!draft.home.sections.includes("custom"))
      draft.home.sections.unshift("custom");
    const id = target.id;
    const result = await session.api(
      "/api/shops/" + encodeURIComponent(shop.id) + "/draft",
      { method: "PUT", body: { version: shop.version, draft } },
    );
    if (
      !result.shop ||
      result.shop.id !== shop.id ||
      result.shop.version <= shop.version
    )
      throw Error(
        "The save could not be confirmed. Your design remains in this browser.",
      );
    shop = result.shop;
    if (new URLSearchParams(location.search).get("trial") === "1") clearTrial();
    card = shop.draft.collection.find((row) => row.id === id);
    blank = false;
    for (const id of ["platformCardTitle", "platformSaveTarget"])
      $(id)?.remove();
    const url = new URL(location.href);
    url.searchParams.delete("blank");
    url.searchParams.delete("new");
    url.searchParams.delete("slot");
    url.searchParams.delete("trial");
    url.searchParams.set("card", id);
    history.replaceState(null, "", url);
    status.textContent = "Saved to your collection.";
    NebulaPlatformStudio.version = shop.version;
    NebulaPlatformStudio.cardId = id;
    $("platformUseDesignCover").disabled = false;
    if (onboarding && !trying) {
      const { finishBouquet } = await import("/owner-onboarding.js");
      const completed = await finishBouquet({
        shop,
        cardId: id,
        catalog,
        api: session.api,
        makeDesignPhoto: () => designPhotoBlob(clone(NebulaApp.state)),
      });
      if (completed) {
        shop = completed;
        location.assign(
          "/s/" +
            encodeURIComponent(shop.slug) +
            "?created=" +
            encodeURIComponent(id),
        );
      } else
        status.textContent =
          "Your design is saved. Choose Next whenever you’re ready to add its photo and prices.";
    }
    return true;
  } catch (e) {
    if (e.status === 409 || e.statusCode === 409) {
      status.textContent =
        "Your shop changed in another tab. Download an editable copy, then reopen the latest collection. Nothing was overwritten.";
      saveButton.dataset.conflict = "true";
    } else
      status.textContent =
        e.message ||
        "The save failed. Your design is still here; please retry.";
  } finally {
    saveButton.disabled = saveButton.dataset.conflict === "true";
  }
}
async function useDesignCover() {
  const button = $("platformUseDesignCover");
  if (button.disabled || saveButton.disabled || !card?.design) return;
  if (
    JSON.stringify(semantic(NebulaApp.state)) !== JSON.stringify(card.design)
  ) {
    status.textContent =
      "Save your current design first, then use it as the collection photo.";
    return;
  }
  const snapshot = clone(NebulaApp.state),
    cardId = card.id;
  button.disabled = true;
  saveButton.disabled = true;
  status.textContent = "Creating a photo from your saved design…";
  try {
    const blob = await designPhotoBlob(snapshot);
    const index = shop.draft.collection.findIndex((row) => row.id === cardId);
    if (index < 0)
      throw Error("This bouquet was removed. Reopen your current collection.");
    const upload = await session.api(
      "/api/shops/" +
        encodeURIComponent(shop.id) +
        "/media?slot=" +
        (index + 2) +
        "&kind=cover",
      { method: "POST", body: blob },
    );
    if (!/^img_[a-f0-9]{64}$/.test(upload.media?.id || ""))
      throw Error("The uploaded design photo could not be verified.");
    const draft = clone(shop.draft);
    draft.collection[index].cover = upload.media.id;
    const result = await session.api(
      "/api/shops/" + encodeURIComponent(shop.id) + "/draft",
      { method: "PUT", body: { version: shop.version, draft } },
    );
    shop = result.shop;
    card = shop.draft.collection.find((row) => row.id === cardId);
    NebulaPlatformStudio.version = shop.version;
    status.textContent =
      "Your saved design is now this bouquet’s collection photo.";
  } catch (error) {
    if (error.status === 409) {
      saveButton.dataset.conflict = "true";
      status.textContent =
        "Your shop changed in another tab. Reopen the latest collection before replacing its photo.";
    } else
      status.textContent =
        error.message ||
        "The design photo could not be saved. Your previous photo is still selected.";
  } finally {
    saveButton.disabled = saveButton.dataset.conflict === "true";
    button.disabled = saveButton.disabled || !card?.design;
  }
}
async function designPhotoBlob(snapshot) {
  await NebulaRenderer.awaitAssets(snapshot);
  for (const size of [720, 600, 480]) {
    const canvas = NebulaRenderer.exportCanvas(
      snapshot,
      size,
      size,
      NebulaApp.lang,
    );
    for (const quality of [0.86, 0.7, 0.52]) {
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= 150 * 1024) return blob;
    }
  }
  throw Error(
    "This preview is too large. Choose your own compressed bouquet photo instead.",
  );
}
async function branding(d) {
  const key = "assets/brand/owner-logo.webp";
  if (publicDemo) {
    window.NEBULA_EMBED = {
      [key]: location.origin + "/assets/nebula-logo.jpg",
    };
  } else if (d.logoMediaId) {
    const headers = customer
        ? {}
        : { Authorization: "Bearer " + (await session.token()) },
      r = await fetch(
        "/api/shops/" +
          encodeURIComponent(shop.id) +
          "/media/" +
          encodeURIComponent(d.logoMediaId),
        {
          headers,
          cache: "no-store",
          credentials: "same-origin",
          signal: AbortSignal.timeout(20000),
        },
      );
    if (!r.ok) throw Error("Your shop logo could not load. Please retry.");
    const url = URL.createObjectURL(await r.blob());
    window.NEBULA_EMBED = { [key]: url };
    window.addEventListener("pagehide", () => URL.revokeObjectURL(url), {
      once: true,
    });
  } else {
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const x = c.getContext("2d");
    x.fillStyle = d.theme.background;
    x.fillRect(0, 0, 160, 160);
    x.fillStyle = d.theme.primary;
    x.font = "84px Georgia";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(d.name.trim().slice(0, 1).toUpperCase(), 80, 85);
    window.NEBULA_EMBED = { [key]: c.toDataURL("image/png") };
  }
  window.NEBULA_SHOP.logo = key;
  for (const [key, value] of Object.entries({
    accent: d.theme.primary,
    bg: d.theme.background,
  }))
    if (/^#[0-9a-f]{6}$/i.test(value || ""))
      document.documentElement.style.setProperty("--" + key, value);
}
async function boot() {
  lockLegacyOrders();
  const q = new URLSearchParams(location.search),
    slug = q.get("slug"),
    cardId = q.get("card");
  let id = q.get("shop");
  // A demo can never be combined with a tenant identifier or customer slug.
  publicDemo = q.get("demo") === "1" && !id && !slug && !cardId;
  let trial = null;
  customer = !!slug;
  blank = q.get("blank") === "1" || q.get("new") === "1";
  onboarding = !customer && q.get("onboarding") === "1";
  trying = !customer && q.get("try") === "1";
  requestedSlot =
    !customer && /^[1-6]$/.test(q.get("slot") || "")
      ? Number(q.get("slot"))
      : 0;
  exploring = !customer && (onboarding || blank);
  if (
    (id && !/^[A-Za-z0-9_-]{1,60}$/.test(id)) ||
    (slug && !/^[a-z0-9-]{3,48}$/.test(slug)) ||
    (!customer && !id && !publicDemo) ||
    (!blank && !cardId && !q.get("recipe") && !publicDemo)
  )
    return message(
      "Choose a bouquet first",
      "Open the studio from your shop or collection.",
    );
  catalog = await json("../catalog.json");
  let result;
  if (publicDemo) {
    const preset = q.get("flowers") === "satin" ? "satin" : "fresh";
    id = "nebula-demo";
    result = { shop: demoShop(catalog, preset) };
    blank = q.get("blank") === "1";
    onboarding = trying = exploring = false;
    requestedSlot = 0;
    if (
      !blank &&
      !catalog.recipes.some(
        (row) => row.id === q.get("recipe") && row.preset === preset,
      )
    )
      q.set("recipe", preset === "satin" ? "satin-pink-heart" : "pink-promise");
  } else if (customer) {
    const r = await fetch("/api/public/shops/" + encodeURIComponent(slug), {
      credentials: "omit",
      cache: "no-store",
    });
    if (!r.ok)
      throw Error("This shop is not available for customer designs yet.");
    result = await r.json();
    id = result.shop?.id;
  } else {
    session = await import("/session.js");
    if (!(await session.getUser()))
      return message(
        "Sign in to open your shop studio",
        "Your draft collection is private to your account.",
        { login: true },
      );
    result = await session.api("/api/shops/" + encodeURIComponent(id));
  }
  shop = verify(result.shop, id);
  if (!publicDemo && !customer && blank && q.get("trial") === "1") {
    const pending = readTrial();
    if (pending && [pending.preset, "mixed"].includes(shop.draft.preset)) {
      const checked = validateDesign(
        pending.design,
        {
          ...shop.draft,
          preset: pending.preset,
          disabledFlowers: [],
          disabledExtras: [],
          enabledModes: shop.draft.enabledModes.filter(
            (mode) => pending.preset !== "satin" || mode !== "classic",
          ),
        },
        catalog,
        { allowUnpriced: true },
      );
      if (checked.ok) {
        trial = { preset: pending.preset, design: checked.design };
        q.set("flowers", pending.preset);
      }
    }
  }
  if (!customer && blank && !requestedSlot)
    requestedSlot = nextBouquetSlot(shop.draft.collection);
  if (
    blank &&
    requestedSlot &&
    bouquetSlots(shop.draft.collection)[requestedSlot - 1]
  )
    throw Error(
      "This bouquet slot is already filled. Return to your collection to edit its recipe.",
    );
  card = shop.draft.collection.find((row) => row.id === cardId);
  if (cardId && !card)
    return message(
      "This bouquet is unavailable",
      "Return to the collection and choose a current bouquet.",
    );
  if (customer && card?.available === false)
    throw Error("This bouquet is currently unavailable.");
  let selectedPreset = shop.draft.preset;
  if (selectedPreset === "mixed") {
    const savedDesign =
      card?.design ||
      catalog.recipes.find(
        (row) => row.id === (card?.recipeId || q.get("recipe")),
      )?.design;
    selectedPreset = savedDesign
      ? designPreset(savedDesign, catalog)
      : q.get("flowers");
    if (!["fresh", "satin"].includes(selectedPreset)) {
      message(
        "What would you like to create?",
        "Choose your flowers to open the matching bouquet builder.",
      );
      const host = $("platformBoot");
      for (const [type, label] of [
        ["fresh", "Fresh flowers"],
        ["satin", "Satin flowers"],
      ]) {
        if (
          type === "satin" &&
          !shop.draft.enabledModes.some((mode) =>
            ["dome", "heart"].includes(mode),
          )
        )
          continue;
        if (
          customer &&
          !catalog.flowers.some(
            (row) =>
              row.preset === type &&
              !shop.draft.disabledFlowers.includes(row.id) &&
              cents(shop.draft.flowerPrices[row.id]),
          )
        )
          continue;
        const link = document.createElement("a"),
          url = new URL(location.href);
        url.searchParams.set("flowers", type);
        link.href = url.href;
        link.textContent = label + " →";
        link.className = "button";
        link.style.margin = "16px";
        host.append(link);
      }
      return;
    }
  }
  const d = {
    ...shop.draft,
    ...(exploring ? { disabledFlowers: [], disabledExtras: [] } : {}),
    preset: selectedPreset,
    enabledModes: shop.draft.enabledModes.filter(
      (mode) => selectedPreset !== "satin" || mode !== "classic",
    ),
  };
  const selectedPolicy = normalizePolicy(d, catalog);
  if (!selectedPolicy.ok)
    throw Error(
      selectedPolicy.issues[0]?.message ||
        "This flower collection is unavailable.",
    );
  policy = selectedPolicy.policy;
  const library = catalog.recipes.filter(
    (row) => row.preset === d.preset && policy.enabledModes.includes(row.mode),
  );
  window.NEBULA_SHOP = {
    id: "platform-" + id.replaceAll("_", "-").toLowerCase(),
    name: d.name.trim(),
    byline: d.tagline || "",
    currency: d.currency,
    demo: !customer,
    baseCents: 0,
    laborCents: { classic: 0, dome: 0, heart: 0 },
    flowerPrices: {},
    extrasCents: {},
    disabledFlowers: [],
    disabledExtras: [],
    enabledModes: policy.enabledModes,
    selectedRecipeIds: library.map((row) => row.id),
    requestChannel: "whatsapp",
    recipient: "",
    whatsapp: "",
    email: "",
    publicBaseUrl: location.origin + "/studio/",
    studio: {
      name: d.name.trim(),
      site: location.hostname,
      phone: "",
      instagram: "",
      place: clean(d.city, 80) ? d.city : "",
      year: String(new Date().getFullYear()),
    },
    theme: d.theme,
  };
  await branding(d);
  const manifest = await json(
    d.preset === "satin"
      ? "satin/runtime-manifest.json"
      : "runtime-manifest.json",
  );
  // async=false preserves execution order while all files download concurrently.
  await Promise.all(manifest.scripts.map(script));
  if (d.preset === "satin") {
    const price = NebulaModel.price;
    const [delivery] = await Promise.all([
      json("satin/art-delivery.json"),
      script("satin/runtime-data.js"),
    ]);
    for (const file of Object.keys(RAY_ART))
      window.NEBULA_EMBED["art/" + file] = new URL(
        "satin/art/" + (delivery[file] || file),
        import.meta.url,
      ).href;
    await script("satin/builder-runtime.js");
    NebulaModel.price = price;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "satin/builder-theme.css";
    document.head.append(css);
  }
  const polish = document.createElement("link");
  polish.rel = "stylesheet";
  polish.href = "/builder-polish.css";
  document.head.append(polish);
  let initial;
  if (trial) initial = mapDesignIds(trial.design, catalog, trial.preset);
  else if (blank)
    initial = newDesign(
      policy.enabledModes.includes(q.get("mode"))
        ? q.get("mode")
        : policy.enabledModes[0],
    );
  else {
    const recipe = library.find(
        (row) => row.id === (card?.recipeId || q.get("recipe")),
      ),
      design = card?.design || recipe?.design;
    if (!design) throw Error("This bouquet has no compatible saved recipe.");
    const r = validateDesign(design, d, catalog, { allowUnpriced: !customer });
    if (!r.ok)
      throw Error(
        r.issues[0]?.message ||
          "This bouquet needs attention in the shop catalogue.",
      );
    initial = mapDesignIds(r.design, catalog, d.preset);
    if (card?.title && !card.design) initial.title = card.title;
  }
  if (!configure(library, initial)(initial).ok)
    throw Error("This bouquet uses an unavailable catalogue option.");
  if (publicDemo) {
    Object.assign(NebulaI18n.en, {
      studio: "TRY THE BOUQUET BUILDER",
      demoEstimate: "DEMO · SAMPLE PRICES",
      sampleShort: "sample",
      separateHint: "Change a flower or colour, then preview the request.",
      priceDisclaimer: "Sample prices in USD. No order or payment is created.",
      saveHint:
        "Use this for my shop keeps your design in this tab while you create your account.",
    });
    Object.assign(NebulaI18n.es, {
      studio: "PRUEBA EL CREADOR DE RAMOS",
      demoEstimate: "DEMO · PRECIOS DE EJEMPLO",
      sampleShort: "ejemplo",
      separateHint: "Cambia una flor o un color y revisa la solicitud.",
      priceDisclaimer:
        "Precios de ejemplo en USD. No se crea ningún pedido ni pago.",
      saveHint:
        "Tu diseño se conserva en esta pestaña mientras creas tu cuenta.",
    });
  }
  const url = new URL(location.href);
  url.searchParams.delete("saved");
  url.searchParams.set("template", "platform-card");
  url.hash = "";
  history.replaceState(null, "", url);
  document.dispatchEvent(new Event("DOMContentLoaded"));
  await script(manifest.app);
  window.NebulaPlatformStudio = {
    shopId: id,
    cardId: card?.id || null,
    version: shop.version,
    preview: !customer,
    design: () => semantic(NebulaApp.state),
    price: () =>
      validateDesign(semantic(NebulaApp.state), designDraft(), catalog, {
        allowUnpriced: !customer,
      }).pricing,
  };
  toolbar();
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 45000;
    const check = () => {
      if (window.NebulaApp?.ready) return resolve();
      if (Date.now() >= deadline)
        return reject(
          Error("The bouquet artwork could not load. Please reload."),
        );
      setTimeout(check, 100);
    };
    check();
  });
  $("platformBoot").hidden = true;
  document.body.classList.remove("platform-loading");
  document.title = d.name + " — Bouquet studio";
  if (q.get("action") === "order") {
    // Consume the action once. Reloading or editing the design does not reopen
    // an old request form, and the owner route remains a non-submitting preview.
    const current = new URL(location.href);
    current.searchParams.delete("action");
    history.replaceState(null, "", current);
    const trigger = $(
      customer ? "platformRequestOrder" : "platformPreviewOrder",
    );
    if (trigger && !trigger.disabled) trigger.click();
  }
}
boot().catch((e) => {
  const login = e.status === 401 || e.statusCode === 401;
  message(
    login ? "Sign in to open your shop studio" : "The studio could not open",
    e.message || "Return to your shop and try again.",
    { login },
  );
});
