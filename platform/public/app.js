import { initialize, getUser, refreshUser, token, api } from "/session.js";
import { openOrderRequest } from "/order-ui.js";

const $ = (id) => document.getElementById(id);
const html = (value = "") =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const clone = (value) => structuredClone(value);
const main = $("main");
function safeReturnPath(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin &&
      /^(\/studio\/|\/s\/|\/admin(?:\/|$)|\/dashboard(?:\/|$))/.test(
        url.pathname,
      )
      ? url.pathname + url.search + url.hash
      : null;
  } catch {
    return null;
  }
}
let afterLogin =
  safeReturnPath(new URLSearchParams(location.search).get("returnTo")) ||
  (location.pathname.startsWith("/s/") ? location.pathname : "/dashboard");
let user, auth, authApi, config, shop, draft, catalog;
let sessionState = {},
  publicSnapshot = null,
  publicSlugLoaded = null;
let merchantRequests = null,
  requestsLoading = false;
let editorMode = true,
  mobilePreview = false,
  inspector = null,
  adminReadOnly = false;
let adminState = {
  users: [],
  nextCursor: null,
  query: "",
  detail: null,
  loading: false,
};
let version = null,
  dirty = false,
  saving = false,
  conflict = false,
  editRevision = 0;
let saveTimer,
  loginMode = "signin",
  wizardStep = 1,
  pageMessage = "";
let wizard = { name: "", slug: "", currency: "USD", preset: "fresh" };
let slugEdited = false;
const mediaCache = new Map();
const uploadJobs = new Set();
const tabs = [
  ["/dashboard", "Your overview", "◈"],
  ["/dashboard/editor", "Edit storefront", "✎"],
  ["/dashboard/shop", "Shop & brand", "✳"],
  ["/dashboard/prices", "Flowers & prices", "❀"],
  ["/dashboard/collection", "Your collection", "▦"],
  ["/dashboard/products", "Fixed products", "▧"],
  ["/dashboard/billing", "Plan & publishing", "◇"],
  ["/dashboard/payments", "Square & orders", "□"],
];
const currency = () => draft?.currency || shop?.draft?.currency || "USD";
const amount = (cents) => (cents == null ? "" : (cents / 100).toFixed(2));
const route = () => location.pathname.replace(/\/$/, "") || "/dashboard";
const studioLink = (card, order = false) =>
  "/studio/studio.html?" +
  new URLSearchParams({
    shop: shop.id,
    ...(card ? { card: card.id } : { blank: "1" }),
    ...(!user || publicSnapshot ? { slug: shop.slug } : {}),
    ...(order ? { action: "order" } : {}),
  });
const previewLink = () => "/s/" + encodeURIComponent(shop.slug);
const recipeFor = (card) =>
  catalog?.recipes.find((recipe) => recipe.id === card.recipeId);
const matchingRecipes = () =>
  (catalog?.recipes || []).filter(
    (recipe) => recipe.preset === (draft?.preset || wizard.preset),
  );
const matchingFlowers = () =>
  (catalog?.flowers || []).filter((item) => item.preset === draft?.preset);
const matchingExtras = () =>
  (catalog?.extras || []).filter(
    (item) => !item.preset || item.preset === draft?.preset,
  );
const presetReady = () =>
  catalog?.presets?.find((item) => item.id === draft?.preset)?.available ===
  true;
const isPaid = () => {
  const subscription = shop?.subscription;
  if (subscription?.status !== "active") return false;
  const expiry =
    subscription.paidUntil ??
    subscription.paidThrough ??
    subscription.expiresAt ??
    subscription.currentPeriodEnd;
  const time =
    typeof expiry === "number"
      ? expiry < 1e12
        ? expiry * 1000
        : expiry
      : Date.parse(expiry);
  return Number.isFinite(time) && time > Date.now();
};
const isPublished = () => !!shop?.published && isPaid();
const formatMoney = (value) =>
  value == null
    ? "Price on request"
    : new Intl.NumberFormat("en", {
        style: "currency",
        currency: currency(),
        maximumFractionDigits: 2,
      }).format(value / 100);
const newId = (prefix) =>
  prefix + "-" + crypto.randomUUID().replaceAll("-", "").slice(0, 16);
