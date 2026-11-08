import {
  applyPresentation,
  presentationControls,
  fulfillmentSummary,
} from "/shop-presentation.mjs";
import { icon } from "/icons.js";
import { bouquetSlots, nextBouquetSlot } from "/bouquet-slots.mjs";
import { readTrial } from "/launch-demo.mjs";
import {
  mainNavigation,
  activeNavigation,
  subNavigation,
  setupProgress,
  setupFooter,
  localeFields,
} from "/shop-flow.js";
import { ensureHuman } from "/human-check.js";
import { mountWorkspaceHome } from "/workspace-home.js";
import { initialize, getUser, refreshUser, token, api } from "/session.js";
import {
  storefrontHomeDefaults,
  storefrontGroups,
  storefrontControls,
} from "/storefront-options.js";
import { openOrderRequest } from "/order-ui.js";
import {
  mountManualPlan,
  mountActivationAdmin,
  clearActivationPanels,
} from "/manual-ui.js";
import { mountCommerce } from "/commerce-ui.js";
import { mountNotifications } from "/merchant-notifications.js";

const iconMarkup = icon;
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
  (location.pathname.startsWith("/admin")
    ? location.pathname === "/admin/login"
      ? "/admin"
      : location.pathname + location.search
    : location.pathname.startsWith("/s/")
      ? location.pathname
      : "/dashboard");
let user, auth, authApi, config, shop, draft, catalog;
let sessionState = {},
  publicSnapshot = null,
  publicSlugLoaded = null;
const emptyOrdersState = () => ({
  shopId: null,
  admin: false,
  rows: [],
  counts: {},
  nextCursor: null,
  status: "all",
  loaded: false,
  loading: false,
  selectedId: null,
  detail: null,
  detailLoading: false,
  error: "",
  message: "",
  busy: false,
  edits: new Map(),
});
let ordersState = emptyOrdersState();
const hasRequestEdits = () =>
  [...ordersState.edits.values()].some((edit) => edit.dirty);
let publicationState = {
  shopId: null,
  version: null,
  report: null,
  error: "",
  loading: false,
};
let squareState = {
  shopId: null,
  loaded: false,
  loading: false,
  data: null,
  error: "",
};
let editorMode = true,
  mobilePreview = false,
  inspector = null,
  adminReadOnly = false;
let adminState = {
  users: [],
  reservations: [],
  nextCursor: null,
  query: "",
  filter: "",
  detail: null,
  detailLoading: false,
  selectionId: null,
  feedback: null,
  loading: false,
};
let version = null,
  dirty = false,
  saving = false,
  conflict = false,
  editRevision = 0;
let saveTimer,
  loginMode =
    new URLSearchParams(location.search).get("mode") === "signup"
      ? "signup"
      : "signin",
  wizardStep = 1,
  pageMessage = "";
let wizard = {
  name: "",
  slug: "",
  currency: "USD",
  preset: readTrial()?.preset || "fresh",
  country: "",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};
const suggestedSlugSuffix = crypto.randomUUID().slice(0, 8);
let verificationSentAt = 0;
async function sendVerification() {
  if (Date.now() - verificationSentAt < 60000)
    throw Error(
      "Please wait a minute before requesting another verification email.",
    );
  await authApi.sendEmailVerification(user, {
    url: location.origin + "/dashboard",
  });
  verificationSentAt = Date.now();
}
let slugEdited = false;
const mediaCache = new Map();
const uploadJobs = new Set();
const tabs = mainNavigation;
const currency = () => draft?.currency || shop?.draft?.currency || "USD";
const CURRENCY_MARKETS = [
  ["USD", "USD · United States"],
  ["CAD", "CAD · Canada"],
  ["GBP", "GBP · United Kingdom"],
  ["EUR", "EUR · Eurozone"],
  ["AUD", "AUD · Australia"],
];
const currencyOptions = (selected = currency()) =>
  CURRENCY_MARKETS.map(
    ([code, label]) =>
      `<option value="${code}" ${selected === code ? "selected" : ""}>${label}</option>`,
  ).join("");
const amount = (cents) => (cents == null ? "" : (cents / 100).toFixed(2));
const route = () => location.pathname.replace(/\/$/, "") || "/dashboard";
const operatorRoute = () => /^\/admin(?:\/|$)/.test(route());
const adminView = () => {
  const match = route().match(
    /^\/admin\/shops\/(sh_[a-f0-9]{32})\/(preview|orders)$/,
  );
  return match ? { id: match[1], view: match[2] } : null;
};
const isOrdersRoute = () =>
  route() === "/dashboard/orders" || adminView()?.view === "orders";
function canonicalAdminBookmark() {
  const params = new URLSearchParams(location.search),
    id = params.get("adminShop");
  if (
    /^sh_[a-f0-9]{32}$/.test(id || "") &&
    ["/dashboard/editor", "/dashboard/orders"].includes(route())
  )
    history.replaceState(
      null,
      "",
      `/admin/shops/${id}/${isOrdersRoute() ? "orders" : "preview"}${params.get("view") === "live" ? "?view=live" : ""}`,
    );
}
const studioLink = (card, order = false) =>
  "/studio/studio.html?" +
  new URLSearchParams({
    shop: shop.id,
    ...(card ? { card: card.id } : { blank: "1" }),
    ...(!user || publicSnapshot ? { slug: shop.slug } : {}),
    ...(user && !publicSnapshot ? { onboarding: "1" } : {}),
    ...(order ? { action: "order" } : {}),
  });
const buildSlotLink = (number = nextBouquetSlot(draft.collection)) =>
  studioLink(null) + "&slot=" + number;
const trialStudioLink = () => {
  const pending = readTrial(),
    next = nextBouquetSlot(draft.collection);
  return next && pending && [pending.preset, "mixed"].includes(draft.preset)
    ? buildSlotLink(next) + "&trial=1&flowers=" + pending.preset
    : null;
};
const previewLink = () => "/s/" + encodeURIComponent(shop.slug);
const recipeFor = (card) =>
  catalog?.recipes.find((recipe) => recipe.id === card.recipeId);
const cardFlowerType = (card) =>
  card.design?.flowerType ||
  recipeFor(card)?.preset ||
  catalog?.flowers.find((row) =>
    card.design?.items?.some((item) => item.id === row.id),
  )?.preset ||
  draft.preset;
const matchingRecipes = () =>
  (catalog?.recipes || []).filter(
    (recipe) =>
      (draft?.preset || wizard.preset) === "mixed" ||
      recipe.preset === (draft?.preset || wizard.preset),
  );
const matchingFlowers = () =>
  (catalog?.flowers || []).filter(
    (item) => draft?.preset === "mixed" || item.preset === draft?.preset,
  );
