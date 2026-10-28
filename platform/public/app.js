import { initialize, getUser, refreshUser, token, api } from "/session.js";

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
      /^(\/studio\/|\/s\/|\/dashboard(?:\/|$))/.test(url.pathname)
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
  ["/dashboard/shop", "Shop & brand", "✳"],
  ["/dashboard/prices", "Flowers & prices", "❀"],
  ["/dashboard/collection", "Your collection", "▦"],
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
    card: card.id,
    ...(order ? { action: "order" } : {}),
  });
const previewLink = () => "/s/" + encodeURIComponent(shop.slug);
const recipeFor = (card) =>
  catalog?.recipes.find((recipe) => recipe.id === card.recipeId);
const matchingRecipes = () =>
  (catalog?.recipes || []).filter(
    (recipe) => recipe.preset === (draft?.preset || wizard.preset),
  );
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
    ? `<span class="account-email">${html(user.email)}</span><button class="plain-button" data-action="signout">Sign out</button>`
    : `<a class="plain-button" href="/login" data-nav>Sign in <span aria-hidden="true">↗</span></a>`;
}
async function navigate(path, replace = false) {
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
  if (
    draft.preset === "fresh" &&
    ["/dashboard/prices", "/dashboard/collection"].includes(current)
  ) {
    const incomplete =
      catalog.flowers.some(
        (item) =>
          !draft.disabledFlowers.includes(item.id) &&
          draft.flowerPrices[item.id] == null,
      ) || catalog.extras.some((item) => draft.extrasCents[item.id] == null);
    if (incomplete)
      content =
        `<section class="surface"><h2>Try your bouquet preview.</h2><p class="subtle">Enter your own prices, or load sample amounts to explore the studio first. Existing prices stay as you set them. Samples need your review before any future launch.</p><button class="button secondary small" data-action="sample-prices">Use sample prices for preview</button></section>` +
        content;
  }
  main.innerHTML = `<div class="workspace"><aside class="sidebar"><div class="shop-mini"><div class="shop-monogram">${html((draft.name || "N").slice(0, 1))}</div><div><strong>${html(draft.name)}</strong><small>Private draft</small></div></div><nav class="sidebar-nav" aria-label="Shop settings">${tabs.map(([path, name, icon]) => `<a href="${path}" data-nav class="${current === path ? "active" : ""}" ${current === path ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span>${name}</a>`).join("")}</nav><div class="sidebar-bottom"><strong>A little space to begin.</strong><p>Your draft is private. Billing and customer orders are not active.</p></div></aside><section class="dashboard-content"><div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${heading}</h1><p class="subtle">${description}</p></div>${saveControls()}</div>${notice()}${content}</section></div>`;
  hydrateMedia();
}
function renderLogin() {
  const signup = loginMode === "signup";
  main.innerHTML = `<div class="login-layout"><section class="login-story"><p class="eyebrow">A LITTLE SPACE FOR YOUR FLOWER SHOP</p><h1>Your flowers.<br>Your name.<br><em>A beautiful beginning.</em></h1><p class="subtle">Bring your collection together, make it feel like you, and explore your very own bouquet studio.</p><div class="story-image"><img src="/assets/studio-pink.webp" alt="Soft pink roses and delicate white flowers, wrapped in ivory paper" width="928" height="1152"></div><div class="story-caption"><span>YOUR CRAFT. THEIR IMAGINATION.</span><span>✳</span></div></section><section class="auth-card"><p class="eyebrow">${signup ? "LET’S GET ACQUAINTED" : "WELCOME TO YOUR STUDIO"}</p><h2>${signup ? "Something lovely starts here." : "A little more you."}</h2><p class="subtle">${signup ? "Create your account for the invited-owner beta." : "Sign in to pick up where your flowers left off."}</p><div id="authMessage" class="notice" role="status" hidden></div><button class="google-button" data-action="google"><span class="google-icon" aria-hidden="true">G</span>Continue with Google</button><div class="divider">or use your email</div><form id="authForm"><label class="field">Email address<input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@yourflowershop.com" required></label><label class="field"><span class="password-heading">Password${signup ? "" : '<button class="plain-button" type="button" data-action="reset">Forgot password?</button>'}</span><input id="password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" ${signup ? 'minlength="10"' : ""} required placeholder="${signup ? "At least 10 characters" : "Your password"}"></label><button type="submit" class="button">${signup ? "Create my account" : "Step into my studio"}<span aria-hidden="true">↗</span></button></form><p class="auth-bottom">${signup ? "Already have an account?" : "New around here?"} <button class="plain-button" data-action="auth-mode">${signup ? "Sign in" : "Create an account"}</button></p><p class="beta-note">Private beta · Shop access is currently limited to invited test accounts. Creating an account does not activate a subscription or customer orders.</p></section></div>`;
}
function renderVerification() {
  main.innerHTML = `<section class="setup-form"><div class="auth-card"><div class="verification-icon" aria-hidden="true">✉</div><p class="eyebrow">ONE LITTLE STEP FIRST</p><h1>Check your inbox.</h1><p class="subtle">Verify <strong>${html(user.email)}</strong> before opening your shop. Follow the link in your verification email, then come back here.</p><div id="authMessage" class="notice" role="status" hidden></div><div class="actions"><button class="button" data-action="check-verification">I’ve verified my email <span aria-hidden="true">↗</span></button><button class="button secondary" data-action="send-verification">Send verification email</button></div><p class="helper">Email is sent only when you request it. Check your spam folder if it hasn’t arrived.</p></div></section>`;
}
function renderRestricted(message) {
  main.innerHTML = `<section class="empty-screen"><div class="lock-icon" aria-hidden="true">✧</div><p class="eyebrow">A SMALL, PRIVATE BETA</p><h1>Your invitation<br>comes <em>first.</em></h1><p class="subtle" style="max-width:430px">${html(message)}</p><p class="helper">Signed in as ${html(user?.email || "your account")}. Shop access is limited to the invited beta accounts.</p><div class="actions" style="margin-top:24px"><button class="button" data-action="retry-session">Check access again</button><button class="button secondary" data-action="signout">Use another account</button></div></section>`;
}
function renderWizard() {
  main.innerHTML = `<section class="setup-form"><p class="eyebrow">YOUR SHOP, TAKING SHAPE</p><h1>Make a little<br><em>room for your flowers.</em></h1><p class="subtle">Start with the essentials. Your shop stays private while you find your finishing touches.</p><div class="step-indicator"><i class="active"></i><i class="${wizardStep === 2 ? "active" : ""}"></i><span>STEP ${wizardStep} OF 2 · ${wizardStep === 1 ? "YOUR SHOP" : "YOUR FLOWERS"}</span></div><div id="pageMessage" class="notice" role="status" hidden></div><form id="createShopForm" class="surface">${wizardStep === 1 ? `<h2>First, a name.</h2><p class="subtle">A familiar name, in a new creative space.</p><div class="form-grid"><label class="field full">Shop name<input id="shopName" data-wizard="name" value="${html(wizard.name)}" maxlength="80" placeholder="The Little Flower Room" required></label><label class="field full">Your shop link<input id="shopSlug" data-wizard="slug" value="${html(wizard.slug)}" minlength="3" maxlength="48" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="the-little-flower-room" required><span class="helper">${html(location.host)}/s/<span id="slugPreview">${html(wizard.slug || "your-shop-name")}</span> · Choose carefully; this becomes your shop address.</span></label><label class="field">Your shop currency<select data-wizard="currency"><option value="USD" ${wizard.currency === "USD" ? "selected" : ""}>USD · US dollar</option><option value="CAD" ${wizard.currency === "CAD" ? "selected" : ""}>CAD · Canadian dollar</option></select></label></div><div class="form-footer"><span class="helper">One account. One thoughtfully made shop.</span><button class="button" type="submit">Choose my flowers <span aria-hidden="true">→</span></button></div>` : `<h2>What do you make?</h2><p class="subtle">Choose the collection that feels closest to your craft.</p><div class="preset-grid"><label class="preset-option"><input type="radio" name="preset" value="fresh" data-wizard="preset" ${wizard.preset === "fresh" ? "checked" : ""}><span class="preset-symbol" aria-hidden="true">❀</span><strong>Fresh flowers</strong><span>Real flower artwork and ready-to-edit recipes. Your bouquet studio is ready to explore.</span><span class="pill green" style="display:inline-flex;margin-top:14px">Ready for the beta</span></label><label class="preset-option"><input type="radio" name="preset" value="satin" data-wizard="preset" ${wizard.preset === "satin" ? "checked" : ""}><span class="preset-symbol" aria-hidden="true">✿</span><strong>Satin & eternal</strong><span>Reserve your shop and set up your brand. The matching bouquet studio is still being prepared.</span><span class="pill" style="display:inline-flex;margin-top:14px">Studio preparing</span></label></div><p class="helper">Billing, publishing and customer orders remain inactive for both collections.</p><div class="form-footer"><button class="plain-button" type="button" data-action="wizard-back">← Back to my shop</button><button class="button" type="submit">Create my private shop <span aria-hidden="true">↗</span></button></div>`}</form></section>`;
}
function renderOverview() {
  const cards = draft.collection || [];
  const priced = catalog.flowers.filter(
    (flower) =>
      !draft.disabledFlowers.includes(flower.id) &&
      Number.isInteger(draft.flowerPrices[flower.id]),
  ).length;
  const brandReady = !!(draft.name && draft.city && draft.phone);
  const checklist = [
    [
      brandReady,
      "Make it feel like your shop",
      "Your name, contact details and signature colours.",
      "/dashboard/shop",
    ],
    [
      priced > 0,
      "Choose your flowers & prices",
      "Only offer what you love to make.",
      "/dashboard/prices",
    ],
    [
      cards.length >= 4,
      "Bring your collection together",
      "Four starting points, each with an editable recipe.",
      "/dashboard/collection",
    ],
    [
      false,
      "Open your doors",
      "Subscription and publication setup are still pending.",
      "/dashboard/billing",
    ],
  ];
  shell(
    `<div class="surface welcome-card"><div class="welcome-copy"><p class="eyebrow">A BEAUTIFUL BEGINNING</p><h2>Your little corner<br>is <em>taking shape.</em></h2><p>Make this space your own, one detail at a time. Your collection is safe here while you get ready.</p><a class="button" href="${previewLink()}" data-nav>Visit my private preview <span aria-hidden="true">↗</span></a></div><div class="welcome-art"><img src="/assets/studio-pink.webp" alt="Blush pink roses in soft ivory wrapping"></div></div><div class="stats-grid"><div class="surface stat"><span class="label">YOUR FLOWER LIBRARY</span><strong>${priced}</strong><p>Flowers with a saved price</p></div><div class="surface stat"><span class="label">IN YOUR COLLECTION</span><strong>${cards.length} <span style="font-size:16px">/ 4</span></strong><p>Personal starting points</p></div><div class="surface stat"><span class="label">YOUR SHOP STATUS</span><strong style="font-size:25px">Private</strong><p>Customer orders are closed</p></div></div><div class="overview-grid"><section class="surface"><div class="section-heading"><div><h2>A few finishing touches.</h2><p class="subtle">There’s no rush. Make it yours.</p></div><span class="pill">${checklist.filter((item) => item[0]).length} of 4</span></div><ol class="checklist">${checklist.map(([done, title, note, path]) => `<li><span class="check-circle ${done ? "done" : ""}" aria-label="${done ? "Complete" : "To do"}">${done ? "✓" : "○"}</span><div><strong>${title}</strong><p>${note}</p></div><a href="${path}" data-nav aria-label="Open ${title.toLowerCase()}">↗</a></li>`).join("")}</ol></section><section class="surface draft-card"><p class="tiny-label">YOUR SHOP LINK</p><h3>${html(draft.name)}</h3><p class="subtle">A private preview of what you’re creating. Only your signed-in account can open it.</p><div class="preview-link"><span>${html(location.host + previewLink())}</span><span aria-hidden="true">↗</span></div><a class="button secondary small" href="${previewLink()}" data-nav>Open owner preview <span aria-hidden="true">↗</span></a><p class="helper" style="margin-top:20px">${draft.preset === "satin" ? "Your satin studio is preparing. Brand and contact details can be saved now." : "Explore your recipes in the shared bouquet studio. Requests and payments are disabled."}</p></section></div>`,
    "Welcome back, <em>florist.</em>",
    "A little care, a few finishing touches, and a shop that feels like you.",
  );
}
function renderBrand() {
  shell(
    `<section class="surface"><div class="section-heading"><div><h2>A name they’ll remember.</h2><p class="subtle">The familiar details that make your shop feel like yours.</p></div></div><div class="form-grid">${field("Shop name", "name", { max: 80, required: true })}${field("A little introduction", "tagline", { max: 160, placeholder: "Thoughtful flowers, for your kind of moments." })}${field("City or neighbourhood", "city", { max: 80, placeholder: "Winnipeg, Manitoba" })}${field("Phone or WhatsApp", "phone", { type: "tel", max: 40, placeholder: "+1 204 555 0100" })}${field("Instagram", "instagram", { max: 100, placeholder: "@yourflowershop" })}<label class="field">Shop link<input value="${html(location.host + previewLink())}" disabled><span class="helper">Your shop address stays the same as your draft grows.</span></label></div></section><section class="surface"><div class="section-heading"><div><h2>Your signature.</h2><p class="subtle">A logo and a couple of colours. Just enough to feel at home.</p></div></div><div class="media-row"><div class="logo-preview">${draft.logoMediaId ? `<img data-media-id="${html(draft.logoMediaId)}" alt="Your shop logo">` : "✳"}</div><div><input id="logoFile" type="file" accept="image/png,image/jpeg,image/webp" data-upload="1" data-kind="logo" hidden><label class="button secondary small" for="logoFile">Choose a logo <span aria-hidden="true">↑</span></label><p class="helper">PNG, JPEG or WebP. Automatically resized to fit 80 KB.</p>${draft.logoMediaId ? '<button class="plain-button" data-action="remove-logo">Remove logo</button>' : ""}</div></div><div class="colour-fields" style="margin-top:27px">${[
      ["primary", "Signature colour"],
      ["background", "Paper colour"],
    ]
      .map(
        ([key, label]) =>
          `<label class="colour-control"><input type="color" data-path="theme.${key}" value="${html(draft.theme[key])}" aria-label="${label}"><div><strong>${label}</strong><span data-colour-label="${key}">${html(draft.theme[key]).toUpperCase()}</span></div></label>`,
      )
      .join(
        "",
      )}</div></section><section class="surface"><h2>Made for your craft.</h2><p class="subtle">${draft.preset === "satin" ? "Satin & eternal flowers · Your matching studio is being prepared." : "Fresh flowers · Classic, Dome and Heart arrangements."} Prices are shown in ${currency()}.</p><p class="helper">Your collection preset and currency were chosen when you created this shop. Contact the beta owner if they need correcting.</p></section>`,
    "The details that<br>make it <em>you.</em>",
    "Your name, your colours, your way of saying hello.",
    "SHOP & BRAND",
  );
}
function priceRows(items, extras = false) {
  return items
    .map((item) => {
      const disabled = !extras && draft.disabledFlowers.includes(item.id);
      const value = (extras ? draft.extrasCents : draft.flowerPrices)[item.id];
      return `<tr data-price-row data-search="${html((item.en || item.label || item.id).toLowerCase())}" class="${disabled ? "unavailable" : ""}"><td>${extras ? "✧" : `<input type="checkbox" data-flower-enabled="${html(item.id)}" aria-label="Offer ${html(item.en)}" ${disabled ? "" : "checked"}>`}</td><td>${html(item.en || item.label)}<small>${extras ? "Optional finishing touch" : html(item.family?.replaceAll("_", " ") || "Flower")}</small></td><td><div class="price-wrap"><input class="price-input" type="number" min="0" max="10000" step="0.01" inputmode="decimal" data-${extras ? "extra" : "flower"}-price="${html(item.id)}" aria-label="${html(item.en || item.label)} price in ${currency()}" value="${amount(value)}" placeholder="Set price"></div></td></tr>`;
    })
    .join("");
}
function renderPrices() {
  if (draft.preset === "satin")
    return shell(
      '<section class="surface"><span class="pill">STUDIO PREPARING</span><h2 style="margin-top:24px">Your satin flowers,<br>in their own time.</h2><p class="subtle">The matching satin catalogue and studio are being prepared. Set up your brand now; your flower prices can be added when that library is available.</p><a class="button secondary" href="/dashboard/shop" data-nav>Make my brand feel like me ↗</a></section>',
      "Your craft.<br><em>Your own catalogue.</em>",
      "Your satin shop is reserved. Its matching flower library is still being prepared.",
      "FLOWERS & PRICES",
    );
  shell(
    `${draft.preset === "satin" ? '<div class="notice">Your satin studio is preparing. The fresh-flower library below does not enable satin checkout. You can complete your brand and collection setup when the satin catalogue is available.</div>' : ""}<section class="surface"><div class="section-heading"><div><h2>Your flowers. Your prices.</h2><p class="subtle">Choose your offered flowers and enter a price per stem in ${currency()}. A blank price needs your attention before launch.</p></div><span class="pill">${currency()}</span></div><div class="price-toolbar"><input id="flowerSearch" type="search" placeholder="Find a flower…" aria-label="Search flowers"><span class="helper">Prices are draft estimates.</span></div><table class="price-table"><thead><tr><th>OFFER</th><th>FLOWER</th><th>PER STEM · ${currency()}</th></tr></thead><tbody>${priceRows(catalog.flowers)}</tbody></table><p id="noFlowers" class="helper" hidden>No flowers match your search.</p></section><section class="surface"><div class="section-heading"><div><h2>A little something extra.</h2><p class="subtle">Prices for the existing finishing touches. Leave an unavailable extra unpriced.</p></div></div><table class="price-table"><thead><tr><th></th><th>FINISHING TOUCH</th><th>PRICE · ${currency()}</th></tr></thead><tbody>${priceRows(catalog.extras, true)}</tbody></table></section>`,
    "Every stem,<br><em>thoughtfully priced.</em>",
    "Make the library reflect what your shop actually offers.",
    "FLOWERS & PRICES",
  );
}
function cover(card, className = "cover-preview") {
  const recipe = recipeFor(card);
  return `<div class="${className}">${card.cover ? `<img data-media-id="${html(card.cover)}" alt="${html(card.title)} cover">` : recipe?.cover ? `<img src="${html(recipe.cover)}" alt="${html(card.title)} recipe preview" loading="lazy">` : '<span class="cover-placeholder" aria-hidden="true">✿</span>'}${className === "cover-preview" ? `<span class="cover-label">${card.cover ? "YOUR PHOTO" : recipe?.cover ? "RECIPE PREVIEW" : "A LITTLE INSPIRATION"}</span>` : ""}</div>`;
}
function renderCollection() {
  const recipes = matchingRecipes();
  const cards = draft.collection || [];
  const editors = cards
    .map(
      (card, index) =>
        `<article class="surface collection-editor">${cover(card)}<div class="collection-body"><p class="tiny-label">COLLECTION ${String(index + 1).padStart(2, "0")}</p><label class="field">Bouquet name<input data-card-title="${html(card.id)}" value="${html(card.title)}" maxlength="80" required></label><label class="field">The recipe behind the picture<select data-card-recipe="${html(card.id)}">${card.design ? '<option value="__design" selected>My saved studio design</option>' : ""}${recipes.map((recipe) => `<option value="${html(recipe.id)}" ${card.recipeId === recipe.id && !card.design ? "selected" : ""}>${html(recipe.name)} · ${html(recipe.mode)}</option>`).join("")}</select></label><p class="helper">Order and Customise open this same editable bouquet. A photo alone doesn’t create its recipe.</p><div class="collection-actions"><input type="file" id="cover-${index}" accept="image/png,image/jpeg,image/webp" data-upload="${index + 2}" data-kind="cover" data-card="${html(card.id)}" hidden><label class="button secondary small" for="cover-${index}">Change cover ↑</label>${draft.preset === "fresh" ? `<a href="${studioLink(card)}" data-studio>Edit in studio ↗</a>` : '<span class="helper">Studio preparing</span>'}</div>${card.cover ? `<button class="plain-button" data-action="remove-cover" data-card="${html(card.id)}">Use recipe preview instead</button>` : ""}</div></article>`,
    )
    .join("");
  shell(
    `<div class="notice">${draft.preset === "fresh" ? "Start with a library recipe, then make it your own in the studio. Save these draft changes before opening the editor." : "Your satin studio is being prepared. We won’t substitute a fresh-flower design for your satin bouquets."}</div>${cards.length ? `<div class="collection-grid">${editors}</div>` : `<section class="surface"><h2>A collection, waiting to bloom.</h2><p class="subtle">${recipes.length ? "Add four starting recipes, ready for your finishing touches." : "Matching recipes will appear here when your catalogue is ready. Your brand settings can be saved now."}</p><button class="button secondary" data-action="seed-collection" ${!recipes.length ? "disabled" : ""}>Start my four-bouquet collection <span aria-hidden="true">↗</span></button></section>`}`,
    "A few lovely<br><em>starting points.</em>",
    "Four bouquets to spark an idea. Every card keeps its own editable recipe.",
    "YOUR COLLECTION",
  );
}
function renderBilling() {
  shell(
    `<div class="activation-grid"><section class="surface plan-surface"><p class="eyebrow">THE NEBULA BOUQUET STUDIO</p><h2>Your shop.<br>Your little corner.</h2><div class="plan-price"><strong>$29</strong><span>USD / month · planned subscription</span></div><p class="helper">No subscription is active. Nothing is being charged.</p><ul class="feature-list"><li>Your brand and private shop preview</li><li>The existing flower artwork and bouquet studio</li><li>Your approved catalogue and collection</li><li>Saved designs, in one place</li></ul><button class="button light" disabled>Subscription setup pending</button><p class="helper" style="margin-top:16px">The billing provider must be connected and tested before subscription checkout is offered.</p></section><section class="surface"><span class="pill">PRIVATE DRAFT</span><h2 style="margin-top:24px">Not quite opening day.</h2><p class="subtle">Keep creating your shop while we finish the beta. Publication needs a verified subscription and complete shop setup.</p><ol class="checklist"><li><span class="check-circle">○</span><div><strong>Subscription inactive</strong><p>Provider checkout and billing management are not connected.</p></div></li><li><span class="check-circle">○</span><div><strong>Publication unavailable</strong><p>Your saved draft remains private to your signed-in account.</p></div></li><li><span class="check-circle">○</span><div><strong>Customer orders closed</strong><p>No customer request or payment can be submitted from this preview.</p></div></li></ol><button class="button secondary" disabled>Publish my shop</button><div class="pending-note"><p>Saving a draft, opening a preview or returning from a payment page does not activate a shop.</p></div></section></div>`,
    "A beautiful space.<br><em>A clear next step.</em>",
    "Prepare your shop now. Billing and publication will open after provider setup.",
    "PLAN & PUBLISHING",
  );
}
function renderPayments() {
  shell(
    `<div class="activation-grid"><section class="surface"><div class="connection-mark" aria-hidden="true">□</div><span class="pill">NOT CONNECTED</span><h2 style="margin-top:23px">Your sales.<br>Your Square account.</h2><p class="subtle">Square will collect your customers’ bouquet payments. It is separate from your Nebula subscription.</p><button class="button" disabled>Square connection preparing</button><p class="helper" style="margin-top:18px">Merchant country, currency, pricing and fulfillment checks must be completed before card checkout is available.</p></section><section class="surface"><p class="eyebrow">YOUR ORDERS</p><h2>A little room<br>for future bouquets.</h2><p class="subtle">Customer orders are closed in this private beta. There are no active checkout links or verified customer payments in this app.</p><div class="notice">Your bouquet studio is available for design previews and saved creations. Sending an order and paying remain disabled.</div><a class="button secondary small" href="${previewLink()}" data-nav>Explore my private preview <span aria-hidden="true">↗</span></a></section></div>`,
    "The craft is yours.<br><em>The payments, too.</em>",
    "Your merchant connection and customer orders will live here.",
    "SQUARE & ORDERS",
  );
}
function renderLocked() {
  main.innerHTML = `<section class="empty-screen"><div class="lock-icon" aria-hidden="true">✧</div><p class="eyebrow">SOMETHING BEAUTIFUL IS TAKING SHAPE</p><h1>A little patience.<br><em>A little magic.</em></h1><p class="subtle" style="max-width:420px">This shop is a private draft. Customer orders are not open. The shop owner can sign in to continue their preview.</p><a class="button" href="${user ? "/dashboard" : "/login?returnTo=" + encodeURIComponent(location.pathname)}" data-nav>${user ? "Back to my dashboard" : "Owner sign-in"} <span aria-hidden="true">↗</span></a></section>`;
}
function renderPreview() {
  const slug = decodeURIComponent(route().slice(3));
  if (!user || !user.emailVerified || !shop || shop.slug !== slug)
    return renderLocked();
  const cards = draft.collection || [];
  const ready = draft.preset === "fresh";
  main.innerHTML = `<div class="preview-banner"><span>✧ OWNER PREVIEW · Your private draft · Orders are closed</span><a href="/dashboard" data-nav>Back to my studio ↗</a></div><section class="storefront" style="--shop-primary:${html(draft.theme.primary)};--shop-background:${html(draft.theme.background)}"><header class="store-header"><div class="store-brand">${draft.logoMediaId ? `<img data-media-id="${html(draft.logoMediaId)}" alt="${html(draft.name)} logo">` : '<span aria-hidden="true" style="color:var(--shop-primary)">✳</span>'}${html(draft.name)}</div><span class="store-location">${html(draft.city || "Thoughtfully made, just for you.")}</span></header><div class="store-hero"><p class="eyebrow">A LITTLE IMAGINATION. A BEAUTIFUL BOUQUET.</p><h1>For your kind<br>of <em>beautiful.</em></h1><p>${html(draft.tagline || "Flowers with a little personality. Start with a favourite, then make it your own.")}</p></div>${!ready ? '<div class="notice">Satin & eternal collection · The matching bouquet studio is preparing. Your brand preview is ready to explore; ordering remains closed.</div>' : ""}<div class="store-section-heading"><h2>The collection.</h2><span>Four little starting points.<br>So many possibilities.</span></div>${cards.length ? `<div class="store-collection">${cards.map((card) => `<article class="store-card">${cover(card, "store-card-cover")}<h3>${html(card.title)}</h3><p>${card.design ? "Your saved bouquet, ready for a little imagination." : html(recipeFor(card)?.name || "A personal bouquet recipe.")}</p><div class="actions">${ready ? `<a class="button" href="${studioLink(card, true)}" data-studio>Order <span aria-hidden="true">↗</span></a><a class="button secondary" href="${studioLink(card)}" data-studio>Customise <span aria-hidden="true">✳</span></a>` : '<button class="button" disabled>Studio preparing</button>'}</div></article>`).join("")}</div>` : '<div class="surface"><h3>Your flowers will be right at home.</h3><p class="subtle">Add matching recipes in your dashboard to bring this collection to life.</p></div>'}<p class="helper" style="text-align:center;margin-top:30px">Owner preview only. The Order link previews your bouquet in the studio; sending an order and paying are disabled.</p><div class="store-bottom"><span>${html(draft.name)}${draft.city ? " · " + html(draft.city) : ""}</span><span>${html([draft.phone, draft.instagram].filter(Boolean).join(" · "))}</span><span>Bouquet studio by Nebula ✳</span></div></section>`;
  hydrateMedia();
}
function render() {
  accountNav();
  const path = route();
  if (path.startsWith("/s/")) return renderPreview();
  if (!user) return renderLogin();
  if (!user.emailVerified) return renderVerification();
  if (pageMessage && !catalog) return renderRestricted(pageMessage);
  if (!shop) return renderWizard();
  if (path === "/login") {
    history.replaceState(null, "", "/dashboard");
  }
  switch (route()) {
    case "/dashboard/shop":
      return renderBrand();
    case "/dashboard/prices":
      return renderPrices();
    case "/dashboard/collection":
      return renderCollection();
    case "/dashboard/billing":
      return renderBilling();
    case "/dashboard/payments":
      return renderPayments();
    default:
      return renderOverview();
  }
}
async function loadSession() {
  const session = await api("/api/session");
  const response = await fetch("/api/catalog", {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Error("The flower library could not be loaded. Please try again.");
  catalog = await response.json();
  if (
    !Array.isArray(catalog.flowers) ||
    !Array.isArray(catalog.extras) ||
    !Array.isArray(catalog.recipes)
  )
    throw Error("The flower library is still being prepared.");
  shop = session.shop;
  draft = shop ? clone(shop.draft) : null;
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
  dirty = true;
  editRevision++;
  updateSaveState();
  clearTimeout(saveTimer);
  if (!conflict) saveTimer = setTimeout(() => saveDraft(false), 1400);
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
      draft = clone(shop.draft);
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
      saveTimer = setTimeout(() => saveDraft(false), 1400);
  }
}
function seedCollection() {
  const recipes = matchingRecipes();
  if (!recipes.length) return;
  draft.collection = Array.from({ length: 4 }, (_, index) => {
    const recipe = recipes[index % recipes.length];
    return {
      id: "card-" + (index + 1),
      title: recipe.name,
      recipeId: recipe.id,
      design: null,
      cover: null,
    };
  });
  changed();
}
async function useSamplePrices() {
  // Samples are an explicit owner action. Missing prices never silently become
  // zero, and this beta has no publication or checkout endpoint to approve them.
  for (const item of catalog.flowers) {
    if (
      draft.flowerPrices[item.id] == null &&
      Number.isSafeInteger(item.priceCents)
    )
      draft.flowerPrices[item.id] = item.priceCents;
  }
  for (const item of catalog.extras) {
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
    draft = clone(shop.draft);
    version = shop.version;
    dirty = conflict = false;
    if (matchingRecipes().length) {
      seedCollection();
      await saveDraft(false);
    }
    await navigate("/dashboard");
    announce(
      "Your private shop is created. Billing and orders remain inactive.",
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
      kind === "logo" ? 80 * 1024 : 150 * 1024,
      kind === "logo" ? 400 : 1000,
    );
    const response = await api(
      `/api/shops/${encodeURIComponent(shop.id)}/media?slot=${slot}&kind=${kind}`,
      { method: "POST", body: blob },
    );
    const id = response.media.id;
    const cacheKey = shop.id + ":" + id;
    if (mediaCache.has(cacheKey))
      URL.revokeObjectURL(await mediaCache.get(cacheKey));
    mediaCache.set(cacheKey, Promise.resolve(URL.createObjectURL(blob)));
    if (kind === "logo") draft.logoMediaId = id;
    else
      draft.collection.find((card) => card.id === input.dataset.card).cover =
        id;
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
            headers: { Authorization: "Bearer " + (await token()) },
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
  if (action === "auth-mode") {
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
      draft = clone(shop.draft);
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
  if (!draft) return;
  if (input.dataset.path) {
    const keys = input.dataset.path.split(".");
    const parent = keys
      .slice(0, -1)
      .reduce((object, key) => object[key], draft);
    parent[keys.at(-1)] = input.value;
    if (keys[0] === "theme")
      document.querySelector(`[data-colour-label="${keys[1]}"]`).textContent =
        input.value.toUpperCase();
    changed();
  } else if (input.dataset.flowerPrice || input.dataset.extraPrice) {
    const key = input.dataset.flowerPrice || input.dataset.extraPrice;
    const values = input.dataset.flowerPrice
      ? draft.flowerPrices
      : draft.extrasCents;
    if (!input.checkValidity()) return;
    values[key] =
      input.value === "" ? null : Math.round(Number(input.value) * 100);
    changed();
  } else if (input.dataset.flowerEnabled) {
    draft.disabledFlowers = draft.disabledFlowers.filter(
      (id) => id !== input.dataset.flowerEnabled,
    );
    if (!input.checked) draft.disabledFlowers.push(input.dataset.flowerEnabled);
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
    card.recipeId = input.value;
    card.design = null;
    changed();
    render();
  }
});
document.addEventListener("change", (event) => {
  if (event.target.matches("input[data-upload]")) uploadMedia(event.target);
});
window.addEventListener("popstate", render);
window.addEventListener("beforeunload", (event) => {
  if (dirty || saving || uploadJobs.size) {
    event.preventDefault();
    event.returnValue = "";
  }
});

async function start() {
  const path = route();
  if (path.startsWith("/s/")) renderLocked();
  try {
    ({ auth, authApi, config } = await initialize());
    user = await getUser();
    if (user?.emailVerified) await loadSession();
    render();
  } catch (error) {
    accountNav();
    pageMessage = errorText(error);
    if (path.startsWith("/s/")) {
      renderLocked();
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