function normalizeDraft(value) {
  const result = clone(value);
  result.products ||= [];
  result.disabledExtras ||= [];
  result.disabledFlowers ||= [];
  result.flowerPrices ||= {};
  result.extrasCents ||= {};
  result.enabledModes ||= [
    ...new Set(
      (catalog?.recipes || [])
        .filter((item) => item.preset === result.preset)
        .map((item) => item.mode),
    ),
  ];
  result.home = {
    headline: "For your kind of beautiful.",
    description:
      result.tagline ||
      "Thoughtful flowers, made personal. Find a favourite or create something all your own.",
    heroMediaId: null,
    about: "",
    sections: ["custom", "products", "builder", "about", "contact"],
    ...result.home,
  };
  result.collection = (result.collection || []).map((item) => ({
    available: true,
    category: "",
    ...item,
  }));
  result.products = result.products.map((item) => ({
    available: true,
    category: "",
    description: "",
    cover: null,
    priceCents: null,
    ...item,
  }));
  return result;
}
function announce(text) {
  $("announcement").textContent = text;
}
function errorText(error) {
  const code = error?.code;
  if (code === "auth/unauthorized-domain")
    return "Sign-in is not enabled for this website address yet. The beta owner needs to authorize this domain in Firebase.";
  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  )
    return "Google sign-in was closed. You can try again when you are ready.";
  if (
    [
      "auth/invalid-credential",
      "auth/user-not-found",
      "auth/wrong-password",
    ].includes(code)
  )
    return "That email and password did not match. Please try again or reset your password.";
  if (code === "auth/email-already-in-use")
    return "An account already uses this email. Sign in or reset your password.";
  if (code === "auth/too-many-requests")
    return "Too many attempts. Please wait a little before trying again.";
  if (code === "auth/weak-password")
    return "Choose a stronger password with at least 10 characters.";
  if (code === "auth/operation-not-allowed")
    return "This sign-in method is still being connected for the private beta.";
  return (
    error?.message ||
    "Something interrupted the request. Your unsaved changes are still here."
  );
}
function showMessage(text, error = false, id = "pageMessage") {
  const element = $(id);
  if (element) {
    element.textContent = text;
    element.classList.toggle("error", error);
    element.hidden = !text;
  }
  announce(text);
}
function accountNav() {
  $("accountNav").innerHTML = user
    ? `<a class="plain-button" href="/dashboard" data-nav>My shop</a>${sessionState.isAdmin ? '<a class="plain-button" href="/admin" data-nav>Admin</a>' : ""}<span class="account-email">${html(user.email)}</span><button class="plain-button" data-action="signout">Sign out</button>`
    : `<a class="plain-button" href="/login" data-nav>Sign in <span aria-hidden="true">↗</span></a>`;
}
async function navigate(path, replace = false) {
  if (publicSnapshot && !path.startsWith("/s/") && user?.emailVerified) {
    publicSnapshot = null;
    await loadSession();
  }
  inspector = null;
  if (adminReadOnly && !path.includes("adminShop=")) {
    await loadSession();
    adminReadOnly = false;
  }
  if (replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  render();
  window.scrollTo({ top: 0 });
  main.focus({ preventScroll: true });
}
function notice() {
  return `<div id="pageMessage" class="notice${conflict ? " error" : ""}" role="status" ${!pageMessage ? "hidden" : ""}>${html(pageMessage)}</div>${conflict ? `<div class="notice error"><strong>Your edited fields have been kept.</strong><p class="helper">The shop changed in another window. Reload the latest saved version before editing again. Download your current edits if you want to keep a copy.</p><div class="conflict-actions"><button class="button secondary small" data-action="download-draft">Download my edits</button><button class="button small" data-action="reload-draft">Reload saved version</button></div></div>` : ""}`;
}
function saveControls() {
  return `<div class="save-bar"><span class="save-state" id="saveState">${saving ? "Saving…" : conflict ? "Changes need review" : dirty ? "Unsaved changes" : "All changes saved"}</span><button class="button small" data-action="save" ${saving || conflict || !dirty ? "disabled" : ""}>Save changes <span aria-hidden="true">↗</span></button></div>`;
}
function field(
  label,
  path,
  {
    type = "text",
    max = 120,
    placeholder = "",
    full = false,
    value,
    required = false,
  } = {},
) {
  const current =
    value ?? path.split(".").reduce((result, key) => result?.[key], draft);
  return `<label class="field${full ? " full" : ""}">${label}<input type="${type}" data-path="${path}" value="${html(current)}" maxlength="${max}" placeholder="${html(placeholder)}" ${required ? "required" : ""}></label>`;
}
function shell(content, heading, description, eyebrow = "YOUR FLOWER SHOP") {
  const current = route();
  main.innerHTML = `<div class="workspace"><aside class="sidebar"><div class="shop-mini"><div class="shop-monogram">${html((draft.name || "N").slice(0, 1))}</div><div><strong>${html(draft.name)}</strong><small>${adminReadOnly ? "Administrator preview" : isPublished() ? "Published shop" : "Private draft"}</small></div></div><nav class="sidebar-nav" aria-label="Shop settings">${tabs.map(([path, name, icon]) => `<a href="${path}" data-nav class="${current === path ? "active" : ""}" ${current === path ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span>${name}</a>`).join("")}</nav><div class="sidebar-bottom"><strong>${isPaid() ? "A space of your own." : "Free to find your finishing touches."}</strong><p>${isPaid() ? "Your paid plan lets you publish when your shop is ready. Square is optional." : "Your preview stays private. Activate the $29 monthly plan when you’re ready to publish."}</p><a href="${previewLink()}" data-nav class="plain-button">Visit my preview ↗</a></div></aside><section class="dashboard-content"><div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${heading}</h1><p class="subtle">${description}</p></div>${adminReadOnly ? '<span class="pill">READ ONLY</span>' : saveControls()}</div>${notice()}${content}</section></div>`;
  hydrateMedia();
}

function renderLogin() {
  const signup = loginMode === "signup";
  main.innerHTML = `<div class="login-layout"><section class="login-story"><p class="eyebrow">A LITTLE SPACE FOR YOUR FLOWER SHOP</p><h1>Your flowers.<br>Your name.<br><em>A beautiful beginning.</em></h1><p class="subtle">Bring your collection together, make it feel like you, and explore your very own bouquet studio.</p><div class="story-image"><img src="/assets/studio-pink.webp" alt="Soft pink roses and delicate white flowers, wrapped in ivory paper" width="928" height="1152"></div><div class="story-caption"><span>YOUR CRAFT. THEIR IMAGINATION.</span><span>✳</span></div></section><section class="auth-card"><p class="eyebrow">${signup ? "LET’S GET ACQUAINTED" : "WELCOME TO YOUR STUDIO"}</p><h2>${signup ? "Something lovely starts here." : "A little more you."}</h2><p class="subtle">${signup ? "Create your account and start your free private shop preview." : "Sign in to pick up where your flowers left off."}</p><div id="authMessage" class="notice" role="status" hidden></div><button class="google-button" data-action="google"><span class="google-icon" aria-hidden="true">G</span>Continue with Google</button><div class="divider">or use your email</div><form id="authForm"><label class="field">Email address<input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@yourflowershop.com" required></label><label class="field"><span class="password-heading">Password${signup ? "" : '<button class="plain-button" type="button" data-action="reset">Forgot password?</button>'}</span><input id="password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" ${signup ? 'minlength="10"' : ""} required placeholder="${signup ? "At least 10 characters" : "Your password"}"></label><button type="submit" class="button">${signup ? "Create my account" : "Step into my studio"}<span aria-hidden="true">↗</span></button></form><p class="auth-bottom">${signup ? "Already have an account?" : "New around here?"} <button class="plain-button" data-action="auth-mode">${signup ? "Sign in" : "Create an account"}</button></p><p class="beta-note">Your private preview is free. Creating an account does not activate a paid subscription or open customer orders.</p></section></div>`;
}
function renderVerification() {
  main.innerHTML = `<section class="setup-form"><div class="auth-card"><div class="verification-icon" aria-hidden="true">✉</div><p class="eyebrow">ONE LITTLE STEP FIRST</p><h1>Check your inbox.</h1><p class="subtle">Verify <strong>${html(user.email)}</strong> before opening your shop. Follow the link in your verification email, then come back here.</p><div id="authMessage" class="notice" role="status" hidden></div><div class="actions"><button class="button" data-action="check-verification">I’ve verified my email <span aria-hidden="true">↗</span></button><button class="button secondary" data-action="send-verification">Send verification email</button></div><p class="helper">Email is sent only when you request it. Check your spam folder if it hasn’t arrived.</p></div></section>`;
}
function renderRestricted(message) {
  main.innerHTML = `<section class="empty-screen"><div class="lock-icon" aria-hidden="true">✧</div><p class="eyebrow">A SMALL, PRIVATE BETA</p><h1>Your invitation<br>comes <em>first.</em></h1><p class="subtle" style="max-width:430px">${html(message)}</p><p class="helper">Signed in as ${html(user?.email || "your account")}. Shop access is limited to the invited beta accounts.</p><div class="actions" style="margin-top:24px"><button class="button" data-action="retry-session">Check access again</button><button class="button secondary" data-action="signout">Use another account</button></div></section>`;
}
function renderWizard() {
  main.innerHTML = `<section class="setup-form"><p class="eyebrow">YOUR SHOP, TAKING SHAPE</p><h1>Make a little<br><em>room for your flowers.</em></h1><p class="subtle">Start with the essentials. Your shop stays private while you find your finishing touches.</p><div class="step-indicator"><i class="active"></i><i class="${wizardStep === 2 ? "active" : ""}"></i><span>STEP ${wizardStep} OF 2 · ${wizardStep === 1 ? "YOUR SHOP" : "YOUR FLOWERS"}</span></div><div id="pageMessage" class="notice" role="status" hidden></div><form id="createShopForm" class="surface">${wizardStep === 1 ? `<h2>First, a name.</h2><p class="subtle">A familiar name, in a new creative space.</p><div class="form-grid"><label class="field full">Shop name<input id="shopName" data-wizard="name" value="${html(wizard.name)}" maxlength="80" placeholder="The Little Flower Room" required></label><label class="field full">Your shop link<input id="shopSlug" data-wizard="slug" value="${html(wizard.slug)}" minlength="3" maxlength="48" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="the-little-flower-room" required><span class="helper">${html(location.host)}/s/<span id="slugPreview">${html(wizard.slug || "your-shop-name")}</span> · Choose carefully; this becomes your shop address.</span></label><label class="field">Your shop currency<select data-wizard="currency"><option value="USD" ${wizard.currency === "USD" ? "selected" : ""}>USD · US dollar</option><option value="CAD" ${wizard.currency === "CAD" ? "selected" : ""}>CAD · Canadian dollar</option></select></label></div><div class="form-footer"><span class="helper">One account. One thoughtfully made shop.</span><button class="button" type="submit">Choose my flowers <span aria-hidden="true">→</span></button></div>` : `<h2>What do you make?</h2><p class="subtle">Choose the collection that feels closest to your craft.</p><div class="preset-grid"><label class="preset-option"><input type="radio" name="preset" value="fresh" data-wizard="preset" ${wizard.preset === "fresh" ? "checked" : ""}><span class="preset-symbol" aria-hidden="true">❀</span><strong>Fresh flowers</strong><span>Real flower artwork and ready-to-edit recipes. Your bouquet studio is ready to explore.</span><span class="pill green" style="display:inline-flex;margin-top:14px">Ready for the beta</span></label><label class="preset-option"><input type="radio" name="preset" value="satin" data-wizard="preset" ${wizard.preset === "satin" ? "checked" : ""}><span class="preset-symbol" aria-hidden="true">✿</span><strong>Satin & eternal</strong><span>Satin flower artwork, ready-to-edit recipes and a studio for lasting little moments.</span><span class="pill green" style="display:inline-flex;margin-top:14px">Satin & eternal collection</span></label></div><p class="helper">Start with a free private preview. Activate your $29 monthly plan when you are ready to publish.</p><div class="form-footer"><button class="plain-button" type="button" data-action="wizard-back">← Back to my shop</button><button class="button" type="submit">Create my private shop <span aria-hidden="true">↗</span></button></div>`}</form></section>`;
}
function renderOverview() {
  const priced = matchingFlowers().filter(
    (item) =>
      !draft.disabledFlowers.includes(item.id) &&
      Number.isInteger(draft.flowerPrices[item.id]),
  ).length;
  const checks = [
    [
      !!(draft.name && draft.phone),
      "Your shop identity",
      "Add your name, colour and contact details.",
      "/dashboard/shop",
    ],
    [
      priced > 0,
      "Your flower library",
      "Choose the flowers and prices you offer.",
      "/dashboard/prices",
    ],
    [
      draft.collection.length + draft.products.length > 0,
      "Your first collection",
      "Add recipes to customise and products ready to order.",
      "/dashboard/collection",
    ],
    [
      isPublished(),
      "Your opening day",
      "Activate your plan, then publish when you’re ready.",
      "/dashboard/billing",
    ],
  ];
  shell(
    `<section class="surface welcome-card"><div class="welcome-copy"><p class="eyebrow">YOUR BUSINESS, IN BLOOM</p><h2>A lovely shop.<br><em>Made your own.</em></h2><p>Set the scene, curate your flowers and invite a little imagination. Your next chapter starts here.</p><div class="actions"><a class="button" href="/dashboard/editor" data-nav>Edit my storefront ↗</a><a class="plain-button" href="${previewLink()}" data-nav>Preview my shop</a></div></div><div class="welcome-art"><img src="/assets/studio-pink.webp" alt="Blush rose bouquet in ivory wrapping"></div></section><div class="stats-grid"><div class="surface stat"><span class="label">CUSTOMISABLE BOUQUETS</span><strong>${draft.collection.length}<span class="stat-limit"> / 6</span></strong><p>Recipes with a personal touch</p></div><div class="surface stat"><span class="label">FIXED PRODUCTS</span><strong>${draft.products.length}<span class="stat-limit"> / 10</span></strong><p>Exactly as you make them</p></div><div class="surface stat"><span class="label">YOUR SHOP STATUS</span><strong class="status-word">${isPublished() ? "Live" : isPaid() ? "Ready" : "Private"}</strong><p>${isPublished() ? "Your published shop is open" : isPaid() ? "Your plan is active; publish when ready" : "Free preview · activate to publish"}</p></div></div><div class="overview-grid"><section class="surface"><div class="section-heading"><div><h2>A few finishing touches.</h2><p class="subtle">A clear path to your opening day.</p></div><span class="pill">${checks.filter((item) => item[0]).length} of 4</span></div><ol class="checklist">${checks.map(([done, title, note, path]) => `<li><span class="check-circle ${done ? "done" : ""}">${done ? "✓" : "○"}</span><div><strong>${title}</strong><p>${note}</p></div><a href="${path}" data-nav aria-label="${title}">↗</a></li>`).join("")}</ol></section><section class="surface draft-card"><p class="tiny-label">A LITTLE ROOM TO CREATE</p><h3>Start with a blank canvas.</h3><p class="subtle">Open your independent bouquet builder. This entry is separate from every product and collection card.</p><a class="button secondary" href="${studioLink(null)}" data-studio ${!presetReady() ? 'aria-disabled="true"' : ""}>Open Builder ✳</a><p class="helper">${presetReady() ? "Your offered flowers, your prices and your imagination." : "The matching studio is being prepared for this preset."}</p><div class="preview-link"><span>${html(location.host + previewLink())}</span><a href="${previewLink()}" data-nav aria-label="Preview shop">↗</a></div></section></div>`,
    "Welcome to<br><em>your little flower shop.</em>",
    "Everything you need to make a beautiful beginning.",
  );
}

function renderBrand() {
  shell(
    `<section class="surface"><div class="section-heading"><div><h2>A name they’ll remember.</h2><p class="subtle">The familiar details that make this space yours.</p></div><a class="button secondary small" href="/dashboard/editor" data-nav>Edit on the page ↗</a></div><div class="form-grid">${field("Shop name", "name", { max: 80, required: true })}${field("A little introduction", "tagline", { max: 160 })}${field("City or neighbourhood", "city", { max: 80 })}${field("Phone or WhatsApp", "phone", { type: "tel", max: 40 })}${field("Instagram", "instagram", { max: 120 })}<label class="field">Your permanent shop link<input value="${html(location.host + previewLink())}" disabled></label></div></section><section class="surface"><h2>Your signature.</h2><div class="media-row"><div class="logo-preview">${draft.logoMediaId ? `<img data-media-id="${html(draft.logoMediaId)}" alt="Your shop logo">` : "✳"}</div><div>${uploadField("logo", null, 1, "Choose a logo")}${draft.logoMediaId ? '<button class="plain-button" data-action="remove-logo">Remove logo</button>' : ""}<p class="helper">PNG, JPEG or WebP · automatically resized to 80 KB.</p></div></div><div class="colour-fields">${[
      ["primary", "Signature colour"],
      ["background", "Paper colour"],
    ]
      .map(
        ([key, label]) =>
          `<label class="colour-control"><input type="color" data-path="theme.${key}" value="${html(draft.theme[key])}" aria-label="${label}"><div><strong>${label}</strong><span data-colour-label="${key}">${html(draft.theme[key]).toUpperCase()}</span></div></label>`,
      )
      .join(
        "",
      )}</div></section><section class="surface"><h2>Made for your craft.</h2><label class="field">Flower preset<select data-preset ${shop.published ? "disabled" : ""}>${(catalog.presets || []).map((item) => `<option value="${html(item.id)}" ${draft.preset === item.id ? "selected" : ""}>${html(item.name)}${item.available ? "" : " · studio preparing"}</option>`).join("")}</select></label><p class="helper">${shop.published ? "Your preset is fixed after your first publication to keep saved customer designs consistent." : "You can change your preset before publishing. Existing recipes and pricing will never be silently removed. Remove incompatible items first, then choose your new preset."} Your currency is ${currency()}.</p><div class="mode-options"><span class="tiny-label">BUILDER MODES</span>${[...new Set(matchingRecipes().map((item) => item.mode))].map((mode) => `<label class="toggle-line"><input type="checkbox" data-mode="${html(mode)}" ${draft.enabledModes.includes(mode) ? "checked" : ""}>${html(mode.charAt(0).toUpperCase() + mode.slice(1))}</label>`).join("") || '<p class="helper">Matching modes will appear when the library is available.</p>'}</div></section>`,
    "The details that<br>make it <em>you.</em>",
    "Your name, your colours, your way of saying hello.",
    "SHOP & BRAND",
  );
}
function priceRows(items, extras = false) {
  return items
    .map((item) => {
      const disabled = (
        extras ? draft.disabledExtras : draft.disabledFlowers
      ).includes(item.id);
      const value = (extras ? draft.extrasCents : draft.flowerPrices)[item.id];
      return `<tr data-price-row data-search="${html((item.en || item.label || item.id).toLowerCase())}" class="${disabled ? "unavailable" : ""}"><td><input type="checkbox" data-${extras ? "extra" : "flower"}-enabled="${html(item.id)}" aria-label="Offer ${html(item.en || item.label || item.id)}" ${disabled ? "" : "checked"}></td><td><div class="asset-name">${item.image ? `<img src="${html(item.image)}" alt="" loading="lazy">` : ""}<div>${html(item.en || item.label || item.id)}<small>${html((item.group || item.family || (extras ? "Finishing touch" : "Flower")).replaceAll("_", " "))}</small></div></div></td><td><input class="price-input" type="number" min="0" max="10000" step="0.01" inputmode="decimal" data-${extras ? "extra" : "flower"}-price="${html(item.id)}" aria-label="${html(item.en || item.label || item.id)} price in ${currency()}" value="${amount(value)}" placeholder="Set price"></td></tr>`;
    })
    .join("");
}
function renderPrices() {
  const flowers = matchingFlowers(),
    extras = matchingExtras();
  const groups = [...new Set(flowers.map((item) => item.group || "flowers"))];
  shell(
    `${!presetReady() ? '<div class="notice">Your matching studio is preparing. You can save brand details and products now. We only show assets belonging to your chosen preset.</div>' : ""}${flowers.length ? `<section class="surface"><div class="section-heading"><div><h2>Your flowers. Your prices.</h2><p class="subtle">Choose what you offer. Enter a price per stem in ${currency()}.</p></div><span class="pill">${currency()}</span></div><div class="price-toolbar"><input id="flowerSearch" type="search" placeholder="Find a flower…" aria-label="Search flowers"><button class="plain-button" data-action="sample-prices">Use sample prices</button></div>${groups.map((group) => `<h3 class="catalogue-group">${html(group.replaceAll("_", " "))}</h3><table class="price-table"><thead><tr><th>OFFER</th><th>FLOWER</th><th>PER STEM · ${currency()}</th></tr></thead><tbody>${priceRows(flowers.filter((item) => (item.group || "flowers") === group))}</tbody></table>`).join("")}<p id="noFlowers" class="helper" hidden>No flowers match your search.</p></section>` : '<section class="surface"><h2>A library, taking shape.</h2><p class="subtle">Matching flowers are not available in this preset yet.</p></section>'}${extras.length ? `<section class="surface"><h2>The finishing touches.</h2><p class="subtle">Toggle availability and set your own prices for extras.</p><table class="price-table"><thead><tr><th>OFFER</th><th>EXTRA</th><th>PRICE · ${currency()}</th></tr></thead><tbody>${priceRows(extras, true)}</tbody></table></section>` : ""}`,
    "Every stem,<br><em>thoughtfully priced.</em>",
    "Your catalogue is shared. What you offer is entirely yours.",
    "FLOWERS & PRICES",
  );
}
function uploadField(kind, id, slot, label = "Change photo") {
  const inputId = `upload-${kind}-${id || slot}`;
  return `<input type="file" id="${html(inputId)}" accept="image/png,image/jpeg,image/webp" data-upload="${slot}" data-kind="${kind}" ${id ? `data-card="${html(id)}"` : ""} hidden><label class="button secondary small" for="${html(inputId)}">${label} ↑</label>`;
}
function itemField(label, kind, item, key, type = "text", max = 160) {
  const value = key === "priceCents" ? amount(item[key]) : item[key];
  return `<label class="field">${label}${type === "textarea" ? `<textarea data-item-kind="${kind}" data-item-id="${html(item.id)}" data-item-key="${key}" maxlength="${max}">${html(value)}</textarea>` : `<input type="${type}" data-item-kind="${kind}" data-item-id="${html(item.id)}" data-item-key="${key}" value="${html(value)}" ${type === "number" ? 'min="0" max="10000" step="0.01" inputmode="decimal"' : 'maxlength="' + max + '"'} ${key === "title" ? "required" : ""}>`}</label>`;
}

function cover(card, className = "cover-preview") {
  const recipe = recipeFor(card);
  return `<div class="${className}">${card.cover ? `<img data-media-id="${html(card.cover)}" alt="${html(card.title)} cover">` : recipe?.cover ? `<img src="${html(recipe.cover)}" alt="${html(card.title)} recipe preview" loading="lazy">` : '<span class="cover-placeholder" aria-hidden="true">✿</span>'}${className === "cover-preview" ? `<span class="cover-label">${card.cover ? "YOUR PHOTO" : recipe?.cover ? "RECIPE PREVIEW" : "A LITTLE INSPIRATION"}</span>` : ""}</div>`;
}
function recipeSelect(card) {
  return `<label class="field">Editable recipe<select data-card-recipe="${html(card.id)}">${card.design ? '<option value="__design" selected>My saved studio design</option>' : ""}${matchingRecipes()
    .map(
      (recipe) =>
        `<option value="${html(recipe.id)}" ${card.recipeId === recipe.id && !card.design ? "selected" : ""}>${html(recipe.name)} · ${html(recipe.mode)}</option>`,
    )
    .join("")}</select></label>`;
}
function availability(kind, item) {
  return `<label class="toggle-line"><input type="checkbox" data-item-kind="${kind}" data-item-id="${html(item.id)}" data-item-key="available" ${item.available !== false ? "checked" : ""}>Available in my shop</label>`;
}
function renderCollection() {
  const recipes = matchingRecipes();
  shell(
    `<div class="collection-intro"><div><span class="pill">${draft.collection.length} / 6 CARDS</span><p class="subtle">Custom Order and Customise begin with the same saved recipe. Add only the starting points you want to offer.</p></div><a class="button secondary small" href="${studioLink(null)}" data-studio ${presetReady() ? "" : 'aria-disabled="true"'}>Open blank Builder ↗</a></div><div class="collection-grid">${draft.collection.map((card, index) => `<article class="surface collection-editor">${cover(card)}<div class="collection-body"><div class="item-heading"><p class="tiny-label">CUSTOMISABLE ${String(index + 1).padStart(2, "0")}</p><button class="plain-button danger" data-action="remove-card" data-id="${html(card.id)}">Remove</button></div>${itemField("Bouquet name", "collection", card, "title", "text", 80)}${itemField("Category", "collection", card, "category", "text", 40)}${recipeSelect(card)}${availability("collection", card)}<div class="collection-actions">${uploadField("cover", card.id, index + 2)}${presetReady() ? `<a href="${studioLink(card)}" data-studio>Edit recipe ↗</a>` : ""}</div><p class="helper">${card.cover ? "Your cover photo. Check that it represents the saved recipe." : card.design ? "Starting recipe preview. Upload a photo of your saved design for an accurate cover." : "Library recipe preview. Your own photo is optional."}</p>${card.cover ? `<button class="plain-button" data-action="remove-cover" data-card="${html(card.id)}">Use recipe preview</button>` : ""}</div></article>`).join("")}</div><section class="surface recipe-library"><div class="section-heading"><div><p class="eyebrow">THE SHARED RECIPE LIBRARY</p><h2>Choose your next starting point.</h2><p class="subtle">Every card stays yours to name, customise, hide or remove.</p></div></div>${recipes.length ? `<div class="recipe-picker">${recipes.map((recipe) => `<article><img src="${html(recipe.cover)}" alt="${html(recipe.name)} library recipe" loading="lazy"><strong>${html(recipe.name)}</strong><small>${html(recipe.mode)}</small><button class="button secondary small" data-action="add-card" data-recipe="${html(recipe.id)}" ${draft.collection.length >= 6 ? "disabled" : ""}>Add to collection +</button></article>`).join("")}</div>` : '<p class="subtle">No compatible recipes yet. We will never substitute another preset or add cards automatically.</p>'}</section>`,
    "Your signature<br><em>starting points.</em>",
    "Up to six customisable bouquets, each with its own recipe.",
    "YOUR COLLECTION",
  );
}
function renderProducts() {
  shell(
    `<div class="collection-intro"><div><span class="pill">${draft.products.length} / 10 PRODUCTS</span><p class="subtle">Offer bouquets, gifts and arrangements exactly as photographed. These products have a fixed price and do not open a custom recipe.</p></div><button class="button" data-action="add-product" ${draft.products.length >= 10 ? "disabled" : ""}>Add product +</button></div>${draft.products.length ? `<div class="collection-grid">${draft.products.map((item, index) => `<article class="surface collection-editor">${productCover(item)}<div class="collection-body"><div class="item-heading"><p class="tiny-label">PRODUCT ${String(index + 1).padStart(2, "0")}</p><button class="plain-button danger" data-action="remove-product" data-id="${html(item.id)}">Remove</button></div>${itemField("Product name", "products", item, "title", "text", 80)}${itemField("Description", "products", item, "description", "textarea", 400)}<div class="form-grid">${itemField("Fixed price · " + currency(), "products", item, "priceCents", "number")}${itemField("Category", "products", item, "category", "text", 40)}</div>${availability("products", item)}<div class="collection-actions">${uploadField("product", item.id, index + 8)}${item.cover ? `<button class="plain-button" data-action="remove-product-cover" data-id="${html(item.id)}">Remove photo</button>` : ""}</div></div></article>`).join("")}</div>` : '<section class="surface product-empty"><span aria-hidden="true">❀</span><h2>Your first little favourite.</h2><p class="subtle">Add a photo, a name and a price. A beautiful collection starts with one.</p><button class="button secondary" data-action="add-product">Create my first product +</button></section>'}`,
    "Beautiful, just<br><em>as you make it.</em>",
    "Up to ten fixed products, with your photos and prices.",
    "FIXED PRODUCTS",
  );
}
function productCover(item, className = "cover-preview") {
  return `<div class="${className} product-photo">${item.cover ? `<img data-media-id="${html(item.cover)}" alt="${html(item.title)}">` : '<span class="cover-placeholder" aria-hidden="true">❀</span>'}${className === "cover-preview" ? `<span class="cover-label">${item.cover ? "YOUR PRODUCT PHOTO" : "ADD YOUR PRODUCT PHOTO"}</span>` : ""}</div>`;
}

function renderBilling() {
  const paid = isPaid(),
    active = isPublished();
  const billingReady = config.billingEnabled === true;
  const test =
    config.billingEnvironment === "test" ||
    config.billingMode === "test" ||
    config.providers?.billing === "test";
  const readiness = shop.readiness || [];
  const canPublish =
    paid &&
    config.publishingEnabled === true &&
    !readiness.some(
      (item) =>
        item.blocking !== false &&
        !["square_setup_pending", "square_not_connected"].includes(item.code),
    );
  shell(
    `<div class="activation-grid"><section class="surface plan-surface"><p class="eyebrow">YOUR OWN NEBULA SHOP</p><h2>Make a beautiful<br>beginning.</h2><div class="plan-price"><strong>$29</strong><span>USD / month</span></div><p class="helper">${paid ? "Your subscription is active." : "Start with a free private preview. Activate only when you’re ready to publish."}</p><ul class="feature-list"><li>A branded public storefront</li><li>Six customisable bouquet cards</li><li>Ten fixed products with your own photos</li><li>Your flower library, prices and bouquet builder</li><li>Optional Square connection for customer payments</li></ul>${paid ? `<button class="button light" data-action="billing-portal" ${config.billingPortalEnabled === false ? "disabled" : ""}>Manage subscription ↗</button>` : `<button class="button light" data-action="billing-checkout" ${!billingReady ? "disabled" : ""}>${billingReady ? (test ? "Test checkout · $29 / month" : "Activate my shop · $29 / month") : "Activation setup pending"}</button>`}<p class="helper">${billingReady ? (test ? "Test environment. This checkout does not represent a live paid launch." : "Secure subscription checkout. Your plan activates after the provider confirms payment.") : "Your free preview is ready. Secure billing is being connected; activation is unavailable until setup is complete."}</p></section><section class="surface"><span class="pill ${paid ? "green" : ""}">${active ? "PUBLISHED" : paid ? "PLAN ACTIVE" : "FREE PRIVATE PREVIEW"}</span><h2 style="margin-top:24px">Your opening day,<br>on your terms.</h2><p class="subtle">Saving edits updates your private draft. Publish a complete version when you want your customers to see it.</p><ol class="checklist"><li><span class="check-circle ${paid ? "done" : ""}">${paid ? "✓" : "○"}</span><div><strong>${paid ? "Plan active" : "Activate your plan"}</strong><p>Hosted storefront · $29 USD per month.</p></div></li><li><span class="check-circle ${active ? "done" : ""}">${active ? "✓" : "○"}</span><div><strong>${active ? "Your shop is published" : "Publish your chosen draft"}</strong><p>Square is optional and never required to publish.</p></div></li></ol>${
      readiness.length
        ? `<div class="readiness-list">${readiness
            .filter(
              (item) =>
                !["square_setup_pending", "square_not_connected"].includes(
                  item.code,
                ),
            )
            .map(
              (item) =>
                `<p class="helper">○ ${html(item.message || item.code)}</p>`,
            )
            .join("")}</div>`
        : ""
    }<button class="button" data-action="publish-shop" ${!canPublish ? "disabled" : ""}>${active ? "Publish latest changes" : "Publish my shop"} ↗</button><p class="helper">${!paid ? "Your public address remains locked until your subscription is verified and you publish." : !config.publishingEnabled ? "Publication setup is pending. Your active plan does not bypass the server’s publication checks." : "Publication saves a separate snapshot. Later draft edits stay private."}</p></section></div><section class="surface domain-plan"><div><span class="pill">COMING LATER</span><h3>Your own domain · $35 USD / month</h3><p class="subtle">A future option for your own website address. Domain registration and renewal are paid by you, separately.</p><p class="helper">Domain setup and verification are being tested. This plan is not available to purchase yet.</p></div><button class="button secondary" disabled>Own-domain setup preparing</button></section>`,
    "A beautiful space.<br><em>A clear next step.</em>",
    "Free to preview. $29 per month to activate and publish.",
    "PLAN & PUBLISHING",
  );
}
function renderPayments() {
  const paid = isPaid(),
    squareReady =
      config.squareEnabled === true ||
      config.providers?.square === "configured";
  const connected = shop.square?.status === "connected";
  shell(
    `<div class="activation-grid"><section class="surface"><div class="connection-mark" aria-hidden="true">□</div><span class="pill ${connected ? "green" : ""}">${connected ? "CONNECTED" : paid ? "CONNECTION PENDING" : "AVAILABLE AFTER ACTIVATION"}</span><h2 style="margin-top:23px">Your sales.<br>Your Square account.</h2><p class="subtle">Square is an optional way to collect your customers’ bouquet payments. It is separate from your Nebula subscription and is never required to publish.</p><button class="button" data-action="square-connect" ${!paid || !squareReady ? "disabled" : ""}>${connected ? "Manage Square connection" : !paid ? "Activate your shop first" : squareReady ? "Connect Square ↗" : "Square connection setup pending"}</button><p class="helper">${!paid ? "You can build and preview your shop for free. Activate the $29 plan before connecting customer payments." : !squareReady ? "Your plan is active. Square provider setup is still pending; customer card payments remain unavailable." : "Only your verified merchant connection can enable card payments. Country, currency and fulfillment checks apply."}</p></section><section class="surface"><p class="eyebrow">CUSTOMER ORDERS</p><h2>A little room<br>for future bouquets.</h2><p class="subtle">${!paid ? "Your private preview cannot submit a successful customer order or payment." : connected ? "Customer payment availability is controlled by your verified connection and published shop." : "Your shop can be published while Square is being connected. Customer card checkout will stay unavailable until it is verified."}</p><div class="notice">A saved design is a creative preview. It is never a payment confirmation.</div><a class="button secondary small" href="${previewLink()}" data-nav>Preview my shop ↗</a></section></div>`,
    "The craft is yours.<br><em>The payments, too.</em>",
    "Optional customer payments, connected to your own merchant account.",
    "SQUARE & ORDERS",
  );
  const container = document.createElement("section");
  container.className = "surface merchant-requests";
  container.innerHTML = `<div class="section-heading"><div><p class="eyebrow">SAVED CUSTOMER REQUESTS</p><h2>The next little occasion.</h2></div><button class="plain-button" data-action="refresh-requests">Refresh ↻</button></div>${merchantRequests ? `<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>REQUEST / CUSTOMER</th><th>DETAILS</th><th>SERVER TOTAL</th><th>STATUS</th></tr></thead><tbody>${merchantRequests.map((request) => `<tr><td><strong>${html(request.customer?.name || request.id)}</strong><span>${html(request.customer?.phone || "")}</span><small>${html(request.id)}</small></td><td>${html(request.product?.title || request.snapshot?.title || request.summary?.title || (typeof request.summary === "string" ? request.summary : "Custom bouquet"))}<small>${html(request.fulfillment || "")} ${html(request.customer?.date || "")}</small>${request.customer?.note ? `<p class="helper">${html(request.customer.note)}</p>` : ""}</td><td>${formatMoney(request.totalCents)}</td><td><span class="pill">${html(request.status || "requested")}</span><small>Unpaid request</small></td></tr>`).join("") || '<tr><td colspan="4">Your saved customer requests will appear here.</td></tr>'}</tbody></table></div>` : '<p class="subtle">Loading your customer requests…</p>'}`;
  main.querySelector(".dashboard-content").append(container);
  if (merchantRequests === null && !requestsLoading) loadMerchantRequests();
}
async function loadMerchantRequests() {
  requestsLoading = true;
  try {
    const data = await api(
      "/api/shops/" + encodeURIComponent(shop.id) + "/requests",
    );
    merchantRequests = data.requests || [];
  } catch (error) {
    merchantRequests = [];
    pageMessage = errorText(error);
  } finally {
    requestsLoading = false;
    if (route() === "/dashboard/payments") renderPayments();
  }
}
function renderLocked() {
  main.innerHTML = `<section class="empty-screen"><div class="lock-icon" aria-hidden="true">✧</div><p class="eyebrow">SOMETHING BEAUTIFUL IS TAKING SHAPE</p><h1>A little patience.<br><em>A little magic.</em></h1><p class="subtle" style="max-width:420px">This shop isn’t open to the public yet. The owner can sign in to continue their private preview.</p><a class="button" href="${user ? "/dashboard" : "/login?returnTo=" + encodeURIComponent(location.pathname)}" data-nav>${user ? "Back to my dashboard" : "Owner sign-in"} ↗</a></section>`;
}
function editAttribute(target, editing) {
  return editing && editorMode && !adminReadOnly
    ? `data-edit="${html(target)}" tabindex="0" role="button" aria-label="Edit ${html(target.split(":")[0])}"`
    : "";
}
function storefrontMarkup(editing = false, publicView = false) {
  const edit = (target) => editAttribute(target, editing);
  const ordersOpen = publicView && shop.features?.requestsEnabled === true;
  const visibleSections = new Set(draft.home.sections);
  const builderVisible = visibleSections.has("builder");
  const navigationNames = {
    custom: "Bouquets",
    products: "Our shop",
    about: "Our story",
    contact: "Say hello",
  };
  const sectionNavigation = draft.home.sections
    .filter((key) => navigationNames[key])
    .map((key) => `<a href="#${key}">${navigationNames[key]}</a>`)
    .join("");
  const heroTarget = ["custom", "products", "builder", "contact", "about"].find(
    (key) => visibleSections.has(key),
  );
  const heroLabels = {
    custom: "Explore the bouquets ↓",
    products: "Explore our shop ↓",
    contact: "Say hello ↓",
    about: "Our story ↓",
  };
  const heroPrimary =
    heroTarget === "builder"
      ? `<a class="button" href="${studioLink(null)}" data-studio ${presetReady() ? "" : 'aria-disabled="true"'}>${presetReady() ? "Open Builder ✳" : "Matching studio preparing"}</a>`
      : heroTarget
        ? `<a class="button" href="#${heroTarget}">${heroLabels[heroTarget]}</a>`
        : "";
  const heroBuilder =
    builderVisible && heroTarget !== "builder"
      ? `<a class="plain-button" href="${studioLink(null)}" data-studio ${presetReady() ? "" : 'aria-disabled="true"'}>Make your own ✳</a>`
      : "";
  const cards = draft.collection.filter(
    (item) => editing || item.available !== false,
  );
  const products = draft.products.filter(
    (item) => editing || item.available !== false,
  );
  const sections = {
    custom: `<section id="custom" class="flower-section"><div class="store-section-heading"><div><p class="eyebrow">A LITTLE IMAGINATION</p><h2>Make it your kind<br>of <em>beautiful.</em></h2></div><p>Start with a favourite.<br>Make the finishing touches your own.</p></div>${cards.length ? `<div class="flower-grid">${cards.map((card) => `<article class="flower-card ${card.available === false ? "item-hidden" : ""}" ${edit("collection:" + card.id)}><div class="photo-wrap">${cover(card, "flower-photo")}<span class="photo-caption">${card.cover ? "Florist photo" : card.design ? "Starting recipe preview" : "Library recipe preview"}</span>${card.available === false ? '<span class="hidden-pill">Hidden</span>' : ""}</div><div class="flower-card-body"><span class="tiny-label">${html(card.category || "CUSTOMISABLE BOUQUET")}</span><h3>${html(card.title)}</h3><p>${html(recipeFor(card)?.description || recipeFor(card)?.name || "Your florist’s saved bouquet design, ready for your personal touch.")}</p><div class="card-actions">${presetReady() ? `<a class="button small" href="${studioLink(card, true)}" data-studio>Custom Order ↗</a><a class="plain-button" href="${studioLink(card)}" data-studio>Customise ✳</a>` : '<button class="button small" disabled>Studio preparing</button>'}</div></div></article>`).join("")}</div>` : editing ? '<div class="empty-collection"><span>✿</span><p>Your signature bouquets belong here.</p><button class="button secondary small" data-action="inspect" data-target="add-card">Choose a recipe +</button></div>' : ""}</section>`,
    products: `<section id="products" class="flower-section fixed-section"><div class="store-section-heading"><div><p class="eyebrow">FROM OUR FLOWER SHOP</p><h2>Lovely, just<br><em>as they are.</em></h2></div><p>Handcrafted favourites.<br>Ready for your kind of moment.</p></div>${products.length ? `<div class="flower-grid">${products.map((item) => `<article class="flower-card ${item.available === false ? "item-hidden" : ""}" ${edit("products:" + item.id)}><div class="photo-wrap">${productCover(item, "flower-photo")}${item.available === false ? '<span class="hidden-pill">Hidden</span>' : ""}</div><div class="flower-card-body"><span class="tiny-label">${html(item.category || "FROM THE COLLECTION")}</span><h3>${html(item.title)}</h3><p>${html(item.description || "Thoughtfully made by your local florist.")}</p><div class="fixed-price">${formatMoney(item.priceCents)}</div>${ordersOpen && item.available !== false && item.priceCents !== null ? `<button class="button secondary small" data-action="product-request" data-id="${html(item.id)}">Request this product ↗</button>` : `<button class="button secondary small" disabled>${!ordersOpen ? "Preview only" : "Contact florist to order"}</button>`}</div></article>`).join("")}</div>` : editing ? '<div class="empty-collection"><span>❀</span><p>A photo, a name, a little something lovely.</p><button class="button secondary small" data-action="add-product">Add your first product +</button></div>' : ""}</section>`,
    builder: `<section id="builder" class="independent-builder"><div><p class="eyebrow">SOMETHING ENTIRELY YOURS</p><h2>A little imagination.<br><em>A beautiful bouquet.</em></h2><p>Choose your flowers, find your colours and bring your own idea to life in our bouquet builder.</p><a class="button" href="${studioLink(null)}" data-studio ${presetReady() ? "" : 'aria-disabled="true"'}>${presetReady() ? "Open Builder ✳" : "Matching studio preparing"}</a><p class="helper">Start fresh with a blank bouquet.</p></div><div class="builder-decoration" aria-hidden="true"><span>✳</span><i>made by you</i></div></section>`,
    about: `<section id="about" class="store-about" ${edit("about")}><p class="eyebrow">A NOTE FROM YOUR FLORIST</p><h2>Flowers with<br><em>a personal touch.</em></h2><p>${html(draft.home.about || (editing ? "Tell your story here. A few warm words about your flowers, your craft and the people you make them for." : "Thoughtfully chosen flowers, made with care for your everyday joys and once-in-a-lifetime moments."))}</p><span class="about-signature">${html(draft.name)}</span></section>`,
    contact: `<section id="contact" class="store-contact" ${edit("contact")}><span aria-hidden="true">✳</span><div><p class="eyebrow">LET’S MAKE SOMETHING LOVELY</p><h2>A little hello goes a long way.</h2><div class="contact-details">${draft.city ? `<span>${html(draft.city)}</span>` : ""}${draft.phone ? `<a href="tel:${html(draft.phone.replace(/[^+\d]/g, ""))}">${html(draft.phone)}</a>` : ""}${draft.instagram ? `<span>${html(draft.instagram)}</span>` : ""}${!draft.phone && !draft.city && editing ? "<span>Add your contact details</span>" : ""}</div></div></section>`,
  };
  return `<div class="storefront floral-store ${editing && editorMode && !adminReadOnly ? "is-editing" : ""}" style="--shop-primary:${html(draft.theme.primary)};--shop-background:${html(draft.theme.background)}"><div class="store-announcement">${html(draft.city || "Thoughtful flowers. Beautiful moments.")} <span>✧</span> ${draft.preset === "satin" ? "Satin & eternal flowers" : "Fresh from our flower shop"}</div><header class="store-header"><div class="store-brand" ${edit("brand")}>${draft.logoMediaId ? `<img data-media-id="${html(draft.logoMediaId)}" alt="${html(draft.name)} logo">` : '<span aria-hidden="true">✳</span>'}${html(draft.name)}</div>${sectionNavigation ? `<nav aria-label="Shop sections">${sectionNavigation}</nav>` : ""}${builderVisible ? `<a class="store-builder-nav" href="${studioLink(null)}" data-studio ${presetReady() ? "" : 'aria-disabled="true"'}>Build your own ↗</a>` : ""}</header><section class="floral-hero"><div class="hero-copy"><p class="eyebrow">YOUR MOMENTS, IN FULL BLOOM</p><h1 ${edit("headline")}>${html(draft.home.headline)}</h1><p class="hero-description" ${edit("description")}>${html(draft.home.description)}</p>${heroPrimary || heroBuilder ? `<div class="actions">${heroPrimary}${heroBuilder}</div>` : ""}<div class="hero-footnote"><span>❀</span> Thoughtfully made. A little more you.</div></div><div class="hero-photo" ${edit("hero")}><img ${draft.home.heroMediaId ? `data-media-id="${html(draft.home.heroMediaId)}"` : 'src="/assets/studio-pink.webp"'} alt="${draft.home.heroMediaId ? html(draft.name) + " flowers" : "Floral inspiration: blush roses wrapped in ivory paper"}"><div class="hero-stamp">a little<br><em>flower magic</em><span>✳</span></div>${editing && editorMode ? '<span class="edit-photo-label">Change hero photo ↗</span>' : ""}</div></section><div class="floral-ribbon"><span>FLOWERS FOR THE LITTLE THINGS</span><i>✳</i><span>AND THE REALLY BIG FEELINGS</span><i>✳</i><span>MADE WITH A PERSONAL TOUCH</span></div>${draft.home.sections.map((key) => sections[key] || "").join("")}<footer class="store-bottom"><strong>${html(draft.name)}</strong><span>Your craft. Their imagination.</span><span>Made with Nebula ✳</span></footer></div>`;
}
function renderPreview() {
  document.body.classList.add("public-shop");
  const slug = decodeURIComponent(route().split("/")[2] || "");
  const owner = user?.emailVerified && shop?.slug === slug && !publicSnapshot;
  if (!owner && (!publicSnapshot || publicSnapshot.slug !== slug))
    return renderLocked();
  if (!owner) {
    shop = publicSnapshot;
    draft = normalizeDraft(shop.draft);
  }
  main.innerHTML = `${owner ? `<div class="preview-banner"><span>✧ OWNER PREVIEW · Private draft${!isPaid() ? " · Orders closed" : ""}</span><a href="/dashboard/editor" data-nav>Edit my storefront ↗</a></div>` : ""}${storefrontMarkup(false, !owner)}`;
  hydrateMedia();
}
function renderEditor() {
  const readOnly = adminReadOnly;
  shell(
    `<div class="editor-toolbar"><div class="editor-status"><span class="status-dot"></span>${readOnly ? "Administrator · read-only preview" : "Your private storefront draft"}</div><div class="actions">${!readOnly ? `<button class="editor-toggle ${editorMode ? "selected" : ""}" data-action="toggle-edit" aria-pressed="${editorMode}">✎ Edit mode ${editorMode ? "on" : "off"}</button><button class="editor-toggle" data-action="inspect" data-target="sections">☷ Sections</button>` : ""}<button class="editor-toggle ${mobilePreview ? "selected" : ""}" data-action="toggle-mobile" aria-pressed="${mobilePreview}">${mobilePreview ? "▣ Desktop" : "▯ Mobile"}</button><a href="${readOnly ? "/admin" : previewLink()}" data-nav class="plain-button">${readOnly ? "Back to admin" : "Preview"} ↗</a></div></div><p class="editor-hint">${readOnly ? "Inspect this merchant’s saved content. Changes are disabled." : "Click a name, a photo or a product to change it. Your edits save automatically."}</p><div class="store-preview-frame ${mobilePreview ? "mobile-frame" : ""}" data-store-mount>${storefrontMarkup(!readOnly, false)}</div>${!readOnly ? inspectorMarkup() : ""}`,
    "Your shop,<br><em>your finishing touches.</em>",
    readOnly
      ? "A read-only view of this merchant’s storefront."
      : "A live canvas for your flowers. Click a detail and make it yours.",
    "STOREFRONT EDITOR",
  );
  if (readOnly) {
    main
      .querySelectorAll(
        'input,textarea,select,[data-action="save"],[data-action="product-request"]',
      )
      .forEach((el) => (el.disabled = true));
    main.querySelectorAll("a[data-studio]").forEach((el) => {
      el.setAttribute("aria-disabled", "true");
      el.removeAttribute("href");
    });
  }
}
function inspectorMarkup() {
  if (!inspector) return "";
  const [kind, id] = inspector.split(":");
  const item = (kind === "collection" ? draft.collection : draft.products).find(
    (row) => row.id === id,
  );
  let title = "Your finishing touches",
    content = "";
  if (kind === "headline" || kind === "description" || kind === "about") {
    title = {
      headline: "Your welcome headline",
      description: "A little introduction",
      about: "Your flower story",
    }[kind];
    const key = kind === "about" ? "about" : kind;
    content = `<label class="field">${title}<textarea data-path="home.${key}" maxlength="${kind === "headline" ? 120 : kind === "about" ? 2000 : 400}">${html(draft.home[key])}</textarea></label><p class="helper">Keep it warm, clear and true to your shop.</p>`;
  } else if (kind === "brand" || kind === "contact") {
    title = kind === "brand" ? "Your shop identity" : "Say a little hello";
    content =
      kind === "brand"
        ? `${field("Shop name", "name", { max: 80, required: true })}${uploadField("logo", null, 1, "Change logo")}<label class="field">Signature colour<input type="color" data-path="theme.primary" value="${html(draft.theme.primary)}"></label>`
        : `${field("City or neighbourhood", "city", { max: 80 })}${field("Phone or WhatsApp", "phone", { max: 40 })}${field("Instagram", "instagram", { max: 120 })}`;
  } else if (kind === "hero") {
    title = "Your first impression";
    content = `<div class="inspector-photo"><img ${draft.home.heroMediaId ? `data-media-id="${html(draft.home.heroMediaId)}"` : 'src="/assets/studio-pink.webp"'} alt="Hero image preview"></div>${uploadField("hero", null, 18, "Choose hero photo")}<p class="helper">Landscape or portrait · resized to 250 KB. Our default photo is floral inspiration; replace it with your own work.</p>${draft.home.heroMediaId ? '<button class="plain-button" data-action="remove-hero">Use default inspiration photo</button>' : ""}`;
  } else if (item) {
    title =
      kind === "collection" ? "Customisable bouquet" : "Your fixed product";
    const index = (
      kind === "collection" ? draft.collection : draft.products
    ).indexOf(item);
    content = `${itemField("Name", kind, item, "title", "text", 80)}${kind === "products" ? itemField("Description", kind, item, "description", "textarea", 400) : recipeSelect(item)}${itemField("Category", kind, item, "category", "text", 40)}${kind === "products" ? itemField("Price · " + currency(), kind, item, "priceCents", "number") : ""}${availability(kind, item)}${uploadField(kind === "collection" ? "cover" : "product", item.id, index + (kind === "collection" ? 2 : 8))}<p class="helper">${kind === "collection" ? "Custom Order and Customise open this same recipe. Your photo should represent it." : "Customers see your fixed price and product photo."}</p>${kind === "collection" && presetReady() ? `<a class="button secondary small" href="${studioLink(item)}" data-studio>Edit recipe in Builder ↗</a>` : ""}<button class="plain-button danger" data-action="${kind === "collection" ? "remove-card" : "remove-product"}" data-id="${html(item.id)}">Remove ${kind === "collection" ? "bouquet" : "product"}</button>`;
  } else if (kind === "sections") {
    title = "Your page, your order";
    const all = ["custom", "products", "builder", "about", "contact"];
    const names = {
      custom: "Customisable bouquets",
      products: "Fixed products",
      builder: "Independent Builder",
      about: "Your story",
      contact: "Contact details",
    };
    const order = [
      ...draft.home.sections,
      ...all.filter((key) => !draft.home.sections.includes(key)),
    ];
    content = `<p class="subtle">Choose which sections appear, then arrange your page.</p><div class="section-sort">${order.map((key) => `<div><label class="toggle-line"><input type="checkbox" data-section="${key}" ${draft.home.sections.includes(key) ? "checked" : ""}>${names[key]}</label><button data-action="move-section" data-section="${key}" data-direction="-1" aria-label="Move ${names[key]} up">↑</button><button data-action="move-section" data-section="${key}" data-direction="1" aria-label="Move ${names[key]} down">↓</button></div>`).join("")}</div><a class="button secondary small" href="/dashboard/collection" data-nav>Manage bouquet recipes ↗</a><a class="button secondary small" href="/dashboard/products" data-nav>Manage fixed products ↗</a>`;
  } else if (kind === "add-card") {
    title = "Choose a starting recipe";
    content = `<p class="subtle">${draft.collection.length} of 6 cards in your collection.</p><div class="drawer-recipes">${
      matchingRecipes()
        .map(
          (recipe) =>
            `<button data-action="add-card" data-recipe="${html(recipe.id)}" ${draft.collection.length >= 6 ? "disabled" : ""}><img src="${html(recipe.cover)}" alt=""><span>${html(recipe.name)}</span><span>+</span></button>`,
        )
        .join("") || '<p class="helper">No compatible recipes yet.</p>'
    }</div>`;
  }
  return `<div class="inspector-backdrop" data-action="close-inspector"></div><aside class="inspector-drawer" role="dialog" aria-modal="true" aria-label="${title}"><div class="inspector-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h2>${title}</h2></div><button class="drawer-close" data-action="close-inspector" aria-label="Close editor">×</button></div><div class="inspector-content">${content}</div><div class="inspector-footer"><span class="helper">Changes save automatically</span><button class="button small" data-action="close-inspector">Done ✓</button></div></aside>`;
}
function refreshCanvas() {
  const mount = main.querySelector("[data-store-mount]");
  if (mount) {
    mount.innerHTML = storefrontMarkup(true, false);
    hydrateMedia();
  }
}

function render() {
  document.body.classList.toggle("public-shop", route().startsWith("/s/"));
  accountNav();
  const path = route();
  if (path.startsWith("/s/")) return renderPreview();
  if (!user) return renderLogin();
  if (!user.emailVerified) return renderVerification();
  if (path === "/admin")
    return sessionState.isAdmin
      ? renderAdmin()
      : renderRestricted(
          "This area is available only to the platform administrator.",
        );
  if (pageMessage && !catalog) return renderRestricted(pageMessage);
  if (!shop) return renderWizard();
  if (path === "/login") history.replaceState(null, "", "/dashboard");
  switch (route()) {
    case "/dashboard/editor":
      return renderEditor();
    case "/dashboard/shop":
      return renderBrand();
    case "/dashboard/prices":
      return renderPrices();
    case "/dashboard/collection":
      return renderCollection();
    case "/dashboard/products":
      return renderProducts();
    case "/dashboard/billing":
      return renderBilling();
    case "/dashboard/payments":
      return renderPayments();
    default:
      return renderOverview();
  }
}
async function loadCatalog() {
  const response = await fetch("/api/catalog", {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Error("The flower library could not be loaded. Please try again.");
  const data = await response.json();
  if (
    !Array.isArray(data.flowers) ||
    !Array.isArray(data.extras) ||
    !Array.isArray(data.recipes)
  )
    throw Error("The flower library is still being prepared.");
  catalog = data;
}
async function loadPublicShop() {
  const slug = decodeURIComponent(route().split("/")[2] || "");
  publicSlugLoaded = slug;
  try {
    const response = await fetch(
      "/api/shops/resolve/" + encodeURIComponent(slug),
      {
        cache: "no-store",
        credentials: "same-origin",
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) {
      publicSnapshot = null;
      return;
    }
    const data = await response.json();
    if (data.shop?.draft && data.shop.slug === slug) publicSnapshot = data.shop;
  } catch {
    publicSnapshot = null;
  }
}
function adminStatus(row) {
  return (
    row.subscriptionStatus ||
    row.subscription?.status ||
    (row.subscription?.active ? "active" : "inactive")
  );
}
function adminDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}
function renderAdmin() {
  const rows = adminState.users;
  const detail = adminState.detail;
  main.innerHTML = `<section class="admin-page"><div class="page-heading"><div><p class="eyebrow">NEBULA · PLATFORM OWNER</p><h1>A little overview.<br><em>Every growing shop.</em></h1><p class="subtle">Read-only merchant accounts, subscriptions and saved storefronts.</p></div><a class="button secondary small" href="/admin.html">Legacy orders & leads ↗</a></div>${notice()}<div class="admin-summary"><div class="surface"><span class="tiny-label">ACCOUNTS LOADED</span><strong>${rows.length}</strong></div><div class="surface"><span class="tiny-label">WITH A SHOP</span><strong>${rows.filter((row) => row.shopId || row.shop?.id).length}</strong></div><div class="surface"><span class="tiny-label">ACTIVE PLANS</span><strong>${rows.filter((row) => adminStatus(row) === "active").length}</strong></div><div class="surface"><span class="tiny-label">PUBLISHED</span><strong>${rows.filter((row) => row.publishedVersion || row.shop?.published).length}</strong></div></div><div class="admin-layout"><section class="surface"><form id="adminSearchForm" class="admin-search"><input id="adminSearch" type="search" value="${html(adminState.query)}" placeholder="Search email, shop or slug…" aria-label="Search accounts"><button class="button small" type="submit">Search</button></form><p class="helper">Counts reflect the loaded page${adminState.query ? " and search" : ""}. Accounts without a shop are included.</p><div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>ACCOUNT / SHOP</th><th>SUBSCRIPTION</th><th>STATUS</th><th>LAST ACTIVITY</th><th></th></tr></thead><tbody>${
    rows
      .map((row) => {
        const id = row.shopId || row.shop?.id;
        return `<tr><td><strong>${html(row.name || row.shop?.draft?.name || "No shop yet")}</strong><span>${html(row.email || row.uid)}</span><small>${html(row.slug || row.shop?.slug || "Account created · shop not started")}</small></td><td><span class="pill ${adminStatus(row) === "active" ? "green" : ""}">${html(adminStatus(row))}</span></td><td>${html(row.status || (row.publishedVersion ? "published" : id ? "draft" : "no shop"))}</td><td>${adminDate(row.lastSeenAt || row.lastActiveAt || row.updatedAt)}</td><td>${id ? `<button class="plain-button" data-action="admin-select" data-id="${html(id)}">Inspect ↗</button>` : "—"}</td></tr>`;
      })
      .join("") ||
    `<tr><td colspan="5">${adminState.loading ? "Loading accounts…" : "No matching accounts."}</td></tr>`
  }</tbody></table></div>${adminState.nextCursor ? '<button class="button secondary small" data-action="admin-more">Load more accounts ↓</button>' : ""}</section><aside class="surface admin-detail">${detail ? `<p class="eyebrow">MERCHANT DETAIL</p><h2>${html(detail.shop.draft?.name || detail.shop.slug)}</h2><p class="subtle">${html(detail.user?.email || detail.shop.ownerUid || "")}</p><dl><dt>Shop address</dt><dd>${html(detail.shop.slug)}</dd><dt>Draft version</dt><dd>${html(detail.shop.version)}</dd><dt>Published version</dt><dd>${html(detail.shop.published?.version || "Not published")}</dd><dt>Subscription</dt><dd>${html(detail.shop.subscription?.status || (detail.shop.subscription?.active ? "active" : "inactive"))}</dd><dt>Customisable / fixed</dt><dd>${detail.shop.draft?.collection?.length || 0} / ${detail.shop.draft?.products?.length || 0}</dd><dt>Last updated</dt><dd>${adminDate(detail.shop.updatedAt)}</dd></dl><a class="button secondary small" href="/dashboard/editor?adminShop=${encodeURIComponent(detail.shop.id)}&view=draft" data-admin-preview data-id="${html(detail.shop.id)}" data-view="draft">Preview private draft ↗</a>${detail.shop.published ? `<a class="button secondary small" href="/dashboard/editor?adminShop=${encodeURIComponent(detail.shop.id)}&view=live" data-admin-preview data-id="${html(detail.shop.id)}" data-view="live">Preview published version ↗</a>` : ""}<p class="helper">Administrator previews are read only. No merchant content or subscription is changed here.</p>` : '<span class="admin-flower">✳</span><h2>Every shop has a story.</h2><p class="subtle">Choose a merchant to inspect their plan, draft and live storefront.</p>'}</aside></div></section>`;
  if (!adminState.loaded && !adminState.loading) loadAdminUsers();
}
async function loadAdminUsers(more = false) {
  adminState.loading = true;
  try {
    const params = new URLSearchParams({ q: adminState.query });
    if (more && adminState.nextCursor)
      params.set("cursor", adminState.nextCursor);
    const data = await api("/api/admin/users?" + params);
    adminState.users = more ? [...adminState.users, ...data.users] : data.users;
    adminState.nextCursor = data.nextCursor || null;
    adminState.loaded = true;
  } catch (error) {
    pageMessage = errorText(error);
    adminState.loaded = true;
  } finally {
    adminState.loading = false;
    if (route() === "/admin") renderAdmin();
  }
}
async function preserveDraftBeforeAdminPreview() {
  if (adminReadOnly || !shop || !draft) return;
  if (uploadJobs.size)
    throw Error(
      "Your photo is still uploading. Keep this page open until it finishes, then open the administrator preview. Your edits have been kept.",
    );
  const deadline = Date.now() + 25000;
  while (saving && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 100));
  if (saving)
    throw Error(
      "Your draft is still saving. Wait for it to finish before opening another shop. Your edits have been kept.",
    );
  if (dirty && !(await saveDraft(true)))
    throw Error(
      "Your draft could not be saved yet. Your edits have been kept; resolve the save message before opening another shop.",
    );
}
async function loadAdminPreview(id, view = "draft") {
  if (!sessionState.isAdmin) throw Error("Administrator access is required.");
  await preserveDraftBeforeAdminPreview();
  const data = await api("/api/admin/shops/" + encodeURIComponent(id));
  const nextShop = data.shop;
  if (view === "live" && !nextShop.published?.draft)
    throw Error("This shop has no published version.");
  const nextDraft = normalizeDraft(
    view === "live" ? nextShop.published.draft : nextShop.draft,
  );
  shop = nextShop;
  draft = nextDraft;
  version = shop.version;
  dirty = conflict = false;
  adminReadOnly = true;
  inspector = null;
}
async function renderHistoryRoute() {
  try {
    const params = new URLSearchParams(location.search);
    const adminShop =
      route() === "/dashboard/editor" ? params.get("adminShop") : null;
    if (adminShop)
      await loadAdminPreview(adminShop, params.get("view") || "draft");
    else if (
      adminReadOnly ||
      (publicSnapshot && !route().startsWith("/s/") && user?.emailVerified)
    ) {
      await loadSession();
      adminReadOnly = false;
      publicSnapshot = null;
    }
    render();
  } catch (error) {
    pageMessage = errorText(error);
    // Preserve the current draft if the destination cannot be loaded.
    if (adminReadOnly)
      history.replaceState(
        null,
        "",
        "/dashboard/editor?adminShop=" +
          encodeURIComponent(shop.id) +
          "&view=draft",
      );
    else if (
      route() === "/dashboard/editor" &&
      new URLSearchParams(location.search).has("adminShop")
    )
      history.replaceState(null, "", "/admin");
    render();
  }
}
async function loadSession() {
  const session = await api("/api/session");
  sessionState = session;
  await loadCatalog();
  shop = session.shop;
  draft = shop ? normalizeDraft(shop.draft) : null;
  version = shop?.version ?? null;
  dirty = conflict = false;
  pageMessage = "";
  editRevision++;
}
function updateSaveState(text) {
  if ($("saveState"))
    $("saveState").textContent =
      text ||
      (saving
        ? "Saving…"
        : conflict
          ? "Changes need review"
          : dirty
            ? "Unsaved changes"
            : "All changes saved");
  document
    .querySelectorAll('[data-action="save"]')
    .forEach(
      (button) =>
        (button.disabled = saving || conflict || !dirty || uploadJobs.size > 0),
    );
}
function changed() {
  if (adminReadOnly) return;
  dirty = true;
  editRevision++;
  updateSaveState();
  clearTimeout(saveTimer);
  if (!conflict) saveTimer = setTimeout(() => saveDraft(false), 2000);
}
function validInputs() {
  const invalid = [...main.querySelectorAll("input,select,textarea")].find(
    (input) => !input.checkValidity(),
  );
  if (invalid) {
    invalid.reportValidity();
    return false;
  }
  return true;
}
async function saveDraft(explicit = true) {
  clearTimeout(saveTimer);
  if (
    !shop ||
    adminReadOnly ||
    !dirty ||
    saving ||
    conflict ||
    uploadJobs.size ||
    !validInputs()
  )
    return false;
  const revision = editRevision;
  const snapshot = clone(draft);
  saving = true;
  updateSaveState();
  try {
    const response = await api(
      `/api/shops/${encodeURIComponent(shop.id)}/draft`,
      { method: "PUT", body: { version, draft: snapshot } },
    );
    shop = response.shop;
    version = shop.version;
    if (editRevision === revision) {
      draft = normalizeDraft(shop.draft);
      dirty = false;
    }
    pageMessage = "";
    showMessage(explicit ? "Your private draft is saved." : "");
    return true;
  } catch (error) {
    if (error.status === 409) {
      conflict = true;
      pageMessage =
        "Your shop changed in another window. Your edited fields have been kept; review them before reloading the saved version.";
      render();
    } else {
      pageMessage = errorText(error);
      showMessage(pageMessage, true);
    }
    return false;
  } finally {
    saving = false;
    updateSaveState();
    if (dirty && !conflict && editRevision !== revision)
      saveTimer = setTimeout(() => saveDraft(false), 2000);
  }
}
function seedCollection() {
  const recipe = matchingRecipes()[0];
  if (recipe) addCard(recipe.id);
}
function addCard(recipeId) {
  if (draft.collection.length >= 6) return;
  const recipe = matchingRecipes().find((item) => item.id === recipeId);
  if (!recipe) return;
  const item = {
    id: newId("card"),
    title: recipe.name,
    recipeId: recipe.id,
    design: null,
    cover: null,
    available: true,
    category: "",
  };
  draft.collection.push(item);
  changed();
  if (route() === "/dashboard/editor") inspector = "collection:" + item.id;
  render();
}
async function useSamplePrices() {
  // Samples are an explicit owner action. Missing prices never silently become
  // zero, and this beta has no publication or checkout endpoint to approve them.
  for (const item of matchingFlowers()) {
    if (
      draft.flowerPrices[item.id] == null &&
      Number.isSafeInteger(item.priceCents)
    )
      draft.flowerPrices[item.id] = item.priceCents;
  }
  for (const item of matchingExtras()) {
    if (
      draft.extrasCents[item.id] == null &&
      Number.isSafeInteger(item.priceCents)
    )
      draft.extrasCents[item.id] = item.priceCents;
  }
  changed();
  if (await saveDraft(false)) {
    pageMessage =
      "Sample prices saved for design previews. Replace them with your own approved prices before launch. These amounts cannot be charged in this beta.";
    render();
  }
}
async function createShop(button) {
  button.disabled = true;
  try {
    const response = await api("/api/shops", { method: "POST", body: wizard });
    shop = response.shop;
    draft = normalizeDraft(shop.draft);
    version = shop.version;
    dirty = conflict = false;
    await navigate("/dashboard");
    announce(
      "Your private shop is created. Start with your own favourite recipes and products.",
    );
  } catch (error) {
    showMessage(errorText(error), true);
  } finally {
    button.disabled = false;
  }
}
async function authTask(button, operation) {
  if (button) button.disabled = true;
  try {
    await operation();
  } catch (error) {
    showMessage(
      errorText(error),
      true,
      $("authMessage") ? "authMessage" : "pageMessage",
    );
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}
async function signedIn() {
  user = await getUser();
  if (!user?.emailVerified) {
    render();
    return;
  }
  try {
    await loadSession();
    if (
      afterLogin.startsWith("/s/") &&
      shop?.slug === decodeURIComponent(afterLogin.split("/")[2] || "")
    )
      publicSnapshot = null;
    await navigate(afterLogin, true);
  } catch (error) {
    pageMessage = errorText(error);
    catalog = null;
    render();
  }
}
async function compressImage(file, maxBytes, maxSize) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > 20 * 1024 * 1024)
    throw Error(
      "Choose an image smaller than 20 MB so it can be resized in your browser.",
    );
  const source = await createImageBitmap(file);
  try {
    let scale = Math.min(1, maxSize / Math.max(source.width, source.height));
    for (let attempt = 0; attempt < 10; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      canvas
        .getContext("2d")
        .drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(
          resolve,
          "image/webp",
          Math.max(0.45, 0.86 - attempt * 0.055),
        ),
      );
      if (blob && blob.size <= maxBytes) return blob;
      scale *= 0.82;
    }
    throw Error(
      "This image could not be resized enough. Try a simpler or smaller image.",
    );
  } finally {
    source.close();
  }
}
async function uploadMedia(input) {
  const file = input.files?.[0];
  if (!file || !shop) return;
  const slot = Number(input.dataset.upload),
    kind = input.dataset.kind;
  if (uploadJobs.has(slot)) return;
  uploadJobs.add(slot);
  updateSaveState("Preparing image…");
  input.disabled = true;
  try {
    const blob = await compressImage(
      file,
      kind === "logo" ? 80 * 1024 : kind === "hero" ? 250 * 1024 : 150 * 1024,
      kind === "logo" ? 400 : kind === "hero" ? 1600 : 1000,
    );
    const response = await api(
      `/api/shops/${encodeURIComponent(shop.id)}/media?slot=${slot}&kind=${kind === "product" ? "cover" : kind}`,
      { method: "POST", body: blob },
    );
    const id = response.media.id;
    const cacheKey = shop.id + ":" + id;
    if (mediaCache.has(cacheKey))
      URL.revokeObjectURL(await mediaCache.get(cacheKey));
    mediaCache.set(cacheKey, Promise.resolve(URL.createObjectURL(blob)));
    if (kind === "logo") draft.logoMediaId = id;
    else if (kind === "hero") draft.home.heroMediaId = id;
    else
      (kind === "product" ? draft.products : draft.collection).find(
        (card) => card.id === input.dataset.card,
      ).cover = id;
    changed();
    pageMessage = "Image uploaded. Saving its place in your draft…";
    render();
  } catch (error) {
    showMessage(errorText(error), true);
  } finally {
    uploadJobs.delete(slot);
    input.disabled = false;
    input.value = "";
    updateSaveState();
    if (dirty && !conflict) saveTimer = setTimeout(() => saveDraft(false), 500);
  }
}
async function mediaUrl(id) {
  const cacheKey = shop.id + ":" + id;
  if (!mediaCache.has(cacheKey))
    mediaCache.set(
      cacheKey,
      (async () => {
        const response = await fetch(
          `/api/shops/${encodeURIComponent(shop.id)}/media/${encodeURIComponent(id)}`,
          {
            headers:
              publicSnapshot && !adminReadOnly
                ? {}
                : { Authorization: "Bearer " + (await token()) },
            credentials: "same-origin",
            cache: "no-store",
            signal: AbortSignal.timeout(20000),
          },
        );
        if (!response.ok) throw Error("Image could not be loaded.");
        return URL.createObjectURL(await response.blob());
      })().catch((error) => {
        mediaCache.delete(cacheKey);
        throw error;
      }),
    );
  return mediaCache.get(cacheKey);
}
function hydrateMedia() {
  document.querySelectorAll("img[data-media-id]").forEach(async (image) => {
    try {
      const url = await mediaUrl(image.dataset.mediaId);
      if (image.isConnected) image.src = url;
    } catch {
      if (image.isConnected) image.alt += " · temporarily unavailable";
    }
  });
}
document.addEventListener("click", async (event) => {
  const disabledLink = event.target.closest('a[aria-disabled="true"]');
  if (disabledLink) {
    event.preventDefault();
    return;
  }
  const editable = event.target.closest("[data-edit]");
  if (
    editable &&
    route() === "/dashboard/editor" &&
    editorMode &&
    !adminReadOnly
  ) {
    event.preventDefault();
    inspector = editable.dataset.edit;
    renderEditor();
    main
      .querySelector(
        ".inspector-drawer input,.inspector-drawer textarea,.inspector-drawer button",
      )
      ?.focus();
    return;
  }
  const adminPreview = event.target.closest("[data-admin-preview]");
  if (adminPreview) {
    event.preventDefault();
    await authTask(adminPreview, async () => {
      await loadAdminPreview(
        adminPreview.dataset.id,
        adminPreview.dataset.view,
      );
      history.pushState(null, "", adminPreview.getAttribute("href"));
      render();
    });
    return;
  }
  const link = event.target.closest("a[data-nav]");
  if (
    link &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    event.button === 0
  ) {
    event.preventDefault();
    const target = new URL(link.href);
    afterLogin =
      safeReturnPath(target.searchParams.get("returnTo")) || afterLogin;
    await navigate(link.getAttribute("href"));
    return;
  }
  const studio = event.target.closest("a[data-studio]");
  if (studio && (dirty || saving || uploadJobs.size)) {
    event.preventDefault();
    if (saving || uploadJobs.size)
      return showMessage(
        "Wait for your current changes to finish saving before opening the studio.",
      );
    if (await saveDraft(true)) location.assign(studio.href);
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (
    adminReadOnly &&
    !["toggle-mobile", "close-inspector", "signout"].includes(action) &&
    !action.startsWith("admin-")
  )
    return;
  if (action === "toggle-edit") {
    editorMode = !editorMode;
    inspector = null;
    renderEditor();
  } else if (action === "toggle-mobile") {
    mobilePreview = !mobilePreview;
    renderEditor();
  } else if (action === "inspect") {
    inspector = button.dataset.target;
    renderEditor();
  } else if (action === "close-inspector") {
    inspector = null;
    renderEditor();
  } else if (action === "add-card") addCard(button.dataset.recipe);
  else if (action === "remove-card" || action === "remove-product") {
    const kind = action === "remove-card" ? "collection" : "products";
    if (
      !confirm(
        "Remove this " +
          (kind === "collection" ? "bouquet" : "product") +
          " from your private draft?",
      )
    )
      return;
    draft[kind] = draft[kind].filter((item) => item.id !== button.dataset.id);
    inspector = null;
    changed();
    render();
  } else if (action === "add-product") {
    if (draft.products.length >= 10) return;
    const item = {
      id: newId("product"),
      title: "A lovely new favourite",
      description: "",
      priceCents: null,
      cover: null,
      available: true,
      category: "",
    };
    draft.products.push(item);
    if (route() === "/dashboard/editor") inspector = "products:" + item.id;
    changed();
    render();
  } else if (action === "remove-product-cover") {
    draft.products.find((item) => item.id === button.dataset.id).cover = null;
    changed();
    render();
  } else if (action === "remove-hero") {
    draft.home.heroMediaId = null;
    changed();
    render();
  } else if (action === "move-section") {
    const list = draft.home.sections,
      index = list.indexOf(button.dataset.section),
      next = index + Number(button.dataset.direction);
    if (index >= 0 && next >= 0 && next < list.length) {
      [list[index], list[next]] = [list[next], list[index]];
      changed();
      renderEditor();
    }
  } else if (
    action === "billing-checkout" ||
    action === "billing-portal" ||
    action === "square-connect"
  )
    await authTask(button, async () => {
      if (dirty && !(await saveDraft(true))) return;
      const endpoint =
        action === "billing-checkout"
          ? "billing/checkout"
          : action === "billing-portal"
            ? "billing/portal"
            : "square/connect";
      const data = await api(
        "/api/shops/" + encodeURIComponent(shop.id) + "/" + endpoint,
        {
          method: "POST",
          body: action === "billing-checkout" ? { planId: "shop" } : {},
        },
      );
      if (!data.url || !/^https:\/\//.test(data.url))
        throw Error(
          "The provider connection is still being prepared. Please try again later.",
        );
      location.assign(data.url);
    });
  else if (action === "publish-shop")
    await authTask(button, async () => {
      if (dirty && !(await saveDraft(true))) return;
      const data = await api(
        "/api/shops/" + encodeURIComponent(shop.id) + "/publish",
        { method: "POST", body: { version } },
      );
      shop = data.shop;
      draft = normalizeDraft(shop.draft);
      version = shop.version;
      pageMessage = "Your chosen storefront version is published.";
      renderBilling();
    });
  else if (action === "product-request") {
    if (!publicSnapshot) return;
    await openOrderRequest({
      shop,
      kind: "product",
      productId: button.dataset.id,
    });
  } else if (action === "refresh-requests") {
    merchantRequests = null;
    await loadMerchantRequests();
  } else if (action === "admin-more") await loadAdminUsers(true);
  else if (action === "admin-select")
    await authTask(button, async () => {
      adminState.detail = await api(
        "/api/admin/shops/" + encodeURIComponent(button.dataset.id),
      );
      renderAdmin();
    });
  else if (action === "auth-mode") {
    loginMode = loginMode === "signin" ? "signup" : "signin";
    renderLogin();
  } else if (action === "google")
    await authTask(button, async () => {
      await authApi.signInWithPopup(auth, new authApi.GoogleAuthProvider());
      await signedIn();
    });
  else if (action === "reset")
    await authTask(button, async () => {
      const email = $("email");
      if (!email.value || !email.reportValidity()) return;
      await authApi.sendPasswordResetEmail(auth, email.value.trim());
      showMessage(
        "If this address has an account, check its inbox for a password reset email.",
        false,
        "authMessage",
      );
    });
  else if (action === "signout")
    await authTask(button, async () => {
      if (
        dirty &&
        !confirm(
          "Your draft has unsaved changes. Sign out and leave these edits?",
        )
      )
        return;
      clearTimeout(saveTimer);
      await authApi.signOut(auth);
      user = shop = draft = catalog = null;
      dirty = conflict = false;
      pageMessage = "";
      for (const value of mediaCache.values())
        value.then((url) => URL.revokeObjectURL(url)).catch(() => {});
      mediaCache.clear();
      await navigate("/login", true);
    });
  else if (action === "send-verification")
    await authTask(button, async () => {
      await authApi.sendEmailVerification(user);
      showMessage(
        "Verification email sent. Check your inbox, then return here.",
        false,
        "authMessage",
      );
    });
  else if (action === "check-verification")
    await authTask(button, async () => {
      user = await refreshUser();
      if (!user.emailVerified)
        showMessage(
          "Your email is not verified yet. Follow the email link, then check again.",
          false,
          "authMessage",
        );
      else await signedIn();
    });
  else if (action === "retry-session") await authTask(button, signedIn);
  else if (action === "wizard-back") {
    wizardStep = 1;
    renderWizard();
  } else if (action === "save") await saveDraft();
  else if (action === "seed-collection") {
    seedCollection();
    render();
  } else if (action === "sample-prices")
    await authTask(button, useSamplePrices);
  else if (action === "remove-logo") {
    draft.logoMediaId = null;
    changed();
    render();
  } else if (action === "remove-cover") {
    draft.collection.find((card) => card.id === button.dataset.card).cover =
      null;
    changed();
    render();
  } else if (action === "reload-draft")
    await authTask(button, async () => {
      if (
        !confirm(
          "Replace the edited fields with the latest saved version? Download your edits first if you need to keep them.",
        )
      )
        return;
      const response = await api(`/api/shops/${encodeURIComponent(shop.id)}`);
      shop = response.shop;
      draft = normalizeDraft(shop.draft);
      version = shop.version;
      dirty = conflict = false;
      pageMessage = "The latest saved version is loaded.";
      render();
    });
  else if (action === "download-draft") {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ shopId: shop.id, version, draft }, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = shop.slug + "-draft-edits.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
document.addEventListener("submit", async (event) => {
  if (event.target.id === "adminSearchForm") {
    event.preventDefault();
    adminState.query = $("adminSearch").value.trim();
    adminState.nextCursor = null;
    await loadAdminUsers();
    return;
  }
  if (event.target.id === "authForm") {
    event.preventDefault();
    await authTask(event.submitter, async () => {
      const email = $("email").value.trim(),
        password = $("password").value;
      if (loginMode === "signup") {
        const result = await authApi.createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        user = result.user;
        try {
          await authApi.sendEmailVerification(user);
        } catch (error) {
          pageMessage = errorText(error);
        }
      } else await authApi.signInWithEmailAndPassword(auth, email, password);
      await signedIn();
      if (pageMessage && $("authMessage"))
        showMessage(pageMessage, true, "authMessage");
    });
  } else if (event.target.id === "createShopForm") {
    event.preventDefault();
    if (wizardStep === 1) {
      wizardStep = 2;
      renderWizard();
    } else await createShop(event.submitter);
  }
});
document.addEventListener("input", (event) => {
  const input = event.target;
  if (input.id === "flowerSearch") {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll("[data-price-row]").forEach((row) => {
      row.hidden = !row.dataset.search.includes(query);
      if (!row.hidden) shown++;
    });
    $("noFlowers").hidden = shown > 0;
    return;
  }
  if (input.dataset.wizard) {
    if (input.type === "radio" && !input.checked) return;
    wizard[input.dataset.wizard] = input.value;
    if (input.id === "shopSlug") slugEdited = true;
    if (input.id === "shopName" && !slugEdited) {
      wizard.slug = input.value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      $("shopSlug").value = wizard.slug;
    }
    if ($("slugPreview"))
      $("slugPreview").textContent = wizard.slug || "your-shop-name";
    return;
  }
  if (!draft || adminReadOnly) return;
  if (input.dataset.itemKind) {
    const item = draft[input.dataset.itemKind]?.find(
      (row) => row.id === input.dataset.itemId,
    );
    if (!item) return;
    const key = input.dataset.itemKey;
    if (key === "priceCents") {
      if (!input.checkValidity()) return;
      item[key] =
        input.value === "" ? null : Math.round(Number(input.value) * 100);
    } else item[key] = input.type === "checkbox" ? input.checked : input.value;
    changed();
    refreshCanvas();
    return;
  }
  if (input.dataset.section) {
    draft.home.sections = draft.home.sections.filter(
      (key) => key !== input.dataset.section,
    );
    if (input.checked) draft.home.sections.push(input.dataset.section);
    changed();
    renderEditor();
    return;
  }
  if (input.dataset.mode) {
    draft.enabledModes = draft.enabledModes.filter(
      (mode) => mode !== input.dataset.mode,
    );
    if (input.checked) draft.enabledModes.push(input.dataset.mode);
    changed();
    return;
  }
  if (input.dataset.path) {
    const keys = input.dataset.path.split(".");
    const parent = keys
      .slice(0, -1)
      .reduce((object, key) => object[key], draft);
    parent[keys.at(-1)] = input.value;
    if (keys[0] === "theme") {
      const label = document.querySelector(`[data-colour-label="${keys[1]}"]`);
      if (label) label.textContent = input.value.toUpperCase();
    }
    changed();
    refreshCanvas();
  } else if (input.dataset.flowerPrice || input.dataset.extraPrice) {
    const key = input.dataset.flowerPrice || input.dataset.extraPrice;
    const values = input.dataset.flowerPrice
      ? draft.flowerPrices
      : draft.extrasCents;
    if (!input.checkValidity()) return;
    values[key] =
      input.value === "" ? null : Math.round(Number(input.value) * 100);
    changed();
  } else if (input.dataset.flowerEnabled || input.dataset.extraEnabled) {
    const key = input.dataset.flowerEnabled || input.dataset.extraEnabled;
    const list = input.dataset.flowerEnabled
      ? "disabledFlowers"
      : "disabledExtras";
    draft[list] = draft[list].filter((id) => id !== key);
    if (!input.checked) draft[list].push(key);
    input.closest("tr").classList.toggle("unavailable", !input.checked);
    changed();
  } else if (input.dataset.cardTitle) {
    draft.collection.find((card) => card.id === input.dataset.cardTitle).title =
      input.value;
    changed();
  } else if (input.dataset.cardRecipe && input.value !== "__design") {
    const card = draft.collection.find(
      (item) => item.id === input.dataset.cardRecipe,
    );
    if (
      card.design &&
      !confirm(
        "Replace this saved studio design with the selected library recipe? Your current design will be removed from this draft card.",
      )
    ) {
      render();
      return;
    }
    card.recipeId = input.value;
    card.design = null;
    changed();
    render();
  }
});
document.addEventListener("change", (event) => {
  if (adminReadOnly) return;
  if (event.target.matches("input[data-upload]")) uploadMedia(event.target);
  if (event.target.matches("[data-preset]")) {
    const next = event.target.value;
    if (next === draft.preset) return;
    const incompatible =
      draft.collection.length ||
      Object.values(draft.flowerPrices).some((value) => value !== null) ||
      Object.values(draft.extrasCents).some((value) => value !== null) ||
      draft.disabledFlowers.length ||
      draft.disabledExtras.length;
    if (shop.published || incompatible) {
      event.target.value = draft.preset;
      showMessage(
        "Your current recipes and catalogue settings have been kept. Remove existing customisable cards and pricing overrides before switching presets. Fixed products and your brand can stay.",
        true,
      );
      return;
    }
    if (
      !confirm(
        "Change the flower preset for this unpublished shop? Your catalogue and builder will use the new preset. Your fixed products and brand remain saved.",
      )
    ) {
      event.target.value = draft.preset;
      return;
    }
    draft.preset = next;
    draft.flowerPrices = {};
    draft.extrasCents = {};
    draft.enabledModes = [
      ...new Set(matchingRecipes().map((item) => item.mode)),
    ];
    changed();
    render();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && inspector) {
    inspector = null;
    renderEditor();
  }
  const editable = event.target.closest("[data-edit]");
  if (editable && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    editable.click();
  }
});
window.addEventListener("popstate", renderHistoryRoute);
window.addEventListener("beforeunload", (event) => {
  if (dirty || saving || uploadJobs.size) {
    event.preventDefault();
    event.returnValue = "";
  }
});

async function start() {
  const path = route(),
    publicRoute = path.startsWith("/s/");
  if (publicRoute) {
    renderLocked();
    try {
      await Promise.all([loadCatalog(), loadPublicShop()]);
      if (publicSnapshot) renderPreview();
    } catch {}
  }
  try {
    ({ auth, authApi, config } = await initialize());
    user = await getUser();
    const displayedPublic = publicSnapshot;
    if (user?.emailVerified) {
      await loadSession();
      if (publicRoute) {
        if (shop?.slug === decodeURIComponent(path.split("/")[2] || ""))
          publicSnapshot = null;
        else publicSnapshot = displayedPublic;
      }
      const params = new URLSearchParams(location.search);
      if (path === "/dashboard/editor" && params.get("adminShop"))
        await loadAdminPreview(
          params.get("adminShop"),
          params.get("view") || "draft",
        );
      if (path === "/dashboard/billing") {
        try {
          const status = await api(
            "/api/shops/" + encodeURIComponent(shop.id) + "/billing/status",
          );
          if (status.subscription) shop.subscription = status.subscription;
        } catch {}
      }
    }
    render();
  } catch (error) {
    accountNav();
    pageMessage = errorText(error);
    if (publicRoute) {
      renderPreview();
      return;
    }
    if (user?.emailVerified) {
      renderRestricted(pageMessage);
      return;
    }
    main.innerHTML = `<section class="empty-screen"><div class="lock-icon" aria-hidden="true">✳</div><p class="eyebrow">YOUR STUDIO WILL BE HERE</p><h1>A little setup<br><em>is still in bloom.</em></h1><p class="subtle" style="max-width:460px">${html(pageMessage)}</p><button class="button secondary" data-action="reload-app">Try again</button></section>`;
    document.querySelector('[data-action="reload-app"]').onclick = () =>
      location.reload();
  }
}
start();