const matchingExtras = () =>
  (catalog?.extras || []).filter(
    (item) =>
      !item.preset ||
      draft?.preset === "mixed" ||
      item.preset === draft?.preset,
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
        .filter(
          (item) => result.preset === "mixed" || item.preset === result.preset,
        )
        .map((item) => item.mode),
    ),
  ];
  result.home = {
    ...storefrontHomeDefaults,
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
  const operator = operatorRoute();
  document.body.classList.toggle("operator-workspace", operator);
  document.querySelector(".app-header .beta-label").textContent = operator
    ? "NEBULA ADMIN"
    : "FLORIST WORKSPACE";
  document.title = operator
    ? "Nebula Admin · Customers & subscriptions"
    : "Nebula · Your florist workspace";
  const home = operator ? "/admin" : "/dashboard";
  const floristHome = shop && !publicSnapshot ? previewLink() : "/dashboard";
  const floristNav = `<a class="plain-button" href="${html(floristHome)}" data-nav>My shop</a>`;
  document
    .querySelectorAll(".app-header .wordmark, .app-footer a")
    .forEach((a) => a.setAttribute("href", home));
  $("accountNav").innerHTML = user
    ? `${operator ? '<a class="plain-button" href="/admin" data-nav>Customers & subscriptions</a><a class="plain-button" href="/dashboard" data-nav>Florist workspace ↗</a>' : floristNav}<span class="account-email">${html(user.email)}</span><button class="plain-button" data-action="signout">Sign out</button>`
    : `<a class="plain-button" href="${operator ? "/admin/login" : "/login"}" data-nav>${operator ? "Administrator sign in" : "Florist sign in"} ↗</a>`;
}
async function navigate(path, replace = false) {
  const destination = new URL(path, location.origin);
  if (["/login", "/admin/login"].includes(destination.pathname))
    afterLogin =
      safeReturnPath(destination.searchParams.get("returnTo")) ||
      (destination.pathname === "/admin/login" ? "/admin" : "/dashboard");
  if (publicSnapshot && !path.startsWith("/s/") && user?.emailVerified) {
    publicSnapshot = null;
    await loadSession();
  }
  inspector = null;
  if (adminReadOnly && !/^\/admin\/shops\//.test(path)) {
    await loadSession();
    adminReadOnly = false;
  }
  if (replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  canonicalAdminBookmark();
  const target = adminView();
  if (target && user?.emailVerified && sessionState.isAdmin)
    await loadAdminPreview(
      target.id,
      new URLSearchParams(location.search).get("view") || "draft",
    );
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
  const activePage = activeNavigation(current);
  const setup = new URLSearchParams(location.search).get("setup") === "1";
  if (adminReadOnly) {
    main.innerHTML = `<section class="admin-page"><nav class="operator-tabs" aria-label="Nebula administration"><a href="/admin" data-nav>← Customers & subscriptions</a><span>Inspecting ${html(draft.name)} · READ ONLY</span><a href="/admin/shops/${shop.id}/preview" data-admin-preview data-id="${shop.id}" data-view="draft">Storefront preview</a><a href="/admin/shops/${shop.id}/orders" data-admin-orders data-id="${shop.id}">Customer requests</a></nav><div class="page-heading"><div><p class="eyebrow">NEBULA ADMIN · MERCHANT INSPECTION</p><h1>${heading}</h1><p class="subtle">${description}</p></div><span class="pill">READ ONLY</span></div>${notice()}${content}</section>`;
    hydrateMedia();
    return;
  }
  main.innerHTML = `<div class="workspace ${setup ? "guided-setup" : ""}"><aside class="sidebar"><div class="shop-mini"><div class="shop-monogram">${html((draft.name || "N").slice(0, 1))}</div><div><strong>${html(draft.name)}</strong><small>${adminReadOnly ? "Administrator preview" : isPublished() ? "Published shop" : "Private draft"}</small></div></div><label class="mobile-workspace-nav">Go to<select id="workspacePage">${tabs.map(([path, name]) => `<option value="${path}" ${activePage === path ? "selected" : ""}>${name}</option>`).join("")}</select></label><nav class="sidebar-nav" aria-label="Shop settings">${tabs.map(([path, name, icon]) => `<a href="${path}" data-nav class="${activePage === path ? "active" : ""}" ${activePage === path ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon ? iconMarkup(icon) : ""}</span>${name}</a>`).join("")}</nav><div class="sidebar-bottom"><strong>${isPaid() ? "A space of your own." : "Free to find your finishing touches."}</strong><p>${isPaid() ? "Your paid plan lets you publish when your shop is ready. Square is optional." : "Your preview stays private. Activate the $29 monthly plan when you’re ready to publish."}</p><a href="${previewLink()}" data-nav class="plain-button">Visit my preview ↗</a></div></aside><section class="dashboard-content"><div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${heading}</h1><p class="subtle">${description}</p></div>${adminReadOnly ? '<span class="pill">READ ONLY</span>' : ["/dashboard", "/dashboard/billing"].includes(current) && !dirty ? "" : saveControls()}</div>${notice()}${setup ? setupProgress(current) : ""}${subNavigation(current, setup)}${content}${setup ? setupFooter(current).replace('href="/s/"', 'href="' + previewLink() + '" data-nav') : ""}</section></div>`;
  hydrateMedia();
}

function renderLogin() {
  if (operatorRoute()) {
    loginMode = "signin";
    main.innerHTML = `<section class="operator-login"><div><p class="eyebrow">NEBULA · PLATFORM ADMINISTRATION</p><h1>Your customers.<br><em>Your platform.</em></h1><p class="subtle">Manage florist accounts, subscription access and activation requests.</p></div><section class="auth-card"><p class="eyebrow">ADMINISTRATOR SIGN IN</p><h2>Welcome back.</h2><p class="subtle">Use your existing Nebula administrator account. Access is verified by the server.</p><div id="authMessage" class="notice" role="status" hidden></div><button class="google-button" data-action="google">Continue with Google</button><div class="divider">or use your email</div><form id="authForm"><label class="field">Administrator email<input id="email" name="email" type="email" autocomplete="email" required></label><label class="field"><span class="password-heading">Password<button class="plain-button" type="button" data-action="reset">Forgot password?</button></span><input id="password" name="password" type="password" autocomplete="current-password" required></label><button class="button" type="submit">Open Nebula administration ↗</button></form><p class="helper">For your own flower shop, use the separate <a href="/login" data-nav>florist sign-in</a>.</p></section></section>`;
    return;
  }
  const signup = loginMode === "signup";
  main.innerHTML = `<div class="login-layout"><section class="login-story"><p class="eyebrow">A LITTLE SPACE FOR YOUR FLOWER SHOP</p><h1>Your bouquet.<br>Your name.<br><em>Your shop.</em></h1><p class="subtle">Start with one bouquet. Add its photo and your prices, then let customers make it their own.</p><div class="story-image"><img src="/assets/studio-pink.webp" alt="Soft pink roses and delicate white flowers, wrapped in ivory paper" width="928" height="1152"></div><div class="story-caption"><span>YOUR CRAFT. THEIR IMAGINATION.</span><span>✳</span></div></section><section class="auth-card"><p class="eyebrow">${signup ? "LET’S GET ACQUAINTED" : "WELCOME TO YOUR STUDIO"}</p><h2>${signup ? "Something lovely starts here." : "A little more you."}</h2><p class="subtle">${signup ? "Create your account and start your free private shop preview." : "Sign in to pick up where your flowers left off."}</p><div id="authMessage" class="notice" role="status" hidden></div><button class="google-button" data-action="google"><span class="google-icon" aria-hidden="true">G</span>Continue with Google</button><div class="divider">or use your email</div><form id="authForm"><label class="field">Email address<input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@yourflowershop.com" required></label><label class="field"><span class="password-heading">Password${signup ? "" : '<button class="plain-button" type="button" data-action="reset">Forgot password?</button>'}</span><input id="password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" ${signup ? 'minlength="10"' : ""} required placeholder="${signup ? "At least 10 characters" : "Your password"}"></label><button type="submit" class="button">${signup ? "Create my account" : "Step into my studio"}<span aria-hidden="true">↗</span></button></form><p class="auth-bottom">${signup ? "Already have an account?" : "New around here?"} <button class="plain-button" data-action="auth-mode">${signup ? "Sign in" : "Create an account"}</button></p><p class="beta-note">Your private preview is free. Creating an account does not activate a paid subscription or open customer orders.</p></section></div>`;
  if (config?.signupMode === "private-beta") {
    main.querySelector(".auth-card > .subtle").textContent = signup
      ? "Create an account using your invited email address. Access is limited to invited shops during this beta."
      : "Sign in with your invited account to continue your private shop preview.";
    main.querySelector(".beta-note").textContent =
      "Private beta · invitation required. Creating an account does not open public access, activate a subscription or enable customer orders.";
    if (!signup)
      main.querySelector('[data-action="auth-mode"]').textContent =
        "Invited? Create an account";
  }
  const demoLink = document.createElement("p");
  demoLink.className = "helper login-demo-link";
  demoLink.innerHTML =
    '<a href="/demo">Try the bouquet builder without an account ↗</a>';
  main.querySelector(".auth-card").append(demoLink);
  if (readTrial()) {
    const saved = document.createElement("p");
    saved.className = "trial-resume";
    saved.textContent =
      "Your trial bouquet is kept in this tab. Create your shop to continue it with your own photo and prices.";
    main.querySelector(".auth-card > .subtle").after(saved);
  }
}
function renderVerification() {
  main.innerHTML = `<section class="setup-form"><div class="auth-card"><div class="verification-icon">${icon("mail")}</div><p class="eyebrow">ONE LITTLE STEP FIRST</p><h1>Check your inbox.</h1><p class="subtle">Verify <strong>${html(user.email)}</strong> before opening your shop. Follow the link in your verification email, then come back here.</p><div id="authMessage" class="notice" role="status" hidden></div><div class="actions"><button class="button" data-action="check-verification">I’ve verified my email <span aria-hidden="true">↗</span></button><button class="button secondary" data-action="send-verification">Send verification email</button></div><p class="helper">We send a verification email when you register. If it hasn’t arrived, check Spam or request another email here.</p></div></section>`;
}
function renderRestricted(message) {
  main.innerHTML = `<section class="empty-screen"><div class="lock-icon" aria-hidden="true">✧</div><p class="eyebrow">A SMALL, PRIVATE BETA</p><h1>Your invitation<br>comes <em>first.</em></h1><p class="subtle" style="max-width:430px">${html(message)}</p><p class="helper">Signed in as ${html(user?.email || "your account")}. Shop access is limited to the invited beta accounts.</p><div class="actions" style="margin-top:24px"><button class="button" data-action="retry-session">Check access again</button><button class="button secondary" data-action="signout">Use another account</button></div></section>`;
}
function renderWizard() {
  main.innerHTML = `<section class="setup-form"><p class="eyebrow">YOUR SHOP STARTS HERE</p><h1>Your flowers.<br><em>Your own little shop.</em></h1><p class="subtle">Give your shop a name and see your storefront. Then build the first bouquet customers can customise.</p><div id="pageMessage" class="notice" role="status" hidden></div><form id="createShopForm" class="surface"><div class="form-grid"><label class="field full">Shop name<input id="shopName" data-wizard="name" value="${html(wizard.name)}" maxlength="80" placeholder="The Little Flower Room" required></label><label class="field">What do you make?<select data-wizard="preset"><option value="fresh" ${wizard.preset === "fresh" ? "selected" : ""}>Fresh flowers</option><option value="satin" ${wizard.preset === "satin" ? "selected" : ""}>Satin & eternal flowers</option><option value="mixed" ${wizard.preset === "mixed" ? "selected" : ""}>Fresh + satin</option></select></label></div><details class="setup-details"><summary>My link, currency &amp; location · ${html(wizard.currency)}</summary><div class="form-grid"><label class="field full">Your shop link<input id="shopSlug" data-wizard="slug" value="${html(wizard.slug)}" minlength="3" maxlength="48" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required><span class="helper">${html(location.host)}/s/<span id="slugPreview">${html(wizard.slug || "your-shop-name")}</span></span></label>${localeFields(wizard, "data-wizard")}<label class="field">Shop currency<select data-wizard="currency">${currencyOptions(wizard.currency)}</select></label></div></details><p class="helper">Your preview is private. Confirm your location and currency before opening orders. Start with one bouquet; your logo and other details can come later.</p><div class="form-footer"><span class="helper">You can add your logo and colours later.</span><button class="button" type="submit">See my shop →</button></div></form></section>`;
}
function renderOverview() {
  const next = nextBouquetSlot(draft.collection);
  shell(
    `<section class="surface builder-home"><p class="eyebrow">YOUR FLOWERS. THEIR IMAGINATION.</p><h2>Turn your bouquets into designs customers can customise.</h2><p>Build a recipe, add its name, photo and prices, then see it in your shop.</p><div class="actions">${next ? `<a class="button" href="${buildSlotLink(next)}" data-studio>${draft.collection.length ? "Build next bouquet" : "Build my first bouquet"} →</a>` : ""}<a class="button secondary" href="/dashboard/collection" data-nav>My bouquets · ${draft.collection.length}/6 ↗</a><a class="plain-button" href="${previewLink()}" data-nav>Preview my shop ↗</a></div></section><section class="surface" id="workspaceStatus"></section><div class="overview-shortcuts"><a class="surface shortcut-card" href="/dashboard/collection" data-nav>${icon("bouquet")}<strong>Your bouquet builder</strong><span>${draft.collection.length} / 6 signature bouquets · start with one</span></a><a class="surface shortcut-card" href="/dashboard/prices" data-nav>${icon("flower")}<strong>Flowers & prices</strong><span>${draft.preset === "mixed" ? "Fresh + satin" : draft.preset === "satin" ? "Satin flowers" : "Fresh flowers"}</span></a></div>`,
    "Your bouquet<br><em>builder.</em>",
    "Create your signature bouquets. Let customers make them their own.",
  );
  mountWorkspaceHome({ shop, config, api });
}

function renderBrand() {
  if (new URLSearchParams(location.search).get("setup") === "1") {
    shell(
      `<section class="surface"><h2>The essentials.</h2><p class="subtle">Set the details customers need. Your colours, logo and full website editor remain available whenever you want.</p><div class="form-grid">${field("Shop name", "name", { max: 80, required: true })}${localeFields(draft)}<label class="field">Shop currency<select data-path="currency">${currencyOptions()}</select></label>${field("City / service area", "city", { max: 80 })}${field("Phone or WhatsApp · include country code", "phone", { type: "tel", max: 40 })}</div><p class="helper">Flower collection: ${draft.preset === "mixed" ? "Fresh + satin" : draft.preset === "satin" ? "Satin & eternal" : "Fresh"} · <a href="/dashboard/shop" data-nav>Edit full shop settings</a></p></section>`,
      "Make it <em>your shop.</em>",
      "A few essentials, then your first bouquet.",
    );
    return;
  }
  shell(
    `<section class="surface">${presentationControls(draft.home)}</section><section class="surface"><div class="section-heading"><div><h2>A name they’ll remember.</h2><p class="subtle">The familiar details that make this space yours.</p></div><a class="button secondary small" href="/dashboard/editor" data-nav>Edit on the page ↗</a></div><div class="form-grid">${field("Shop name", "name", { max: 80, required: true })}${field("A little introduction", "tagline", { max: 160 })}${field("City or neighbourhood", "city", { max: 80 })}${field("Phone or WhatsApp", "phone", { type: "tel", max: 40 })}${field("Instagram", "instagram", { max: 120 })}${localeFields(draft)}<label class="field">Requests without online payment<select data-path="requestChannel"><option value="whatsapp" ${draft.requestChannel !== "sms" && draft.requestChannel !== "both" ? "selected" : ""}>WhatsApp</option><option value="sms" ${draft.requestChannel === "sms" ? "selected" : ""}>SMS</option><option value="both" ${draft.requestChannel === "both" ? "selected" : ""}>WhatsApp + SMS</option></select><span class="helper">Uses your phone number above, including its country code. Customers review and send the message themselves.</span></label><label class="field">Your permanent shop link<input value="${html(location.host + previewLink())}" disabled></label></div></section><section class="surface"><h2>Your signature.</h2><div class="media-row"><div class="logo-preview">${draft.logoMediaId ? `<img data-media-id="${html(draft.logoMediaId)}" alt="Your shop logo">` : "✳"}</div><div>${uploadField("logo", null, 1, "Choose a logo")}${draft.logoMediaId ? '<button class="plain-button" data-action="remove-logo">Remove logo</button>' : ""}<p class="helper">PNG, JPEG or WebP · automatically resized to 80 KB.</p></div></div><div class="colour-fields">${[
      ["primary", "Signature colour"],
      ["background", "Paper colour"],
    ]
      .map(
        ([key, label]) =>
          `<label class="colour-control"><input type="color" data-path="theme.${key}" value="${html(draft.theme[key])}" aria-label="${label}"><div><strong>${label}</strong><span data-colour-label="${key}">${html(draft.theme[key]).toUpperCase()}</span></div></label>`,
      )
      .join(
        "",
      )}</div></section><section class="surface"><h2>Made for your craft.</h2><div class="form-grid"><label class="field">Flower collections<select data-preset>${(catalog.presets || []).map((item) => `<option value="${html(item.id)}" ${draft.preset === item.id ? "selected" : ""}>${html(item.name)}${item.available ? "" : " · studio preparing"}</option>`).join("")}</select></label><label class="field">Shop currency &amp; market<select data-path="currency">${currencyOptions()}</select></label></div><p class="helper">${shop.published ? "Add Fresh + satin to offer both collections without changing existing bouquets." : "You can change your preset before publishing. Existing recipes and pricing will never be silently removed. Remove incompatible items first, then choose your new preset."} Currency: ${currency()}. Use the same currency as your Square account if you connect it.</p><div class="mode-options"><span class="tiny-label">BUILDER MODES</span>${[...new Set(matchingRecipes().map((item) => item.mode))].map((mode) => `<label class="toggle-line"><input type="checkbox" data-mode="${html(mode)}" ${draft.enabledModes.includes(mode) ? "checked" : ""}>${html(mode.charAt(0).toUpperCase() + mode.slice(1))}</label>`).join("") || '<p class="helper">Matching modes will appear when the library is available.</p>'}</div></section>`,
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
      return `<tr data-price-row data-collection="${html(item.preset || "shared")}" data-search="${html((item.en || item.label || item.id).toLowerCase())}" class="${disabled ? "unavailable" : ""}"><td><label class="availability-hit"><input type="checkbox" data-${extras ? "extra" : "flower"}-enabled="${html(item.id)}" aria-label="Offer ${html(item.en || item.label || item.id)}" ${disabled ? "" : "checked"}></label></td><td><div class="asset-name">${item.image ? `<img src="${html(item.image)}" alt="" loading="lazy">` : ""}<div>${html(item.en || item.label || item.id)}<small>${html((item.group || item.family || (extras ? "Finishing touch" : "Flower")).replaceAll("_", " "))}</small></div></div></td><td><input class="price-input" type="number" min="0" max="10000" step="0.01" inputmode="decimal" data-${extras ? "extra" : "flower"}-price="${html(item.id)}" aria-label="${html(item.en || item.label || item.id)} price in ${currency()}" value="${amount(value)}" placeholder="Set price"></td></tr>`;
    })
    .join("");
}
async function renderPrices() {
  const currentLocation = location.href;
  const pricingDraft = draft;
  const usedCard = draft.collection.find(
    (card) => card.id === new URLSearchParams(location.search).get("used"),
  );
  const usedDesign =
    usedCard && (usedCard.design || recipeFor(usedCard)?.design);
  const usedIds = new Set((usedDesign?.items || []).map((item) => item.id));
  let usedExtras = null;
  if (usedDesign) {
    try {
      const { validateDesign } = await import("/policy.mjs");
      if (location.href !== currentLocation || draft !== pricingDraft) return;
      const result = validateDesign(
        usedDesign,
        { ...draft, disabledFlowers: [], disabledExtras: [] },
        catalog,
        { allowUnpriced: true },
      );
      usedExtras = new Set(
        (result.pricing?.extraLines || []).map((line) => line.id),
      );
    } catch {
      if (location.href !== currentLocation || draft !== pricingDraft) return;
      pageMessage =
        "The bouquet’s extra list could not load. All finishing touches are shown below; check the items you use.";
    }
  }
  const flowers = matchingFlowers().filter(
      (item) => !usedDesign || usedIds.has(item.id),
    ),
    extras = matchingExtras().filter(
      (item) => !usedExtras || usedExtras.has(item.id),
    );
  const priceGroup = (item) =>
    (draft.preset === "mixed"
      ? item.preset === "satin"
        ? "Satin · "
        : "Fresh · "
      : "") + (item.group || item.family || "flowers");
  const groups = [...new Set(flowers.map(priceGroup))];
  shell(
    `<section class="surface"><h2>Your build-your-own bouquet section</h2><p class="subtle">This is the heart of your shop. Choose the flowers and extras customers can use, and set your prices before opening orders.</p><label class="toggle-line"><input type="checkbox" data-open-builder ${draft.home.sections.includes("builder") ? "checked" : ""}> Show the independent bouquet builder in my shop</label><a class="plain-button" href="/dashboard/collection" data-nav>My customisable recipes ↗</a></section>${!presetReady() ? '<div class="notice">Your matching studio is preparing. You can save brand details and products now. We only show assets belonging to your chosen preset.</div>' : ""}${flowers.length ? `<section class="surface"><div class="section-heading"><div><h2>Your flowers. Your prices.</h2><p class="subtle">Choose what you offer. Enter a price per stem in ${currency()}.</p></div><span class="pill">${currency()}</span></div><div class="price-toolbar">${draft.preset === "mixed" ? '<select id="flowerTypeFilter" aria-label="Filter flower collection"><option value="">Fresh + satin</option><option value="fresh">Fresh flowers</option><option value="satin">Satin flowers</option></select>' : ""}<input id="flowerSearch" type="search" placeholder="Find a flower…" aria-label="Search flowers"><button class="plain-button" data-action="sample-prices">Use sample prices</button><button class="plain-button" data-action="disable-unpriced">Turn off unpriced items</button></div>${groups.map((group) => `<section data-price-group><h3 class="catalogue-group">${html(group.replaceAll("_", " "))}</h3>${group === "money" ? `<p class="helper">Price each folded note in ${currency()}, including cash and any styling. No automatic exchange rate, fixed assembly fee or customer-supplied-cash adjustment is added.</p>` : ""}<table class="price-table"><thead><tr><th>OFFER</th><th>FLOWER</th><th>${group === "money" ? "PER NOTE" : "PER ITEM"} · ${currency()}</th></tr></thead><tbody>${priceRows(flowers.filter((item) => priceGroup(item) === group))}</tbody></table></section>`).join("")}<p id="noFlowers" class="helper" hidden>No flowers match your search.</p></section>` : '<section class="surface"><h2>A library, taking shape.</h2><p class="subtle">Matching flowers are not available in this preset yet.</p></section>'}${extras.length ? `<section class="surface" data-price-group><h2>The finishing touches.</h2><p class="subtle">Toggle availability and set your own prices for extras.</p><table class="price-table"><thead><tr><th>OFFER</th><th>EXTRA</th><th>PRICE · ${currency()}</th></tr></thead><tbody>${priceRows(extras, true)}</tbody></table></section>` : ""}`,
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
        `<option value="${html(recipe.id)}" ${card.recipeId === recipe.id && !card.design ? "selected" : ""}>${html(recipe.name)} · ${draft.preset === "mixed" ? (recipe.preset === "satin" ? "Satin · " : "Fresh · ") : ""}${html(recipe.mode)}</option>`,
    )
    .join("")}</select></label>`;
}
function availability(kind, item) {
  return `<label class="toggle-line"><input type="checkbox" data-item-kind="${kind}" data-item-id="${html(item.id)}" data-item-key="available" ${item.available !== false ? "checked" : ""}>Available in my shop</label>`;
}
function renderCollection() {
  const inspirationOpen = $("recipeInspiration")?.open === true;
  const slots = bouquetSlots(draft.collection);
  const next = nextBouquetSlot(draft.collection);
  const recipes = matchingRecipes();
  const cards = slots
    .map((card, index) =>
      card
        ? `<article class="surface collection-editor" id="bouquet-slot-${index + 1}" data-bouquet-slot="${index + 1}">${cover(card)}<div class="collection-body"><p class="tiny-label">BOUQUET ${index + 1} OF 6 · ${card.available === false ? "HIDDEN" : "IN YOUR COLLECTION"}</p><h2>${html(card.title)}</h2><p class="helper">Recipe saved · ${card.cover ? "Photo added" : "Add your photo & prices"}</p><div class="bouquet-actions"><a class="button small" href="${studioLink(card)}" data-studio>Edit recipe ↗</a><button class="button secondary small" data-action="finish-bouquet" data-id="${html(card.id)}">Name, photo & prices</button><a class="plain-button" href="${studioLink(card)}&try=1" data-studio>Try customer customisation ↗</a></div>${availability("collection", card)}<button class="plain-button danger" data-action="remove-card" data-id="${html(card.id)}">Remove bouquet</button></div></article>`
        : `<article class="surface bouquet-empty-slot" id="bouquet-slot-${index + 1}" data-bouquet-slot="${index + 1}"><span class="bouquet-slot-number" aria-hidden="true">${index + 1}</span><h2>Bouquet ${index + 1}</h2><p>Build its recipe, then add your name, photo and prices.</p><a class="button secondary small" href="${buildSlotLink(index + 1)}" data-studio>Build bouquet ${index + 1} →</a></article>`,
    )
    .join("");
  shell(
    `<section class="surface builder-workspace-intro"><div><p class="eyebrow">YOUR SHOP’S BOUQUET BUILDER</p><p>Build up to six signature bouquets for your customers to order or customise.</p><ol class="bouquet-steps"><li>Build the recipe</li><li>Name, photo & prices</li><li>See it in your shop</li></ol><p class="helper">Start with one. Add more later. Changes stay private until published.</p></div><div class="actions">${next ? `<a class="button" href="${buildSlotLink(next)}" data-studio>${draft.collection.length ? "Build next bouquet" : "Build my first bouquet"} →</a>` : '<span class="pill">All six bouquets saved</span>'}<a class="plain-button" href="${previewLink()}" data-nav>Preview my shop ↗</a></div></section><details class="surface builder-visibility"><summary>Customer builder · ${draft.home.sections.includes("builder") ? "shown in your shop" : "hidden in your shop"}</summary><label class="toggle-line"><input type="checkbox" data-open-builder ${draft.home.sections.includes("builder") ? "checked" : ""}> Show “Design your bouquet” in my shop</label><p class="helper">Customers can start from scratch with your offered, priced flowers. Your six cards are additional starting points. <a href="/dashboard/prices" data-nav>Choose flowers & prices</a>.</p></details><div class="section-heading"><h2>Your six bouquet slots</h2><span class="pill">${draft.collection.length} / 6 SAVED</span></div><nav class="bouquet-slot-nav" aria-label="Jump to bouquet slot">${slots.map((card, index) => `<a href="#bouquet-slot-${index + 1}" aria-label="Bouquet ${index + 1}: ${html(card?.title || "empty slot")}">${index + 1}<span>${card ? "Saved" : "Build"}</span></a>`).join("")}</nav><div class="bouquet-slot-grid">${cards}</div><details class="surface recipe-library" id="recipeInspiration" ${inspirationOpen ? "open" : ""}><summary>Need a starting point? Explore the recipe library</summary><p class="helper">Optional inspiration. Edit the recipe in your builder and add your own photo.</p><div class="recipe-picker">${recipes.map((recipe) => `<article><img src="${html(recipe.cover)}" alt="${html(recipe.name)} library recipe" loading="lazy"><strong>${html(recipe.name)}</strong><small>${html(recipe.mode)}</small><button class="button secondary small" data-action="add-card" data-recipe="${html(recipe.id)}" ${!next ? "disabled" : ""}>Add to collection +</button></article>`).join("")}</div></details><p class="helper">Also selling gifts? <a href="/dashboard/products" data-nav>Manage your ten fixed products</a>.</p>`,
    "Your bouquet<br><em>builder.</em>",
    "Turn the bouquets you make into designs your customers can customise.",
    "BUILDER & SIGNATURE BOUQUETS",
  );
  if (trialStudioLink() && !adminReadOnly) {
    const resume = document.createElement("section");
    resume.className = "surface trial-resume";
    resume.innerHTML = `<p>Your demo bouquet is still in this tab. Keep building it with your own photo and prices.</p><a class="button secondary small" href="${trialStudioLink()}" data-studio>Continue my demo bouquet →</a>`;
    main.querySelector(".builder-workspace-intro").after(resume);
  }
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

function renderShopAddress() {
  const section = document.createElement("section");
  section.className = "surface shop-address";
  section.innerHTML = `<p class="eyebrow">YOUR SHOP LINK</p><h2>${isPublished() ? "Ready to share." : "Your address is reserved."}</h2><label class="field">Shop address<input id="shopAddress" type="url" readonly value="${html(location.origin + previewLink())}"></label><p class="helper">${isPublished() ? "Customers can open this published shop without signing in." : "Only you can preview this draft. Customers can open this same address after activation and publication."}</p><div class="actions"><button class="button secondary" data-action="copy-shop-link">Copy shop link</button><a class="plain-button" href="${previewLink()}${isPublished() ? "?view=live" : ""}" ${isPublished() ? "" : "data-nav"}>${isPublished() ? "Open customer shop" : "Open private preview"} ↗</a></div><p id="shopLinkStatus" class="helper" role="status"></p>`;
  main.querySelector(".dashboard-content .activation-grid").after(section);
}
function renderBilling() {
  const paid = isPaid(),
    active = isPublished();
  const billingReady = config.billingEnabled === true;
  const test =
    config.billingEnvironment === "test" ||
    config.billingMode === "test" ||
    config.providers?.billing === "test";
  const readiness = (shop.readiness || []).filter(
    ({ code }) =>
      code !== "square_setup_pending" &&
      code !== "square_not_connected" &&
      !(config.manualActivationEnabled && code === "billing_setup_pending"),
  );
  const canPublish =
    paid &&
    config.publishingEnabled === true &&
    publicationState.shopId === shop.id &&
    publicationState.version === version &&
    publicationState.report?.canPublish === true &&
    publicationState.report?.draftVersion === version &&
    !dirty &&
    !saving;
  shell(
    `<div class="activation-grid"><section class="surface plan-surface"><p class="eyebrow">YOUR OWN NEBULA SHOP</p><h2>Make a beautiful<br>beginning.</h2><div class="plan-price"><strong>$29</strong><span>USD / month</span></div><p class="helper">${paid ? "Your subscription is active." : "Start with a free private preview. Activate only when you’re ready to publish."}</p><ul class="feature-list"><li>A branded public storefront</li><li>Six customisable bouquet cards</li><li>Ten fixed products with your own photos</li><li>Your flower library, prices and bouquet builder</li><li>Optional Square connection for customer payments</li></ul>${paid ? `<button class="button light" data-action="billing-portal" ${config.billingPortalEnabled === false ? "disabled" : ""}>Manage subscription ↗</button>` : `<button class="button light" data-action="billing-checkout" ${!billingReady ? "disabled" : ""}>${billingReady ? (test ? "Test checkout · $29 / month" : "Activate my shop · $29 / month") : "Activation setup pending"}</button>`}<p class="helper">${billingReady ? (test ? "Test environment. This checkout does not represent a live paid launch." : "Secure subscription checkout. Your plan activates after the provider confirms payment.") : "Your free preview is ready. Secure billing is being connected; activation is unavailable until setup is complete."}</p></section><section class="surface"><span class="pill ${paid ? "green" : ""}">${active ? "PUBLISHED" : paid ? "PLAN ACTIVE" : "FREE PRIVATE PREVIEW"}</span><h2 style="margin-top:24px">${active ? "Your shop is live" : "Publish your shop"}</h2><p class="subtle">Publishing makes your saved shop and bouquet builder available to customers.</p><ol class="checklist"><li><span class="check-circle ${paid ? "done" : ""}">${paid ? "✓" : "○"}</span><div><strong>${paid ? "Plan active" : "Activate your plan"}</strong><p>${config.sandboxTestAccess ? "Test access is managed by the Nebula administrator." : "Hosted storefront · $29 USD per 30 days."}</p></div></li><li><span class="check-circle ${active ? "done" : ""}">${active ? "✓" : "○"}</span><div><strong>${active ? "Your shop is published" : "Publish your chosen draft"}</strong><p>Square is optional and never required to publish.</p></div></li></ol>${
      readiness.length
        ? `<div class="readiness-list">${readiness
            .map(
              (item) =>
                `<p class="helper">○ ${html(item.message || item.code)}</p>`,
            )
            .join("")}</div>`
        : ""
    }<button class="button" data-action="${canPublish ? "publish-shop" : "review-publication"}" ${publicationState.loading || saving ? "disabled" : ""}>${canPublish ? (active ? "Publish latest changes" : "Publish my shop") : "Review publishing requirements"} ↗</button><p class="helper" role="status">${html(!paid ? (config.sandboxTestAccess ? "Test access is not active. Ask the Nebula administrator to activate this shop in the separate admin console." : "Once your plan is active, you can publish your saved draft and share your shop link.") : dirty ? "Save your edits before publishing." : publicationState.error || (publicationState.report?.canPublish ? "Your saved draft is ready to publish." : "Review the checklist below for missing prices or shop details."))}</p><p class="helper">${!paid ? "Your public address remains locked until your subscription is verified and you publish." : !config.publishingEnabled ? "Publication setup is pending. Your active plan does not bypass the server’s publication checks." : "Publication saves a separate snapshot. Later draft edits stay private."}</p></section></div><details class="surface domain-plan"><summary>Custom domain · future option</summary><div><span class="pill">COMING LATER</span><h3>Your own domain · $35 USD / month</h3><p class="subtle">A future option for your own website address. Domain registration and renewal are paid by you, separately.</p><p class="helper">Domain setup and verification are being tested. This plan is not available to purchase yet.</p></div><button class="button secondary" disabled>Own-domain setup preparing</button></details>`,
    "Activate &amp; publish",
    "Review your saved shop, activate access and open your public link.",
    "PLAN & PUBLISHING",
  );
  renderShopAddress();
  renderPublicationChecklist();
  mountManualPlan({
    shop,
    config,
    api,
    onChange: (next) => {
      if (shop?.id !== next.id) return;
      shop.activationRequest = next.activationRequest;
      if (route() === "/dashboard/billing") renderBilling();
    },
  });
  if (config.manualActivationEnabled)
    main.querySelector(".domain-plan")?.remove();
}
function renderPublicationChecklist() {
  if (
    publicationState.shopId !== shop.id ||
    publicationState.version !== version
  )
    publicationState = {
      shopId: shop.id,
      version,
      report: null,
      error: "",
      loading: false,
    };
  const state = publicationState,
    report = state.report;
  const section = document.createElement("section");
  section.className = "surface publication-checklist";
  const checks = report?.checks || [];
  const priceChecks = checks.filter((c) =>
    ["unpriced_flower", "unpriced_extra"].includes(c.code),
  );
  const otherChecks = checks.filter((c) => !priceChecks.includes(c));
  section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">YOUR SAVED DRAFT</p><h2>${report?.contentReady ? "Your content is ready." : "A few details before opening."}</h2><p class="subtle">${dirty || saving ? "Save your current edits to check the latest version." : "Checks use the saved catalogue, recipes and product prices."}</p></div><button class="button secondary small" data-action="refresh-readiness" ${state.loading || dirty || saving ? "disabled" : ""}>${state.loading ? "Checking…" : "Check saved draft ↻"}</button></div>${state.error ? `<div class="notice error">${html(state.error)}</div>` : ""}${
    report
      ? `<div class="publication-summary"><span class="pill ${report.contentReady ? "green" : ""}">${report.contentReady ? "CONTENT READY" : "CONTENT NEEDS ATTENTION"}</span><span class="helper">Draft version ${html(report.draftVersion)} · ${report.canPublish ? "Ready to publish" : !config.publishingEnabled ? "Publishing unavailable" : !isPaid() ? "Activation required to publish" : "Review the details below"}</span></div>${
          checks.length
            ? `${config.sandboxTestAccess ? '<div class="notice"><strong>Just testing Square?</strong><p>Prepare a smaller test catalogue in one step. Fill missing prices from available samples and hide unpriced items or incomplete bouquets. Your entered prices, artwork and products are kept. This saves a draft; it does not publish or approve checkout rules.</p><button class="button secondary small" data-action="sandbox-test-catalog">Prepare test catalogue</button></div>' : ""}<ul class="publication-issues">${priceChecks.length ? `<li><span aria-hidden="true">!</span><div><strong>${priceChecks.length} catalogue items need a price or need to be turned off.</strong><small>You only need to price the items you want to offer.</small></div><a href="/dashboard/prices" data-nav>Choose items ↗</a></li>` : ""}${otherChecks
                .map((check) => {
                  const href = safeReturnPath(check.href);
                  return `<li class="${check.severity === "warning" ? "warning" : ""}"><span aria-hidden="true">${check.severity === "warning" ? "○" : "!"}</span><div><strong>${html(check.message || check.code)}</strong></div>${href ? `<a href="${html(href)}" data-nav>Review ↗</a>` : ""}</li>`;
                })
                .join("")}</ul>`
            : '<p class="helper">All available catalogue items and saved products passed the content check.</p>'
        }<p class="helper">Content readiness is separate from your subscription and payment connection. A ready draft does not activate billing or customer checkout.</p>`
      : state.loading
        ? '<p class="subtle">Reviewing your saved shop details…</p>'
        : ""
  }`;
  main.querySelector(".dashboard-content").append(section);
  if (!state.report && !state.error && !state.loading)
    loadPublicationReadiness();
}
async function loadPublicationReadiness() {
  const state = publicationState;
  if (state.loading || !shop || adminReadOnly) return;
  state.loading = true;
  state.error = "";
  const previousRequest = shop.activationRequest;
  if (route() === "/dashboard/billing") renderBilling();
  try {
    const [report, current] = await Promise.all([
      api("/api/shops/" + encodeURIComponent(state.shopId) + "/readiness"),
      api("/api/shops/" + encodeURIComponent(state.shopId)),
    ]);
    if (state === publicationState && shop?.id === state.shopId) {
      shop.subscription = current.shop.subscription;
      shop.published = current.shop.published;
      if (shop.activationRequest === previousRequest)
        shop.activationRequest = current.shop.activationRequest;
    }
    if (
      state === publicationState &&
      state.shopId === shop?.id &&
      state.version === version
    )
      state.report = report;
  } catch (error) {
    if (state === publicationState) state.error = errorText(error);
  } finally {
    state.loading = false;
    if (state === publicationState && route() === "/dashboard/billing")
      renderBilling();
  }
}
async function loadSquareStatus() {
  if (squareState.loading || !shop || adminReadOnly) return;
  const state = squareState;
  state.loading = true;
  state.error = "";
  try {
    state.data = await api(
      "/api/shops/" + encodeURIComponent(shop.id) + "/square/status",
    );
  } catch (error) {
    state.error = errorText(error);
  } finally {
    state.loaded = true;
    state.loading = false;
    if (state === squareState && route() === "/dashboard/payments")
      renderPayments();
  }
}
function renderPayments() {
  const retainedCommerce = main.querySelector(".commerce-panel");
  const squareExpanded = main.querySelector(".optional-square")?.open;
  const activeField = document.activeElement;
  const activePath = activeField?.dataset?.path;
  const selection = activeField?.selectionStart;
  if (squareState.shopId !== shop.id)
    squareState = {
      shopId: shop.id,
      loaded: false,
      loading: false,
      data: null,
      error: "",
      callbackOutcome: "",
    };
  const squareParam = new URLSearchParams(location.search).get("square");
  if (squareParam) {
    squareState.callbackOutcome = squareParam;
    squareState.loaded = false;
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete("square");
    history.replaceState(
      null,
      "",
      cleanUrl.pathname + cleanUrl.search + cleanUrl.hash,
    );
  }
  if (!squareState.loaded && !squareState.loading)
    queueMicrotask(loadSquareStatus);
  const paid = isPaid(),
    connection = squareState.data,
    ready =
      config.squareConnectionEnabled === true && connection?.available === true;
  const connected = connection?.connected === true,
    manage = connection?.canManage === true;
  const labels = {
    not_connected: "NOT CONNECTED",
    connected: connected
      ? config.squareEnvironment === "production"
        ? "LIVE CONNECTED"
        : "SANDBOX CONNECTED"
      : "CONNECTION PAUSED",
    expired: "TOKEN EXPIRED",
    reconnect_required: "RECONNECT REQUIRED",
    disconnect_pending: "DISCONNECT PENDING",
    revoked: "DISCONNECTED",
    provider_setup_pending: "SETUP PENDING",
  };
  const stateLabel = squareState.loading
    ? "CHECKING CONNECTION"
    : labels[connection?.status] || "SETUP PENDING";
  const choices = connection?.locations || [];
  const alertError =
    squareState.error ||
    (!connected && connection?.lastError) ||
    (!connected &&
    !squareState.loading &&
    squareState.callbackOutcome === "connection_failed"
      ? "Square authorization could not be completed. Confirm that your shop currency matches your Square seller account and start a fresh connection."
      : "");
  const callbackSuccess =
    connected &&
    ["sandbox_connected", "connected"].includes(squareState.callbackOutcome)
      ? "Square account connected. Confirm your location and approve your online order rules below so customers can pay via Square."
      : "";
  const marketLabel =
    CURRENCY_MARKETS.find(([code]) => code === currency())?.[1] || currency();
  const sandboxHelp =
    config.squareEnvironment === "sandbox"
      ? `<div class="notice square-sandbox-help"><strong>Before connecting the Sandbox seller</strong><ol><li>Open <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer">Square Developer Console ↗</a> in this same browser profile.</li><li>Under <strong>Sandbox test accounts</strong>, click <strong>Square Dashboard</strong> next to your test seller (${html(marketLabel)}—or change your shop currency below to match). Leave that tab open.</li><li>Return here and click <strong>Connect Square Sandbox ↗</strong> to authorize.</li></ol><p>Your shop currency (currently <strong>${currency()}</strong>) must match the test seller’s country and currency. No real money is charged in Sandbox.</p><a href="https://developer.squareup.com/docs/oauth-api/walkthrough" target="_blank" rel="noopener noreferrer">Square’s Sandbox authorization instructions ↗</a></div>`
      : "";
  const currencyField = !connected
    ? `<label class="field" style="max-width:320px;margin:14px 0">Shop currency &amp; Square market<select data-path="currency">${currencyOptions()}</select></label>`
    : "";
  shell(
    `<div class="activation-grid"><section class="surface"><details class="optional-square" ${connected || squareExpanded ? "open" : ""}><summary>Accept online payments with Square · optional</summary><div class="connection-mark">${icon("square")}</div><span class="pill ${connected ? "green" : ""}">${html(stateLabel)}</span><h2 style="margin-top:23px">Accept payments<br>with Square.</h2><p class="subtle">Let customers pay a deposit or the full price. Payments go to your Square account.${config.squareEnvironment === "sandbox" ? " Sandbox only · no real money." : ""}</p>${!connected && sandboxHelp ? `<details class="setup-details"><summary>Sandbox testing instructions</summary>${sandboxHelp}</details>` : ""}${currencyField}${callbackSuccess ? `<div class="notice" role="status">${html(callbackSuccess)}</div>` : ""}${alertError ? `<div class="notice error" role="alert">${html(alertError)}</div>` : ""}<div class="actions">${!connected ? `<button class="button" data-action="square-connect" ${!paid || !ready || squareState.loading ? "disabled" : ""}>${!paid ? "Activate your plan first" : ready ? (config.squareEnvironment === "production" ? "Connect Square ↗" : "Connect Square Sandbox ↗") : "Square setup pending"}</button>` : ""}<button class="button secondary small" data-action="square-refresh" ${squareState.loading ? "disabled" : ""}>Refresh status</button>${manage && connection?.merchantId && connection.status !== "revoked" ? '<button class="button secondary small" data-action="square-disconnect">Disconnect Square</button>' : ""}</div><details class="setup-details"><summary>Connection details</summary><p class="helper">${!paid ? "You can keep editing your private shop. A paid plan is required to begin a merchant connection. Existing connections can still be inspected or disconnected after plan expiry." : !ready ? "Sandbox configuration must be completed securely on the server before connecting." : "Your Square authorization returns here. Status comes from the server, never the return URL."}</p>${connection?.verifiedAt ? `<p class="helper">Last provider check: ${html(new Date(connection.verifiedAt).toLocaleString())}</p>` : ""}</details>${choices.length ? `<label class="field">Square location<select id="squareLocation"><option value="">Choose a matching location</option>${choices.map((item) => `<option value="${html(item.id)}" ${item.id === connection.locationId ? "selected" : ""}>${html(item.name)} · ${html(item.currency)}</option>`).join("")}</select></label><button class="button secondary small" data-action="square-location" ${!paid || !ready ? "disabled" : ""}>Use this location</button>` : ""}</details></section><section class="surface request-channel-panel"><div class="connection-mark">${icon("message")}</div><p class="eyebrow">MESSAGE REQUESTS</p><h2>Receive requests<br>by message.</h2><p class="subtle">When online checkout is off, customers save their bouquet and send you a ready-made message. You confirm the details and arrange payment.</p><label class="field">How customers contact you<select data-path="requestChannel"><option value="whatsapp" ${draft.requestChannel !== "sms" && draft.requestChannel !== "both" ? "selected" : ""}>WhatsApp</option><option value="sms" ${draft.requestChannel === "sms" ? "selected" : ""}>SMS</option><option value="both" ${draft.requestChannel === "both" ? "selected" : ""}>WhatsApp + SMS</option></select></label>${field("Your number · include country code", "phone", { type: "tel", max: 40 })}<p class="helper">Save and publish changes to update these options for customers. They open their messaging app and send the message. Requests are also saved in your orders; no payment is recorded.</p><a class="button secondary small" href="/dashboard/orders" data-nav>Open requests ↗</a></section></div>`,
    "How customers<br><em>order & pay.</em>",
    config.checkoutEnabled
      ? "Choose online payments or message requests. Your orders stay together."
      : "Message requests are available after publishing. Online payments are optional.",
    "RECEIVE ORDERS",
  );
  if (!adminReadOnly && retainedCommerce?.dataset.shopId === shop.id) {
    const content = main.querySelector(".dashboard-content");
    const next = content.querySelector(".setup-next");
    if (next) next.before(retainedCommerce);
    else content.append(retainedCommerce);
    retainedCommerce.updateSquare?.(connection);
    if (retainedCommerce.contains(activeField))
      activeField.focus({ preventScroll: true });
  } else if (!adminReadOnly)
    mountCommerce({
      shop: { ...shop, draft },
      api,
      square: connection,
      config,
    });
  if (activePath && route() === "/dashboard/payments") {
    const field = [...main.querySelectorAll("[data-path]")].find(
      (node) => node.dataset.path === activePath,
    );
    if (field) {
      field.focus({ preventScroll: true });
      if (
        Number.isInteger(selection) &&
        typeof field.setSelectionRange === "function"
      )
        try {
          field.setSelectionRange(selection, selection);
        } catch {}
    }
  }
}
const requestStatuses = ["requested", "accepted", "fulfilled", "cancelled"];
const requestStatusLabel = (status) =>
  ({
    requested: "New request",
    accepted: "Accepted",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
  })[status] || "New request";
const requestTransitions = (status) =>
  ({
    requested: ["requested", "accepted", "cancelled"],
    accepted: ["accepted", "fulfilled", "cancelled"],
    fulfilled: ["fulfilled"],
    cancelled: ["cancelled"],
  })[status] || ["requested"];
const requestMoney = (request) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: request.currency || currency(),
  }).format(request.totalCents / 100);
const requestDate = (timestamp) =>
  Number.isFinite(Number(timestamp))
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(Number(timestamp)))
    : "—";
function ordersContext() {
  if (ordersState.shopId !== shop?.id || ordersState.admin !== adminReadOnly)
    ordersState = {
      ...emptyOrdersState(),
      shopId: shop?.id,
      admin: adminReadOnly,
    };
  return ordersState;
}
function requestsPath() {
  return (
    (adminReadOnly ? "/api/admin/shops/" : "/api/shops/") +
    encodeURIComponent(shop.id) +
    "/requests"
  );
}
function requestEdit(request) {
  let edit = ordersState.edits.get(request.id);
  if (!edit) {
    edit = {
      version: request.version || 1,
      status: request.status,
      merchantNote: request.merchantNote || "",
      dirty: false,
      conflict: false,
    };
    ordersState.edits.set(request.id, edit);
  }
  return edit;
}
function requestContents(request) {
  const preview = request.preview
    ? `<img class="request-photo" src="${html(request.preview)}" alt="Customer’s saved bouquet preview">`
    : "";
  if (request.kind === "product")
    return `<section class="request-contents"><h3>The product they chose</h3>${preview || (request.product?.cover ? `<img class="request-photo" data-media-id="${html(request.product.cover)}" alt="Saved product photo">` : "")}<strong>${html(request.product?.title || request.summary)}</strong>${request.product?.description ? `<p class="request-multiline">${html(request.product.description)}</p>` : ""}</section>`;
  const lines = [
    ...(request.pricing?.lines || []),
    ...(request.pricing?.extraLines || []),
  ];
  const itemName = (id) => {
    const row = [...(catalog?.flowers || []), ...(catalog?.extras || [])].find(
      (item) => item.id === id,
    );
    return row?.en || row?.label || id;
  };
  const contents = lines.length
    ? lines
    : Object.entries(
        (request.design?.items || []).reduce((counts, item) => {
          counts[item.id] = (counts[item.id] || 0) + 1;
          return counts;
        }, {}),
      ).map(([id, quantity]) => ({ id, quantity }));
  return `<section class="request-contents"><h3>The bouquet they created</h3>${preview}<p class="helper">${html(request.design?.mode || "Custom")} · ${request.design?.items?.length || 0} pieces · saved with the request</p><ul class="request-pick-list">${contents.map((line) => `<li><span>${html(line.quantity || 1)} × ${html(itemName(line.id))}</span>${Number.isSafeInteger(line.totalCents) ? `<strong>${html(new Intl.NumberFormat("en", { style: "currency", currency: request.currency || currency() }).format(line.totalCents / 100))}</strong>` : ""}</li>`).join("")}</ul>${request.design?.finishes?.message ? `<p class="request-multiline"><strong>Bouquet message</strong><br>${html(request.design.finishes.message)}</p>` : ""}<button class="plain-button" data-action="orders-download" data-id="${html(request.id)}">Download saved bouquet details ↓</button></section>`;
}
function requestDetailMarkup() {
  const state = ordersState,
    request = state.detail;
  if (state.detailLoading)
    return '<aside class="surface request-detail" aria-busy="true"><p class="subtle">Opening the saved request…</p></aside>';
  if (!request)
    return '<aside class="surface request-detail request-empty-detail"><span aria-hidden="true">✳</span><h2>A little occasion,<br>waiting to unfold.</h2><p class="subtle">Choose a request to see its saved bouquet, customer details and fulfillment progress.</p></aside>';
  const edit = requestEdit(request);
  const customer = request.customer || {};
  const phone = customer.phone?.replace(/[^\d+]/g, "") || "";
  return `<aside class="surface request-detail"><div class="request-detail-heading"><div><p class="eyebrow">SAVED CUSTOMER REQUEST</p><h2>${html(request.summary || "A personal bouquet")}</h2></div><button class="plain-button" data-action="orders-close" aria-label="Close request details">×</button></div><div class="request-status-line"><span class="pill request-status-${html(request.status)}">${html(requestStatusLabel(request.status))}</span><span class="pill">${html(request.checkout?.status || request.paymentStatus || "unpaid")}</span></div><p class="request-id">${html(request.reference || request.id)}</p><dl class="request-facts"><div><dt>Saved total</dt><dd class="request-total">${html(requestMoney(request))}</dd></div><div><dt>Received</dt><dd>${html(requestDate(request.createdAt))}</dd></div><div><dt>Customer</dt><dd>${html(customer.name || "—")}</dd></div><div><dt>Contact</dt><dd>${phone && /^\+?\d{5,15}$/.test(phone) ? `<a href="tel:${html(phone)}">${html(customer.phone)}</a>` : html(customer.phone || "—")}</dd></div><div><dt>Fulfillment</dt><dd>${html(request.fulfillment === "delivery" ? "Delivery · confirm details" : "Pickup")}</dd></div>${customer.address ? `<div><dt>Delivery address</dt><dd>${html(customer.address)}</dd></div>` : ""}${customer.recipient ? `<div><dt>Gift recipient</dt><dd>${html(customer.recipient.name)}${customer.recipient.phone ? " · " + html(customer.recipient.phone) : ""}</dd></div><div><dt>Gift card message</dt><dd class="request-multiline">${html(customer.recipient.message || "—")}</dd></div>` : ""}${customer.postalCode ? `<div><dt>Postal code / country</dt><dd>${html(customer.postalCode)} · ${html(customer.country || "")}</dd></div>` : ""}<div><dt>Preferred date</dt><dd>${html(customer.date || "To be confirmed")}</dd></div></dl>${customer.note ? `<div class="request-customer-note"><strong>From the customer</strong><p class="request-multiline">${html(customer.note)}</p></div>` : ""}${request.checkout ? `<p class="helper">Final checkout total: ${html(new Intl.NumberFormat("en", { style: "currency", currency: request.currency }).format(request.checkout.totalCents / 100))} · Paid: ${html(new Intl.NumberFormat("en", { style: "currency", currency: request.currency }).format(request.checkout.paidCents / 100))} · Remaining: ${html(new Intl.NumberFormat("en", { style: "currency", currency: request.currency }).format(request.checkout.balanceCents / 100))}</p>` : ""}${requestContents(request)}<section class="request-progress"><h3>Fulfillment progress</h3>${
    adminReadOnly
      ? `<p class="helper">Administrator view · request changes are available only to this shop’s owner.</p><strong>${html(requestStatusLabel(request.status))}</strong><p class="request-multiline">${html(request.merchantNote || "No internal note saved.")}</p>`
      : `<form id="requestUpdateForm" data-request-id="${html(request.id)}"><label class="field">Request status<select id="requestStatus" ${state.busy ? "disabled" : ""}>${requestTransitions(
          request.status,
        )
          .map(
            (status) =>
              `<option value="${status}" ${edit.status === status ? "selected" : ""}>${html(requestStatusLabel(status))}</option>`,
          )
          .join(
            "",
          )}</select></label><label class="field">Internal note<textarea id="requestMerchantNote" maxlength="1000" placeholder="Preparation details, pickup arrangement…" ${state.busy ? "disabled" : ""}>${html(edit.merchantNote)}</textarea><span class="helper">Private to the shop owner and platform administrator.</span></label>${edit.conflict ? '<div class="notice error">This request changed in another window. Your note is kept. Load the latest status, review it, then save again.<button class="plain-button" type="button" data-action="orders-review">Review latest request ↻</button></div>' : ""}<button class="button small" type="submit" ${state.busy || edit.conflict ? "disabled" : ""}>${state.busy ? "Saving request…" : "Save request changes"}</button><p class="helper">Fulfillment progress and payment status are tracked separately. Payments shown above are confirmed by Square.</p></form>`
  }<p class="helper">Last updated ${html(requestDate(request.updatedAt || request.createdAt))}</p></section></aside>`;
}
function renderOrders() {
  const state = ordersContext();
  const filterButtons = ["all", ...requestStatuses]
    .map(
      (status) =>
        `<button class="request-filter ${state.status === status ? "selected" : ""}" data-action="orders-filter" data-status="${status}" aria-pressed="${state.status === status}" ${state.loading ? "disabled" : ""}>${status === "all" ? "All requests" : requestStatusLabel(status)}<span>${state.counts[status] ?? "—"}</span></button>`,
    )
    .join("");
  shell(
    `<div class="requests-toolbar"><div><p class="helper">${adminReadOnly ? "Read-only merchant request history." : "Your saved request history remains available when your plan is inactive."} Payment status is separate from fulfillment progress.</p></div><button class="button secondary small" data-action="orders-refresh" ${state.loading ? "disabled" : ""}>${state.loading ? "Loading…" : "Refresh ↻"}</button></div><div class="request-filters" aria-label="Filter requests">${filterButtons}</div>${state.error ? `<div class="notice error" role="alert">${html(state.error)}</div>` : ""}${state.message ? `<div class="notice" role="status">${html(state.message)}</div>` : ""}<div class="requests-layout"><section class="surface requests-list" aria-busy="${state.loading}"><div class="section-heading"><div><p class="eyebrow">CUSTOMER REQUESTS</p><h2>The next little occasion.</h2></div><span class="pill">${state.rows.length} loaded</span></div>${!state.loaded && state.loading ? '<p class="subtle">Loading saved customer requests…</p>' : state.rows.length ? `<div class="request-list-items">${state.rows.map((request) => `<button class="request-list-item ${state.selectedId === request.id ? "selected" : ""}" data-action="orders-select" data-id="${html(request.id)}" aria-pressed="${state.selectedId === request.id}"><div><strong>${html(request.customer?.name || "Customer")}</strong><span>${html(request.summary || request.product?.title || "Custom bouquet")}</span><small>${html(requestDate(request.createdAt))}</small></div><div class="request-list-right"><span class="pill request-status-${html(request.status)}">${html(requestStatusLabel(request.status))}</span><strong>${html(requestMoney(request))}</strong><small>${html(request.checkout?.status || request.paymentStatus || "unpaid")}</small></div></button>`).join("")}</div>${state.nextCursor ? `<button class="button secondary small request-more" data-action="orders-more" ${state.loading ? "disabled" : ""}>Load more requests ↓</button>` : ""}` : `<div class="requests-empty"><span aria-hidden="true">✿</span><h3>${state.status === "all" ? "A little room for your first request." : "No " + html(requestStatusLabel(state.status).toLowerCase()) + " requests here."}</h3><p class="subtle">${state.status === "all" ? "When an eligible published shop receives a request, its customer details and saved design appear here." : "Try another status or refresh your list."}</p></div>`}</section>${requestDetailMarkup()}</div>`,
    "Every little request.<br><em>Thoughtfully looked after.</em>",
    "Saved customer details, exact bouquet contents and fulfillment progress.",
    "CUSTOMER REQUESTS",
  );
  if (!adminReadOnly)
    mountNotifications({
      container: main.querySelector(".dashboard-content"),
      shop,
      api,
      onOpen: selectRequest,
    });
  const target = new URLSearchParams(location.search).get("request");
  if (
    /^rq_[a-f0-9]{32}$/.test(target || "") &&
    state.linkedRequest !== target
  ) {
    state.linkedRequest = target;
    selectRequest(target);
  }
  if (!state.loaded && !state.loading) loadMerchantRequests();
}
async function loadMerchantRequests(more = false) {
  const state = ordersContext();
  if (state.loading || (more && !state.nextCursor)) return;
  state.loading = true;
  state.error = "";
  const params = new URLSearchParams({ status: state.status, limit: "25" });
  if (more) params.set("cursor", state.nextCursor);
  const path = requestsPath();
  if (isOrdersRoute()) renderOrders();
  try {
    const data = await api(path + "?" + params);
    if (state !== ordersState) return;
    const known = new Set(more ? state.rows.map((row) => row.id) : []);
    state.rows = more
      ? [
          ...state.rows,
          ...(data.requests || []).filter((row) => !known.has(row.id)),
        ]
      : data.requests || [];
    state.counts = data.counts || {};
    state.nextCursor = data.nextCursor || null;
    state.loaded = true;
  } catch (error) {
    if (state === ordersState) {
      state.error = errorText(error);
      state.loaded = true;
    }
  } finally {
    state.loading = false;
    if (state === ordersState && isOrdersRoute()) renderOrders();
  }
}
async function selectRequest(id, review = false) {
  const state = ordersContext(),
    path = requestsPath();
  if (!adminReadOnly) {
    const url = new URL(location.href);
    url.searchParams.set("request", id);
    history.replaceState(null, "", url.pathname + url.search);
    state.linkedRequest = id;
  }
  state.selectedId = id;
  state.detailLoading = true;
  state.error = "";
  state.message = "";
  renderOrders();
  try {
    const data = await api(path + "/" + encodeURIComponent(id));
    if (state !== ordersState || state.selectedId !== id) return;
    const previous = state.edits.get(id),
      request = data.request;
    state.detail = request;
    if (review && previous) {
      const statuses = requestTransitions(request.status);
      state.edits.set(id, {
        ...previous,
        version: request.version || 1,
        status: statuses.includes(previous.status)
          ? previous.status
          : request.status,
        conflict: false,
      });
      state.message =
        "The latest saved status is loaded. Your internal note is kept; review and save your changes again.";
    } else if (!previous?.dirty) state.edits.delete(id);
    else if (previous.version !== (request.version || 1))
      previous.conflict = true;
  } catch (error) {
    if (state === ordersState) state.error = errorText(error);
  } finally {
    if (state === ordersState && state.selectedId === id) {
      state.detailLoading = false;
      if (isOrdersRoute()) {
        renderOrders();
        if (matchMedia("(max-width:1150px)").matches)
          main
            .querySelector(".request-detail:not(.request-empty-detail)")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }
}
async function saveRequestChanges() {
  const state = ordersContext(),
    request = state.detail;
  if (!request || state.busy || adminReadOnly) return;
  const edit = requestEdit(request);
  if (edit.conflict) return;
  state.busy = true;
  state.error = "";
  state.message = "";
  const path = requestsPath(),
    body = {
      version: edit.version,
      status: edit.status,
      merchantNote: edit.merchantNote,
    };
  renderOrders();
  try {
    const data = await api(path + "/" + encodeURIComponent(request.id), {
      method: "PATCH",
      body,
    });
    if (state !== ordersState) return;
    state.detail = data.request;
    state.edits.delete(request.id);
    state.message = "Request changes saved. No payment was recorded.";
    state.rows = state.rows
      .map((row) => (row.id === request.id ? data.request : row))
      .filter((row) => state.status === "all" || row.status === state.status);
    state.loaded = false;
  } catch (error) {
    if (state === ordersState) {
      state.error = errorText(error);
      if (error.status === 409 || error.statusCode === 409)
        edit.conflict = true;
    }
  } finally {
    state.busy = false;
    if (state === ordersState && isOrdersRoute()) renderOrders();
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
function instagramContact(value) {
  const input = (value || "").trim();
  if (!input) return "";
  const match =
    input.match(/^@?([a-zA-Z0-9_.]{1,30})$/) ||
    input.match(
      /^https:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{1,30})\/?$/,
    );
  return match
    ? `<a href="https://www.instagram.com/${encodeURIComponent(match[1])}/" target="_blank" rel="noopener noreferrer">${html(input)}</a>`
    : `<span>${html(input)}</span>`;
}
function storefrontMarkup(editing = false, publicView = false) {
  const home = draft.home;
  const edit = (target) => editAttribute(target, editing);
  const ordersOpen = publicView && shop.features?.requestsEnabled === true;
  const ownerReview =
    !publicView && !adminReadOnly && user?.uid === shop.ownerUid;
  const cards = bouquetSlots(draft.collection).filter(
    (item) => item && (editing || item.available !== false),
  );
  const products = draft.products.filter(
    (item) => editing || item.available !== false,
  );
  const displayedSections = draft.home.sections.filter(
    (key) =>
      editing ||
      ((key !== "custom" || cards.length) &&
        (key !== "products" || products.length)),
  );
  const visibleSections = new Set(displayedSections);
  const builderVisible = visibleSections.has("builder");
  const navigationNames = {
    custom: home.navCustom || "Bouquets",
    products: home.navProducts || "Our shop",
    about: home.navAbout || "Our story",
    contact: home.navContact || "Say hello",
  };
  const sectionNavigation = displayedSections
    .filter((key) => navigationNames[key])
    .map((key) => `<a href="#${key}">${html(navigationNames[key])}</a>`)
    .join("");
  const heroTarget =
    home.heroButtonTarget !== "auto" &&
    visibleSections.has(home.heroButtonTarget)
      ? home.heroButtonTarget
      : ["custom", "products", "builder", "contact", "about"].find((key) =>
          visibleSections.has(key),
        );
  const heroLabels = {
    custom: "Explore the bouquets ↓",
    products: "Explore our shop ↓",
    contact: "Say hello ↓",
    about: "Our story ↓",
  };
  const builderIsPrimary =
    heroTarget === "builder" ||
    (builderVisible && home.heroButtonTarget === "auto");
  const heroPrimary = builderIsPrimary
    ? `<a class="button" href="${studioLink(null)}" data-studio ${presetReady() ? "" : 'aria-disabled="true"'}>${presetReady() ? html(home.builderButtonLabel || "Design your bouquet") : "Matching studio preparing"}</a>`
    : heroTarget
      ? `<a class="button" href="#${heroTarget}">${html(home.heroButtonLabel || heroLabels[heroTarget])}</a>`
      : "";
  const heroBuilder =
    builderVisible && heroTarget && heroTarget !== "builder"
      ? builderIsPrimary
        ? `<a class="plain-button" href="#${heroTarget}">${html(heroLabels[heroTarget] || "Explore the bouquets ↓")}</a>`
        : `<a class="plain-button" href="${studioLink(null)}" data-studio>${html(home.builderButtonLabel)}</a>`
      : "";

  const sections = {
    custom: `<section id="custom" class="flower-section"><div class="store-section-heading"><div><p class="eyebrow">A LITTLE IMAGINATION</p><h2 ${edit("section-custom")}>${html(home.customTitle)}</h2></div><p ${edit("section-custom")}>${html(home.customDescription)}</p></div>${cards.length ? `<div class="flower-grid">${cards.map((card) => `<article class="flower-card ${card.available === false ? "item-hidden" : ""}" data-bouquet-card="${html(card.id)}" ${edit("collection:" + card.id)}><div class="photo-wrap">${cover(card, "flower-photo")}<span class="photo-caption">${card.cover ? "Florist photo" : card.design ? "Starting recipe preview" : "Library recipe preview"}</span>${card.available === false ? '<span class="hidden-pill">Hidden</span>' : ""}</div><div class="flower-card-body"><span class="tiny-label">${html(card.category || "CUSTOMISABLE BOUQUET")}${draft.preset === "mixed" ? " · " + (cardFlowerType(card) === "satin" ? "SATIN" : "FRESH") : ""}</span><h3>${html(card.title)}</h3><p>${html(recipeFor(card)?.description || recipeFor(card)?.name || "Your florist’s saved bouquet design, ready for your personal touch.")}</p><div class="card-actions">${presetReady() ? `<button class="button small" data-action="collection-order" data-id="${html(card.id)}">Order ↗</button><a class="plain-button" href="${studioLink(card)}" data-studio>Customise ✳</a>` : '<button class="button small" disabled>Studio preparing</button>'}</div></div></article>`).join("")}</div>` : editing ? '<div class="empty-collection"><span>✿</span><p>Your signature bouquets belong here.</p><button class="button secondary small" data-action="inspect" data-target="add-card">Build a bouquet →</button></div>' : ""}</section>`,
    products: `<section id="products" class="flower-section fixed-section"><div class="store-section-heading"><div><p class="eyebrow">FROM OUR FLOWER SHOP</p><h2 ${edit("section-products")}>${html(home.productsTitle)}</h2></div><p ${edit("section-products")}>${html(home.productsDescription)}</p></div>${products.length ? `<div class="flower-grid">${products.map((item) => `<article class="flower-card ${item.available === false ? "item-hidden" : ""}" ${edit("products:" + item.id)}><div class="photo-wrap">${productCover(item, "flower-photo")}${item.available === false ? '<span class="hidden-pill">Hidden</span>' : ""}</div><div class="flower-card-body"><span class="tiny-label">${html(item.category || "FROM THE COLLECTION")}</span><h3>${html(item.title)}</h3><p>${html(item.description || "Thoughtfully made by your local florist.")}</p><div class="fixed-price">${formatMoney(item.priceCents)}</div>${ordersOpen && item.available !== false && item.priceCents !== null ? `<button class="button secondary small" data-action="product-request" data-id="${html(item.id)}">Order ↗</button>` : ownerReview && item.available !== false && Number.isSafeInteger(item.priceCents) ? `<button class="button secondary small" data-action="product-preview" data-id="${html(item.id)}">Preview order ↗</button>` : `<button class="button secondary small" disabled>${!ordersOpen ? "Preview only" : "Contact florist to order"}</button>`}</div></article>`).join("")}</div>` : editing ? '<div class="empty-collection"><span>❀</span><p>A photo, a name, a little something lovely.</p><button class="button secondary small" data-action="add-product">Add your first product +</button></div>' : ""}</section>`,
    builder: `<section id="builder" class="independent-builder"><div><p class="eyebrow">SOMETHING ENTIRELY YOURS</p><h2 ${edit("section-builder")}>${html(home.builderTitle)}</h2><p ${edit("section-builder")}>${html(home.builderDescription)}</p><a class="button" href="${studioLink(null)}" data-studio ${presetReady() ? "" : 'aria-disabled="true"'}>${presetReady() ? html(home.builderButtonLabel) : "Matching studio preparing"}</a><p class="helper">Choose flowers, wrapping and finishing touches. Review your design before ordering.</p></div><div class="builder-decoration" aria-hidden="true">${cards[0] ? cover(cards[0], "builder-photo") : "<span>✳</span><i>made by you</i>"}</div></section>`,
    about: `<section id="about" class="store-about" ${edit("about")}><p class="eyebrow">A NOTE FROM YOUR FLORIST</p><h2>${html(home.aboutTitle)}</h2><p>${html(draft.home.about || (editing ? "Tell your story here. A few warm words about your flowers, your craft and the people you make them for." : "Thoughtfully chosen flowers, made with care for your everyday joys and once-in-a-lifetime moments."))}</p><span class="about-signature">${html(draft.name)}</span></section>`,
    contact: `<section id="contact" class="store-contact" ${edit("contact")}><span aria-hidden="true">✳</span><div><p class="eyebrow">LET’S MAKE SOMETHING LOVELY</p><h2>${html(home.contactTitle)}</h2><div class="contact-details">${draft.city ? `<span>${html(draft.city)}</span>` : ""}${draft.phone ? `<a href="tel:${html(draft.phone.replace(/[^+\d]/g, ""))}">${html(draft.phone)}</a>` : ""}${instagramContact(draft.instagram)}${home.contactDetails ? `<p class="contact-extra">${html(home.contactDetails)}</p>` : ""}${!draft.phone && !draft.city && editing ? "<span>Add your contact details</span>" : ""}</div></div></section>`,
  };
  return `<div class="storefront floral-store hero-layout-${html(home.heroLayout)} ${home.motionEnabled && !editing && !adminReadOnly ? "store-motion" : ""} ${editing && editorMode && !adminReadOnly ? "is-editing" : ""}" style="--shop-primary:${html(draft.theme.primary)};--shop-background:${html(draft.theme.background)}">${home.announcementEnabled ? `<div class="store-announcement" ${edit("header")}>${html(home.announcementText || (draft.city ? draft.city + " · " : "") + (draft.preset === "satin" ? "Satin & eternal flowers" : "Thoughtful flowers. Beautiful moments."))}</div>` : ""}<header class="store-header"><div class="store-brand" ${edit("brand")}>${draft.logoMediaId ? `<img data-media-id="${html(draft.logoMediaId)}" alt="${html(draft.name)} logo">` : '<span aria-hidden="true">✳</span>'}${html(draft.name)}</div>${sectionNavigation ? `<nav aria-label="Shop sections">${sectionNavigation}</nav>` : ""}${builderVisible ? `<a class="store-builder-nav" href="${studioLink(null)}" data-studio ${presetReady() ? "" : 'aria-disabled="true"'}>${html(home.builderButtonLabel)} ↗</a>` : ""}</header><section class="floral-hero"><div class="hero-copy">${home.heroEyebrow ? `<p class="eyebrow" ${edit("hero-copy")}>${html(home.heroEyebrow)}</p>` : ""}<h1 ${edit("headline")}>${html(draft.home.headline)}</h1><p class="hero-description" ${edit("description")}>${html(draft.home.description)}</p>${heroPrimary || heroBuilder ? `<div class="actions">${heroPrimary}${heroBuilder}</div>` : ""}${home.heroNote ? `<div class="hero-footnote" ${edit("hero-copy")}><span>❀</span> ${html(home.heroNote)}</div>` : ""}</div><div class="hero-photo" ${edit("hero")}><img ${draft.home.heroMediaId ? `data-media-id="${html(draft.home.heroMediaId)}"` : 'src="/assets/studio-pink.webp"'} alt="${draft.home.heroMediaId ? html(draft.name) + " flowers" : "Floral inspiration: blush roses wrapped in ivory paper"}">${home.heroStamp ? `<div class="hero-stamp" ${edit("hero-copy")}>${html(home.heroStamp)}<span>✳</span></div>` : ""}${editing && editorMode ? '<span class="edit-photo-label">Change hero photo ↗</span>' : ""}</div></section>${home.ribbonEnabled && home.ribbonText ? `<div class="floral-ribbon" ${edit("footer")}><span class="ribbon-copy">${html(home.ribbonText)}</span></div>` : ""}${fulfillmentSummary(shop.checkoutSettings || shop.commerce, currency())}${displayedSections.map((key) => sections[key] || "").join("")}<footer class="store-bottom"><strong>${html(draft.name)}</strong><span ${edit("footer")}>${html(home.footerText)}</span><span>Made with Nebula ✳</span></footer></div>`;
}
function renderPreview() {
  document.body.classList.add("public-shop");
  const slug = decodeURIComponent(route().split("/")[2] || "");
  const owner =
    user?.emailVerified &&
    shop?.slug === slug &&
    !publicSnapshot &&
    new URLSearchParams(location.search).get("view") !== "live";
  if (!owner && (!publicSnapshot || publicSnapshot.slug !== slug))
    return renderLocked();
  if (!owner) {
    shop = publicSnapshot;
    draft = normalizeDraft(shop.draft);
  }
  document.title = `${draft.name} · ${draft.tagline || "Your flower shop"}`;
  main.innerHTML = `${owner ? `<div class="preview-banner"><span>✧ OWNER PREVIEW · Private draft · Requests closed here</span><a href="/dashboard/editor" data-nav>Edit my storefront ↗</a>${shop.published ? `<a href="${previewLink()}?view=live">Open customer shop ↗</a>` : '<a href="#ownerJourney">Next step ↓</a>'}<a href="/dashboard" data-nav>Dashboard ↗</a></div>` : ""}${storefrontMarkup(false, !owner)}`;
  hydrateMedia();
  if (owner && !adminReadOnly) {
    const slot = document.createElement("section");
    slot.id = "ownerJourney";
    slot.className = "owner-journey";
    slot.innerHTML =
      '<p class="helper" role="status">Preparing your next step…</p>';
    const hero = main.querySelector(".floral-hero");
    if (hero) hero.after(slot);
    else main.append(slot);
    const snapshot = shop;
    const ownerStudio =
      (!draft.collection.length && trialStudioLink()) || buildSlotLink();
    import("/owner-onboarding.js")
      .then(({ mountOwnerJourney, welcomeToShop }) => {
        if (!slot.isConnected || shop.id !== snapshot.id) return;
        mountOwnerJourney({
          slot,
          shop: snapshot,
          catalog,
          config,
          api,
          studioUrl: ownerStudio,
          onChange: (next) => {
            if (shop.id !== next.id) return;
            shop = next;
            draft = normalizeDraft(next.draft);
            version = next.version;
            dirty = conflict = false;
            render();
          },
        });
        const params = new URLSearchParams(location.search);
        if (params.get("welcome") === "1" && !draft.collection.length) {
          params.delete("welcome");
          history.replaceState(
            null,
            "",
            location.pathname + (params.size ? "?" + params : ""),
          );
          setTimeout(() => {
            if (
              slot.isConnected &&
              shop.id === snapshot.id &&
              !document.getElementById("ownerJourneyDialog")
            )
              welcomeToShop(snapshot, ownerStudio);
          }, 900);
        }
        const created = params.get("created");
        if (created) {
          const cards = main.querySelectorAll("#custom [data-bouquet-card]");
          const bouquet =
            created === "1"
              ? cards[0]
              : Array.from(cards).find(
                  (card) => card.dataset.bouquetCard === created,
                );
          if (bouquet) {
            bouquet.classList.add("bouquet-just-created");
            const feedback = document.createElement("div");
            feedback.className = "bouquet-saved-note";
            feedback.innerHTML =
              '<span role="status">Bouquet saved to your preview</span><a href="#ownerJourney">Next step ↑</a>';
            bouquet.prepend(feedback);
          }
          const destination = bouquet || slot;
          requestAnimationFrame(() => {
            if (destination.isConnected)
              destination.scrollIntoView({ block: "start" });
          });
          params.delete("created");
          history.replaceState(
            null,
            "",
            location.pathname + (params.size ? "?" + params : ""),
          );
        }
      })
      .catch((error) => {
        if (slot.isConnected)
          slot.textContent =
            "Your preview is saved. Reopen this page to load setup: " +
            error.message;
      });
  }
}
function renderEditor() {
  const readOnly = adminReadOnly;
  shell(
    `<div class="editor-toolbar"><div class="editor-status"><span class="status-dot"></span>${readOnly ? "Administrator · read-only preview" : "Your private storefront draft"}</div><div class="actions">${!readOnly ? `<button class="editor-toggle ${editorMode ? "selected" : ""}" data-action="toggle-edit" aria-pressed="${editorMode}">✎ Edit mode ${editorMode ? "on" : "off"}</button><button class="editor-toggle" data-action="inspect" data-target="sections">☷ Sections</button>` : ""}<button class="editor-toggle ${mobilePreview ? "selected" : ""}" data-action="toggle-mobile" aria-pressed="${mobilePreview}">${mobilePreview ? "▣ Desktop" : "▯ Mobile"}</button><a href="${readOnly ? "/admin" : previewLink()}" data-nav class="plain-button">${readOnly ? "Back to admin" : "Preview"} ↗</a></div></div><p class="editor-hint">${readOnly ? "Inspect this merchant’s saved content. Changes are disabled." : "Click a name, a photo or a product to change it. Your edits save automatically."}</p>${
      !readOnly
        ? `<nav class="editor-customization" aria-label="Customise your storefront">${[
            ["header", "Top bar & menu"],
            ["hero-copy", "Hero & buttons"],
            ["hero-look", "Photo & layout"],
            ["sections", "Sections & text"],
            ["contact", "Contact & hours"],
            ["footer", "Footer"],
            ["appearance", "Style & movement"],
          ]
            .map(
              ([target, label]) =>
                `<button class="button secondary small" data-action="inspect" data-target="${target}">${label}</button>`,
            )
            .join("")}</nav>`
        : ""
    }<details class="surface presentation-picker" ${readOnly ? "hidden" : ""}><summary>Choose your page style</summary>${readOnly ? "" : presentationControls(draft.home)}</details><div class="store-preview-frame ${mobilePreview ? "mobile-frame" : ""}" data-store-mount>${storefrontMarkup(!readOnly, false)}</div>${!readOnly ? inspectorMarkup() : ""}`,
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
  if (kind === "about") {
    title = "Your story";
    content = storefrontControls("section-about", draft.home, html);
  } else if (
    storefrontGroups[kind] &&
    !["hero-look", "contact", "appearance"].includes(kind)
  ) {
    title = storefrontGroups[kind][0];
    content = storefrontControls(kind, draft.home, html);
    if (kind === "hero-copy")
      content +=
        '<p class="helper">A hidden destination falls back to the first visible section. Button links always stay inside your shop.</p>';
  } else if (kind === "appearance") {
    title = "Style & movement";
    content = `${field("Signature colour", "theme.primary", { type: "color" })}${field("Page background", "theme.background", { type: "color" })}${storefrontControls("appearance", draft.home, html)}<p class="helper">Movement is always reduced for visitors who request reduced motion on their device.</p>`;
  } else if (kind === "headline" || kind === "description") {
    title = {
      headline: "Your welcome headline",
      description: "A little introduction",
      about: "Your flower story",
    }[kind];
    const key = kind === "about" ? "about" : kind;
    content = `<label class="field">${title}<textarea data-path="home.${key}" maxlength="${kind === "headline" ? 160 : 600}">${html(draft.home[key])}</textarea></label><p class="helper">Keep it warm, clear and true to your shop.</p>`;
  } else if (kind === "brand" || kind === "contact") {
    title = kind === "brand" ? "Your shop identity" : "Say a little hello";
    content =
      kind === "brand"
        ? `${field("Shop name", "name", { max: 80, required: true })}${uploadField("logo", null, 1, "Change logo")}<label class="field">Signature colour<input type="color" data-path="theme.primary" value="${html(draft.theme.primary)}"></label>`
        : `${field("City or neighbourhood", "city", { max: 80 })}${field("Phone or WhatsApp", "phone", { max: 40 })}${field("Instagram", "instagram", { max: 120 })}${localeFields(draft)}<label class="field">Requests without online payment<select data-path="requestChannel"><option value="whatsapp" ${draft.requestChannel !== "sms" && draft.requestChannel !== "both" ? "selected" : ""}>WhatsApp</option><option value="sms" ${draft.requestChannel === "sms" ? "selected" : ""}>SMS</option><option value="both" ${draft.requestChannel === "both" ? "selected" : ""}>WhatsApp + SMS</option></select><span class="helper">Uses your phone number above, including its country code. Customers review and send the message themselves.</span></label>${storefrontControls("contact", draft.home, html)}`;
  } else if (kind === "hero" || kind === "hero-look") {
    title = "Your first impression";
    content = `<div class="inspector-photo"><img ${draft.home.heroMediaId ? `data-media-id="${html(draft.home.heroMediaId)}"` : 'src="/assets/studio-pink.webp"'} alt="Hero image preview"></div>${storefrontControls("hero-look", draft.home, html)}${uploadField("hero", null, 18, "Choose hero photo")}<p class="helper">Landscape or portrait · resized to 250 KB. Our default photo is floral inspiration; replace it with your own work.</p>${draft.home.heroMediaId ? '<button class="plain-button" data-action="remove-hero">Use default inspiration photo</button>' : ""}`;
  } else if (item) {
    title =
      kind === "collection" ? "Customisable bouquet" : "Your fixed product";
    const index = (
      kind === "collection" ? draft.collection : draft.products
    ).indexOf(item);
    content = `${itemField("Name", kind, item, "title", "text", 80)}${kind === "products" ? itemField("Description", kind, item, "description", "textarea", 400) : recipeSelect(item)}${itemField("Category", kind, item, "category", "text", 40)}${kind === "products" ? itemField("Price · " + currency(), kind, item, "priceCents", "number") : ""}${availability(kind, item)}${uploadField(kind === "collection" ? "cover" : "product", item.id, index + (kind === "collection" ? 2 : 8))}<p class="helper">${kind === "collection" ? "Order opens checkout with your photo. Customise opens this recipe in the builder." : "Customers see your fixed price and product photo."}</p>${kind === "collection" && presetReady() ? `<a class="button secondary small" href="${studioLink(item)}" data-studio>Edit recipe in Builder ↗</a>` : ""}<button class="plain-button danger" data-action="${kind === "collection" ? "remove-card" : "remove-product"}" data-id="${html(item.id)}">Remove ${kind === "collection" ? "bouquet" : "product"}</button>`;
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
    content = `${presentationControls(draft.home)}<p class="subtle">Choose which sections appear, then arrange your page.</p><div class="section-sort">${order.map((key) => `<div><label class="toggle-line"><input type="checkbox" data-section="${key}" ${draft.home.sections.includes(key) ? "checked" : ""}>${names[key]}</label><button data-action="move-section" data-section="${key}" data-direction="-1" aria-label="Move ${names[key]} up">↑</button><button data-action="move-section" data-section="${key}" data-direction="1" aria-label="Move ${names[key]} down">↓</button></div>`).join("")}</div><div class="editor-customization">${[
      ["section-custom", "Bouquet section text"],
      ["section-products", "Product section text"],
      ["section-builder", "Builder section text"],
      ["section-about", "Your story"],
    ]
      .map(
        ([target, label]) =>
          `<button class="button secondary small" data-action="inspect" data-target="${target}">${label}</button>`,
      )
      .join(
        "",
      )}</div><a class="button secondary small" href="/dashboard/collection" data-nav>Manage bouquet recipes ↗</a><a class="button secondary small" href="/dashboard/products" data-nav>Manage fixed products ↗</a>`;
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
  if (operatorRoute()) {
    if (!sessionState.isAdmin) {
      main.innerHTML = `<section class="empty-screen"><p class="eyebrow">NEBULA ADMIN</p><h1>Administrator access required.</h1><p class="subtle">This account can manage its own flower shop. Customer subscriptions and platform controls are reserved for Nebula administrators.</p><a class="button" href="/dashboard" data-nav>Open my florist workspace ↗</a></section>`;
      return;
    }
    if (path === "/admin/login") history.replaceState(null, "", "/admin");
    const target = adminView();
    if (target && adminReadOnly)
      return target.view === "orders" ? renderOrders() : renderEditor();
    return renderAdmin();
  }
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
      if (
        isPaid() &&
        new URLSearchParams(location.search).get("setup") === "1"
      ) {
        history.replaceState(null, "", previewLink());
        return renderPreview();
      }
      return renderBilling();
    case "/dashboard/payments":
      return renderPayments();
    case "/dashboard/orders":
      return renderOrders();
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
async function reauthenticateAdministrator(password) {
  if (!sessionState.isAdmin || !auth.currentUser)
    throw Error("Sign in with your administrator account first.");
  const current = auth.currentUser;
  const google = (current.providerData || []).some(
    (p) => p.providerId === "google.com",
  );
  if (
    google ||
    !(current.providerData || []).some((p) => p.providerId === "password")
  ) {
    await authApi.reauthenticateWithPopup(
      current,
      new authApi.GoogleAuthProvider(),
    );
  } else {
    if (!password)
      throw Error("Enter your administrator password to verify this session.");
    await authApi.reauthenticateWithCredential(
      current,
      authApi.EmailAuthProvider.credential(current.email, password),
    );
  }
  await current.getIdToken(true);
}
function renderAdmin() {
  const rows = adminState.users;
  const reservations = adminState.reservations || [];
  const detail = adminState.detail;
  const actorUid = user?.uid;
  main.innerHTML = `<section class="admin-page"><div class="page-heading"><div><p class="eyebrow">NEBULA · PLATFORM OWNER</p><h1>Customers<br><em>& subscriptions.</em></h1><p class="subtle">Manage your florist customers, activation requests and subscription access. Each florist has a separate shop workspace.</p><span class="pill">${config.sandboxTestAccess ? "SANDBOX · TEST ACCESS ONLY" : "MAIN PLATFORM · VERIFIED PAYMENTS"}</span></div><a class="button secondary small" href="https://nebulastudio.site/admin.html" target="_blank" rel="noopener noreferrer">Legacy orders & leads ↗</a></div>${notice()}${adminState.feedback ? `<div class="notice admin-feedback" role="status"><strong>${html(adminState.feedback.message)}</strong><p>Shop: ${html(adminState.feedback.name)} · ${html(adminState.feedback.id)}</p></div>` : ""}<div class="admin-summary"><div class="surface"><span class="tiny-label">ACCOUNTS LOADED</span><strong>${rows.length}</strong></div><div class="surface"><span class="tiny-label">WITH A SHOP</span><strong>${rows.filter((row) => row.shopId || row.shop?.id).length}</strong></div><div class="surface"><span class="tiny-label">ACTIVE PLANS</span><strong>${rows.filter((row) => adminStatus(row) === "active").length}</strong></div><div class="surface"><span class="tiny-label">PUBLISHED</span><strong>${rows.filter((row) => row.publishedVersion || row.shop?.published).length}</strong></div></div><div class="admin-layout"><section class="surface"><form id="adminSearchForm" class="admin-search"><input id="adminSearch" type="search" value="${html(adminState.query)}" placeholder="Search email, shop or slug…" aria-label="Search accounts"><button class="button small" type="submit">Search</button><button class="button secondary small" type="button" data-action="admin-refresh" ${adminState.loading ? "disabled" : ""}>${adminState.loading ? "Refreshing…" : "Refresh list ↻"}</button></form><nav class="request-filters" aria-label="Filter florist customers">${[
    ["", "All accounts"],
    ["activation_requested", "Activation requests"],
    ["active", "Active"],
    ["suspended", "Suspended"],
  ]
    .map(
      ([value, label]) =>
        `<button class="button secondary small ${adminState.filter === value ? "selected" : ""}" data-action="admin-filter" data-status="${value}" aria-pressed="${(adminState.filter || "") === value}">${label}</button>`,
    )
    .join(
      "",
    )}</nav><p class="helper">Counts reflect the loaded page${adminState.query ? " and search" : ""}. Accounts without a shop are included.</p><div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>ACCOUNT / SHOP</th><th>SUBSCRIPTION</th><th>STATUS</th><th>LAST ACTIVITY</th><th></th></tr></thead><tbody>${
    rows
      .map((row) => {
        const id = row.shopId || row.shop?.id;
        return `<tr class="${id === adminState.selectionId ? "selected" : ""}"><td><strong>${html(row.name || row.shop?.draft?.name || "No shop yet")}</strong><span>${html(row.email || row.uid)}</span><small>${html(row.slug || row.shop?.slug || "Account created · shop not started")}</small></td><td><span class="pill ${adminStatus(row) === "active" ? "green" : ""}">${html(adminStatus(row))}</span></td><td>${html(row.status || (row.publishedVersion ? "published" : id ? "draft" : "no shop"))}</td><td>${adminDate(row.lastSeenAt || row.lastActiveAt || row.updatedAt)}</td><td>${id ? `<button class="plain-button" data-action="admin-select" data-id="${html(id)}" aria-pressed="${id === adminState.selectionId}">Manage access ↗</button>` : "—"}</td></tr>`;
      })
      .join("") ||
    (adminState.loading
      ? ""
      : '<tr><td colspan="5">No matching accounts.</td></tr>')
  }</tbody></table>${adminState.loading && !rows.length ? '<p class="subtle">Loading accounts…</p>' : ""}</div>${adminState.nextCursor ? '<button class="button secondary small" data-action="admin-more">Load more accounts ↓</button>' : ""}</section><aside class="surface admin-detail">${detail ? `<p class="eyebrow">MERCHANT DETAIL</p><h2>${html(detail.shop.draft?.name || detail.shop.slug)}</h2><p class="subtle">${html(detail.user?.email || detail.shop.ownerUid || "")}</p><dl><dt>Shop address</dt><dd><a href="${html(location.origin + "/s/" + encodeURIComponent(detail.shop.slug))}" target="_blank" rel="noopener noreferrer">${html(location.host + "/s/" + detail.shop.slug)}</a><small>${detail.shop.published ? "Published snapshot saved" : "Reserved · not published"}</small></dd><dt>Draft version</dt><dd>${html(detail.shop.version)}</dd><dt>Published version</dt><dd>${html(detail.shop.published?.version || "Not published")}</dd><dt>Subscription</dt><dd>${html(detail.shop.subscription?.status || (detail.shop.subscription?.active ? "active" : "inactive"))}</dd><dt>Customisable / fixed</dt><dd>${detail.shop.draft?.collection?.length || 0} / ${detail.shop.draft?.products?.length || 0}</dd><dt>Last updated</dt><dd>${adminDate(detail.shop.updatedAt)}</dd></dl><a class="button secondary small" href="/admin/shops/${encodeURIComponent(detail.shop.id)}/preview" data-admin-preview data-id="${html(detail.shop.id)}" data-view="draft">Preview private draft ↗</a>${detail.shop.published ? `<a class="button secondary small" href="/admin/shops/${encodeURIComponent(detail.shop.id)}/preview?view=live" data-admin-preview data-id="${html(detail.shop.id)}" data-view="live">Preview published version ↗</a>` : ""}<a class="button secondary small" href="/admin/shops/${encodeURIComponent(detail.shop.id)}/orders" data-admin-orders data-id="${html(detail.shop.id)}">View saved customer requests ↗</a><p class="helper">Storefront previews are read only. Access changes use the separate audited controls below.</p>` : `<span class="admin-flower">✳</span><h2>${adminState.detailLoading ? "Loading shop…" : "Choose a florist."}</h2><p class="subtle">${adminState.detailLoading ? "Loading this florist’s access settings and saved shop." : "Select Manage access to activate, extend or suspend a subscription and review the shop."}</p>`}</aside></div><details class="surface admin-reservations" ${reservations.length ? "open" : ""}><summary><strong>Pre-provisioned email reservations (${reservations.length})</strong> · Seed a shop before the owner signs in</summary><p class="helper">When the verified owner signs in with the reserved email, their pre-provisioned shop is claimed automatically.</p>${
    reservations.length
      ? `<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>RESERVED EMAIL</th><th>SHOP / SLUG</th><th>PRESET</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${reservations
          .map(
            (r) =>
              `<tr><td><strong>${html(r.email)}</strong><small>Created ${adminDate(r.createdAt)}</small></td><td><strong>${html(r.name)}</strong><small>/s/${html(r.slug)}</small></td><td>${html(r.preset)}</td><td><span class="pill ${r.status === "claimed" ? "green" : ""}">${html(r.conflictUid ? "conflict" : r.status)}</span>${r.claimedByUid ? `<small>Claimed by ${html(r.claimedByUid)}</small>` : r.conflictUid ? `<small>UID ${html(r.conflictUid)} already owns a shop</small>` : ""}</td><td><button class="plain-button" type="button" data-action="admin-select" data-id="${html(r.shopId)}">Manage access ↗</button>${r.status === "pending" ? ` · <button class="plain-button danger" type="button" data-action="admin-cancel-reservation" data-email="${html(r.email)}">Cancel</button>` : ""}</td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : '<p class="subtle">No pre-provisioned email reservations yet.</p>'
  }<form id="adminReserveForm" class="admin-reserve-form"><p class="tiny-label">CREATE OR IMPORT RESERVATION</p><div class="field-grid"><label class="field">Import seed bundle (.json)<input id="adminReserveSeedFile" type="file" accept="application/json,.json"><span class="helper">Optional: select a generated seed bundle (such as raysbouquetz) to populate draft & photos automatically.</span></label><label class="field">Owner email<input id="adminReserveEmail" type="email" placeholder="raysbouquetz@gmail.com"></label><label class="field">Shop name<input id="adminReserveName" type="text" maxlength="80" placeholder="raysbouquetz"></label><label class="field">Shop slug<input id="adminReserveSlug" type="text" maxlength="48" placeholder="raysbouquetz"></label><label class="field">Preset<select id="adminReservePreset"><option value="satin">Satin & eternal</option><option value="fresh">Fresh flowers</option></select></label></div><button class="button small" type="submit">Reserve & pre-provision shop</button></form></details></section>`;
  if (detail)
    mountActivationAdmin({
      shop: detail.shop,
      config,
      api,
      reauthenticate: reauthenticateAdministrator,
      reauthMethod:
        (user?.providerData || []).some((p) => p.providerId === "password") &&
        !(user?.providerData || []).some((p) => p.providerId === "google.com")
          ? "password"
          : "google",
      onChange: async (next, message) => {
        if (!sessionState.isAdmin || user?.uid !== actorUid) return;
        adminState.feedback = {
          id: next.id,
          name: next.draft.name,
          message: message || "Shop access updated successfully.",
        };
        if (adminState.detail?.shop.id === next.id)
          adminState.detail.shop = next;
        if (route() === "/admin") renderAdmin();
        await loadAdminUsers();
      },
    });
  if (!adminState.loaded && !adminState.loading) loadAdminUsers();
}
async function loadAdminUsers(more = false) {
  const state = adminState,
    generation = (state.generation || 0) + 1;
  state.generation = generation;
  state.loading = true;
  if (route() === "/admin") renderAdmin();
  try {
    const params = new URLSearchParams({ q: state.query });
    if (state.filter) params.set("status", state.filter);
    if (more && adminState.nextCursor)
      params.set("cursor", adminState.nextCursor);
    const [data, resData] = await Promise.all([
      api("/api/admin/users?" + params),
      more
        ? Promise.resolve(null)
        : api("/api/admin/reservations").catch(() => ({ reservations: [] })),
    ]);
    if (state !== adminState || state.generation !== generation) return;
    pageMessage = "";
    adminState.users = more ? [...adminState.users, ...data.users] : data.users;
    if (resData?.reservations) adminState.reservations = resData.reservations;
    adminState.nextCursor = data.nextCursor || null;
    adminState.loaded = true;
  } catch (error) {
    if (state === adminState && state.generation === generation) {
      pageMessage = errorText(error);
      adminState.loaded = true;
    }
  } finally {
    if (state === adminState && state.generation === generation) {
      state.loading = false;
      if (route() === "/admin") renderAdmin();
    }
  }
}
async function preserveDraftBeforeAdminPreview() {
  if (adminReadOnly || !shop || !draft) return;
  if (ordersState.busy || hasRequestEdits())
    throw Error(
      "Save your request changes before opening another shop. Your internal notes have been kept.",
    );
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
    canonicalAdminBookmark();
    const params = new URLSearchParams(location.search);
    const target = adminView();
    if (target && sessionState.isAdmin)
      await loadAdminPreview(target.id, params.get("view") || "draft");
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
    if (operatorRoute()) history.replaceState(null, "", "/admin");
    render();
  }
}
async function loadSession() {
  const [session] = await Promise.all([
    api("/api/session"),
    catalog ? Promise.resolve() : loadCatalog(),
  ]);
  sessionState = session;
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
async function addCard(recipeId) {
  if (draft.collection.length >= 6) return;
  const collectionDraft = draft;
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
  if (!draft.home.sections.includes("custom"))
    draft.home.sections.unshift("custom");
  const used = new Set((recipe.design?.items || []).map((item) => item.id));
  try {
    const { validateDesign } = await import("/policy.mjs");
    if (draft !== collectionDraft || !draft.collection.includes(item)) return;
    const result = validateDesign(
      recipe.design,
      { ...draft, disabledFlowers: [], disabledExtras: [] },
      catalog,
      { allowUnpriced: true },
    );
    const extras = new Set(
      (result.pricing?.extraLines || []).map((line) => line.id),
    );
    draft.disabledExtras = draft.disabledExtras.filter((id) => !extras.has(id));
  } catch {
    if (draft !== collectionDraft || !draft.collection.includes(item)) return;
    pageMessage =
      "The bouquet was added. Review flower and extra availability before publishing.";
  }
  draft.disabledFlowers = draft.disabledFlowers.filter((id) => !used.has(id));
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
    if (Number.isSafeInteger(draft.flowerPrices[item.id]))
      draft.disabledFlowers = draft.disabledFlowers.filter(
        (id) => id !== item.id,
      );
  }
  for (const item of matchingExtras()) {
    if (
      draft.extrasCents[item.id] == null &&
      Number.isSafeInteger(item.priceCents)
    )
      draft.extrasCents[item.id] = item.priceCents;
    if (Number.isSafeInteger(draft.extrasCents[item.id]))
      draft.disabledExtras = draft.disabledExtras.filter(
        (id) => id !== item.id,
      );
  }
  changed();
  if (await saveDraft(false)) {
    pageMessage =
      "Sample prices saved for design previews. Review them before approving online checkout.";
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
    await navigate(previewLink() + "?welcome=1");
    announce(
      "Your shop preview is ready. Build your first bouquet when you want.",
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
  const adminOrders = event.target.closest("[data-admin-orders]");
  if (adminOrders) {
    event.preventDefault();
    await authTask(adminOrders, async () => {
      await loadAdminPreview(adminOrders.dataset.id);
      history.pushState(null, "", adminOrders.getAttribute("href"));
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
    if (link.closest(".setup-next")) {
      if (saving || uploadJobs.size)
        return showMessage(
          "Your changes are still saving. Please try Continue in a moment.",
          true,
        );
      if (dirty && !(await saveDraft(false))) return;
    }
    const commercePanel = main.querySelector(".commerce-panel");
    if (commercePanel?.saveIfNeeded && !(await commercePanel.saveIfNeeded()))
      return;
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
    ![
      "toggle-mobile",
      "close-inspector",
      "signout",
      "orders-filter",
      "orders-select",
      "orders-more",
      "orders-refresh",
      "orders-close",
      "orders-download",
    ].includes(action) &&
    !action.startsWith("admin-")
  )
    return;
  if (action === "shop-presentation") {
    if (adminReadOnly) return;
    draft = applyPresentation(draft, button.dataset.style);
    changed();
    pageMessage =
      "Page style updated in your draft. Preview it, then save and publish when ready. Your saved products are kept.";
    render();
    return;
  }
  if (action === "toggle-edit") {
    editorMode = !editorMode;
    inspector = null;
    renderEditor();
  } else if (action === "toggle-mobile") {
    mobilePreview = !mobilePreview;
    renderEditor();
  } else if (action === "inspect") {
    if (button.dataset.target === "add-card") {
      await navigate("/dashboard/collection");
      return;
    }
    inspector = button.dataset.target;
    renderEditor();
  } else if (action === "close-inspector") {
    inspector = null;
    renderEditor();
  } else if (action === "finish-bouquet") {
    if (saving || uploadJobs.size)
      return showMessage("Wait for your changes to finish saving.");
    if (dirty && !(await saveDraft(false))) return;
    button.disabled = true;
    try {
      const { finishBouquet } = await import("/owner-onboarding.js");
      const completed = await finishBouquet({
        shop,
        cardId: button.dataset.id,
        catalog,
        api,
      });
      if (completed) {
        shop = completed;
        draft = normalizeDraft(completed.draft);
        version = completed.version;
        dirty = conflict = false;
        await navigate(
          previewLink() + "?created=" + encodeURIComponent(button.dataset.id),
        );
      }
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
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
    if (!draft.home.sections.includes("products"))
      draft.home.sections.unshift("products");
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
  } else if (action === "billing-checkout" || action === "billing-portal")
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
  else if (
    [
      "square-connect",
      "square-refresh",
      "square-disconnect",
      "square-location",
    ].includes(action)
  )
    await authTask(button, async () => {
      if (dirty && !(await saveDraft(true))) return;
      if (action === "square-refresh") {
        if (squareState.data?.canManage && squareState.data?.merchantId)
          await api(
            "/api/shops/" + encodeURIComponent(shop.id) + "/square/verify",
            { method: "POST", body: {} },
          );
        squareState.loaded = false;
        await loadSquareStatus();
        return;
      }
      if (
        action === "square-disconnect" &&
        !confirm(
          "Disconnect this Square authorization? Existing unpaid requests and saved shop designs stay available.",
        )
      )
        return;
      const operation =
        action === "square-connect"
          ? "connect"
          : action === "square-disconnect"
            ? "disconnect"
            : "location";
      try {
        const result = await api(
          "/api/shops/" + encodeURIComponent(shop.id) + "/square/" + operation,
          {
            method: "POST",
            body:
              operation === "location"
                ? { locationId: $("squareLocation").value }
                : {},
          },
        );
        if (operation === "connect") {
          const url = new URL(result.authorizationUrl);
          if (
            url.origin !==
              (config.squareEnvironment === "production"
                ? "https://connect.squareup.com"
                : "https://app.squareupsandbox.com") ||
            url.searchParams.get("session") !==
              (config.squareEnvironment === "production" ? "false" : "true") ||
            url.pathname !== "/oauth2/authorize" ||
            url.username ||
            url.password ||
            url.hash
          )
            throw Error("Square returned an invalid authorization link.");
          location.assign(url.href);
          return;
        }
        squareState.data = result;
        squareState.loaded = true;
        renderPayments();
      } catch (error) {
        squareState.loaded = false;
        await loadSquareStatus();
        throw error;
      }
    });
  else if (action === "sandbox-test-catalog") {
    if (!config.sandboxTestAccess) return;
    if (
      !confirm(
        "Prepare this Sandbox catalogue with sample prices for testing only? Missing catalogue prices use available samples; other unpriced items and incomplete bouquets are hidden. Your existing prices and saved designs are kept. Nothing is published or charged.",
      )
    )
      return;
    await authTask(button, async () => {
      const { prepareTestCatalog } = await import("/test-catalog.mjs");
      const result = prepareTestCatalog(draft, catalog);
      draft = result.draft;
      changed();
      if (await saveDraft(false)) {
        pageMessage = `Test catalogue saved: ${result.samplePrices} sample prices filled, ${result.hidden} incomplete items hidden. Review and publish when ready. Checkout rules still need your approval.`;
        await loadPublicationReadiness();
      }
    });
  } else if (action === "disable-unpriced") {
    for (const item of matchingFlowers())
      if (
        !Number.isSafeInteger(draft.flowerPrices[item.id]) &&
        !draft.disabledFlowers.includes(item.id)
      )
        draft.disabledFlowers.push(item.id);
    for (const item of matchingExtras())
      if (
        !Number.isSafeInteger(draft.extrasCents[item.id]) &&
        !draft.disabledExtras.includes(item.id)
      )
        draft.disabledExtras.push(item.id);
    changed();
    renderPrices();
    showMessage(
      "Unpriced catalogue items are now turned off. Your saved prices and bouquet artwork have been kept; turn any item back on when its price is ready.",
    );
  } else if (action === "copy-shop-link") {
    const field = $("shopAddress");
    try {
      await navigator.clipboard.writeText(field.value);
      $("shopLinkStatus").textContent = isPublished()
        ? "Shop link copied."
        : "Reserved link copied. Publish before sharing it with customers.";
    } catch {
      field.focus();
      field.select();
      $("shopLinkStatus").textContent = "Select and copy this address.";
    }
  } else if (action === "review-publication") {
    if (dirty && !(await saveDraft(true))) return;
    publicationState.report = null;
    publicationState.error = "";
    await loadPublicationReadiness();
    main
      .querySelector(".publication-checklist")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (action === "publish-shop")
    await authTask(button, async () => {
      if (dirty && !(await saveDraft(true))) return;
      const data = await api(
        "/api/shops/" + encodeURIComponent(shop.id) + "/publish",
        { method: "POST", body: { version } },
      );
      shop = data.shop;
      draft = normalizeDraft(shop.draft);
      version = shop.version;
      pageMessage = "Your shop is live. Share your public link with customers.";
      renderBilling();
      main.querySelector(".shop-address")?.scrollIntoView({ block: "start" });
      document.getElementById("shopAddress")?.focus({ preventScroll: true });
    });
  else if (action === "collection-order") {
    const card = draft.collection.find((item) => item.id === button.dataset.id);
    if (!card || card.available === false) return;
    button.disabled = true;
    try {
      await openOrderRequest({
        shop: { ...shop, draft },
        kind: "design",
        cardId: card.id,
        design: clone(card.design || recipeFor(card)?.design),
        asListed: true,
        preview: !publicSnapshot,
      });
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      button.disabled = false;
    }
  } else if (action === "product-request") {
    if (!publicSnapshot) return;
    await openOrderRequest({
      shop,
      kind: "product",
      productId: button.dataset.id,
    });
  } else if (action === "product-preview") {
    if (publicSnapshot || adminReadOnly || user?.uid !== shop.ownerUid) return;
    await openOrderRequest({
      shop: { ...shop, draft },
      kind: "product",
      productId: button.dataset.id,
      preview: true,
    });
  } else if (action === "refresh-readiness") {
    publicationState.report = null;
    publicationState.error = "";
    await loadPublicationReadiness();
  } else if (action === "orders-filter") {
    const state = ordersContext();
    if (
      state.loading ||
      !["all", ...requestStatuses].includes(button.dataset.status)
    )
      return;
    state.status = button.dataset.status;
    state.rows = [];
    state.nextCursor = null;
    state.loaded = false;
    await loadMerchantRequests();
  } else if (action === "orders-select") await selectRequest(button.dataset.id);
  else if (action === "orders-more") await loadMerchantRequests(true);
  else if (action === "orders-refresh") await loadMerchantRequests();
  else if (action === "orders-review" && ordersState.selectedId)
    await selectRequest(ordersState.selectedId, true);
  else if (action === "orders-close") {
    ordersState.selectedId = null;
    ordersState.detail = null;
    ordersState.detailLoading = false;
    renderOrders();
  } else if (
    action === "orders-download" &&
    ordersState.detail?.id === button.dataset.id
  ) {
    const request = ordersState.detail;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              requestId: request.id,
              currency: request.currency,
              design: request.design,
              pricing: request.pricing,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = request.id + "-bouquet.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (action === "admin-more") await loadAdminUsers(true);
  else if (action === "admin-refresh") await loadAdminUsers();
  else if (action === "admin-filter") {
    const status = button.dataset.status;
    if (!["", "activation_requested", "active", "suspended"].includes(status))
      return;
    adminState.filter = status;
    adminState.nextCursor = null;
    renderAdmin();
    await loadAdminUsers();
  } else if (action === "admin-select")
    await authTask(button, async () => {
      const id = button.dataset.id;
      const state = adminState;
      state.selectionId = id;
      state.detail = null;
      state.detailLoading = true;
      renderAdmin();
      try {
        const result = await api("/api/admin/shops/" + encodeURIComponent(id));
        if (state === adminState && state.selectionId === id)
          state.detail = result;
      } finally {
        if (state === adminState && state.selectionId === id) {
          state.detailLoading = false;
          if (route() === "/admin") {
            renderAdmin();
            main
              .querySelector(".admin-detail")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    });
  else if (action === "admin-cancel-reservation")
    await authTask(button, async () => {
      const email = button.dataset.email;
      if (
        !email ||
        !confirm(`Cancel the pending reservation for ${email}?`)
      )
        return;
      try {
        await api("/api/admin/reservations/cancel", {
          method: "POST",
          body: { email },
        });
      } catch (error) {
        if (error.status === 401) {
          await reauthenticateAdministrator();
          await api("/api/admin/reservations/cancel", {
            method: "POST",
            body: { email },
          });
        } else throw error;
      }
      adminState.feedback = {
        id: email,
        name: email,
        message: "Pending reservation cancelled.",
      };
      await loadAdminUsers();
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
        (dirty || hasRequestEdits()) &&
        !confirm(
          "You have unsaved shop or request changes. Sign out and leave these edits?",
        )
      )
        return;
      clearTimeout(saveTimer);
      await authApi.signOut(auth);
      user = shop = draft = catalog = null;
      clearActivationPanels();
      adminReadOnly = false;
      publicSnapshot = null;
      sessionState = {};
      adminState = {
        users: [],
        nextCursor: null,
        query: "",
        detail: null,
        loading: false,
      };
      afterLogin = operatorRoute() ? "/admin" : "/dashboard";
      ordersState = emptyOrdersState();
      publicationState = {
        shopId: null,
        version: null,
        report: null,
        error: "",
        loading: false,
      };
      dirty = conflict = false;
      pageMessage = "";
      for (const value of mediaCache.values())
        value.then((url) => URL.revokeObjectURL(url)).catch(() => {});
      mediaCache.clear();
      await navigate(operatorRoute() ? "/admin/login" : "/login", true);
    });
  else if (action === "send-verification")
    await authTask(button, async () => {
      await sendVerification();
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
  if (event.target.id === "requestUpdateForm") {
    event.preventDefault();
    if (!adminReadOnly) await saveRequestChanges();
    return;
  }
  if (event.target.id === "adminSearchForm") {
    event.preventDefault();
    adminState.query = $("adminSearch").value.trim();
    adminState.nextCursor = null;
    await loadAdminUsers();
    return;
  }
  if (event.target.id === "adminReserveForm") {
    event.preventDefault();
    await authTask(event.submitter, async () => {
      const file = $("adminReserveSeedFile")?.files?.[0];
      let payload;
      if (file) {
        const parsed = JSON.parse(await file.text());
        payload = {
          operationId: parsed.operationId || crypto.randomUUID(),
          email: ($("adminReserveEmail")?.value.trim() || parsed.email || ""),
          input: parsed.input,
          ...(parsed.draft ? { draft: parsed.draft } : {}),
          ...(parsed.media ? { media: parsed.media } : {}),
        };
      } else {
        const email = $("adminReserveEmail")?.value.trim() || "";
        const name = $("adminReserveName")?.value.trim() || "";
        const slug = $("adminReserveSlug")?.value.trim() || "";
        const preset = $("adminReservePreset")?.value || "satin";
        payload = {
          operationId: crypto.randomUUID(),
          email,
          input: {
            name,
            slug,
            preset,
            currency: "CAD",
            country: "CA",
            timeZone: "America/Winnipeg",
          },
        };
      }
      let result;
      try {
        result = await api("/api/admin/reservations", {
          method: "POST",
          body: payload,
        });
      } catch (error) {
        if (error.status === 401) {
          await reauthenticateAdministrator();
          result = await api("/api/admin/reservations", {
            method: "POST",
            body: payload,
          });
        } else throw error;
      }
      adminState.feedback = {
        id: result.shop.id,
        name: result.shop.draft?.name || result.reservation.name,
        message: `Pre-provisioned shop reserved for ${result.reservation.email}.`,
      };
      adminState.selectionId = result.shop.id;
      await loadAdminUsers();
    });
    return;
  }
  if (event.target.id === "authForm") {
    event.preventDefault();
    await authTask(event.submitter, async () => {
      const email = $("email").value.trim(),
        password = $("password").value;
      if (loginMode === "signup") {
        await ensureHuman(config);
        const result = await authApi.createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        user = result.user;
        try {
          await sendVerification();
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
    await createShop(event.submitter);
  }
});
document.addEventListener("input", (event) => {
  const input = event.target;
  if (["requestStatus", "requestMerchantNote"].includes(input.id)) {
    if (adminReadOnly || !ordersState.detail) return;
    const edit = requestEdit(ordersState.detail);
    if (input.id === "requestStatus") edit.status = input.value;
    else edit.merchantNote = input.value;
    edit.dirty =
      edit.status !== ordersState.detail.status ||
      edit.merchantNote !== (ordersState.detail.merchantNote || "");
    return;
  }
  if (input.id === "flowerSearch" || input.id === "flowerTypeFilter") {
    const query = $("flowerSearch").value.trim().toLowerCase();
    const type = $("flowerTypeFilter")?.value || "";
    let shown = 0;
    document.querySelectorAll("[data-price-row]").forEach((row) => {
      row.hidden =
        !row.dataset.search.includes(query) ||
        !!(
          type &&
          row.dataset.collection !== "shared" &&
          row.dataset.collection !== type
        );
      if (!row.hidden) shown++;
    });
    document.querySelectorAll("[data-price-group]").forEach((group) => {
      group.hidden = ![...group.querySelectorAll("[data-price-row]")].some(
        (row) => !row.hidden,
      );
    });
    $("noFlowers").hidden = shown > 0;
    return;
  }
  if (input.dataset.wizard) {
    if (input.type === "radio" && !input.checked) return;
    wizard[input.dataset.wizard] = input.value;
    if (input.dataset.wizard === "country") {
      const suggestion = {
        CA: ["CAD", "America/Toronto"],
        US: ["USD", "America/New_York"],
        GB: ["GBP", "Europe/London"],
        AU: ["AUD", "Australia/Sydney"],
        FR: ["EUR", "Europe/Paris"],
        IE: ["EUR", "Europe/Dublin"],
        ES: ["EUR", "Europe/Madrid"],
      }[input.value];
      if (suggestion) {
        [wizard.currency, wizard.timeZone] = suggestion;
        main.querySelector('[data-wizard="currency"]').value = wizard.currency;
        main.querySelector('[data-wizard="timeZone"]').value = wizard.timeZone;
      }
    }
    if (input.id === "shopSlug") slugEdited = true;
    if (input.id === "shopName" && !slugEdited) {
      wizard.slug = input.value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      if (input.value.trim() && wizard.slug.length < 3)
        wizard.slug = (wizard.slug || "shop") + "-" + suggestedSlugSuffix;
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
  if (input.hasAttribute("data-open-builder")) {
    draft.home.sections = draft.home.sections.filter(
      (key) => key !== "builder",
    );
    if (input.checked) draft.home.sections.push("builder");
    changed();
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
    parent[keys.at(-1)] =
      input.type === "checkbox" ? input.checked : input.value;
    if (keys[0] === "theme") {
      const label = document.querySelector(`[data-colour-label="${keys[1]}"]`);
      if (label) label.textContent = input.value.toUpperCase();
    }
    changed();
    if (input.dataset.path === "currency") {
      if (route() === "/dashboard/payments") renderPayments();
      else if (route() === "/dashboard/shop") renderBrand();
      return;
    }
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
document.addEventListener("change", async (event) => {
  if (adminReadOnly) return;
  if (event.target.id === "workspacePage") {
    const panel = main.querySelector(".commerce-panel");
    if (panel?.saveIfNeeded && !(await panel.saveIfNeeded())) {
      event.target.value = activeNavigation(route());
      return;
    }
    navigate(event.target.value).catch((error) =>
      showMessage(error.message, true),
    );
    return;
  }
  if (event.target.matches("input[data-upload]")) uploadMedia(event.target);
  if (event.target.matches("[data-preset]")) {
    const next = event.target.value;
    if (next === draft.preset) return;
    if (next === "mixed") {
      draft.preset = next;
      for (const row of catalog.flowers)
        if (
          !(row.id in draft.flowerPrices) &&
          !draft.disabledFlowers.includes(row.id)
        )
          draft.disabledFlowers.push(row.id);
      for (const row of catalog.extras)
        if (
          !(row.id in draft.extrasCents) &&
          !draft.disabledExtras.includes(row.id)
        )
          draft.disabledExtras.push(row.id);
      changed();
      render();
      return;
    }
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
  if (
    main.querySelector(".commerce-panel")?.hasUnsaved?.() ||
    dirty ||
    saving ||
    uploadJobs.size ||
    ordersState.busy ||
    hasRequestEdits()
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});

async function start() {
  canonicalAdminBookmark();
  const path = route(),
    publicRoute = path.startsWith("/s/");
  if (publicRoute) {
    main.innerHTML =
      '<section class="empty-screen" role="status" aria-busy="true"><p class="eyebrow">YOUR FLOWER SHOP</p><h1>Opening the shop...</h1></section>';
    try {
      await Promise.all([loadCatalog(), loadPublicShop()]);
      if (publicSnapshot) renderPreview();
      else renderLocked();
    } catch {
      renderLocked();
    }
  }
  try {
    ({ auth, authApi, config } = await initialize());
    user = await getUser();
    const displayedPublic = publicSnapshot;
    if (user?.emailVerified) {
      await loadSession();
      if (publicRoute) {
        if (
          shop?.slug === decodeURIComponent(path.split("/")[2] || "") &&
          new URLSearchParams(location.search).get("view") !== "live"
        )
          publicSnapshot = null;
        else publicSnapshot = displayedPublic;
      }
      const params = new URLSearchParams(location.search),
        target = adminView();
      if (target && sessionState.isAdmin)
        await loadAdminPreview(target.id, params.get("view") || "draft");
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
let checkingVerification = false;
document.addEventListener("visibilitychange", async () => {
  if (
    document.visibilityState !== "visible" ||
    !user ||
    user.emailVerified ||
    checkingVerification ||
    !document.querySelector('[data-action="check-verification"]')
  )
    return;
  checkingVerification = true;
  try {
    user = await refreshUser();
    if (user?.emailVerified) await signedIn();
  } catch {
    // Manual recheck remains available after a transient connection failure.
  } finally {
    checkingVerification = false;
  }
});
start();
