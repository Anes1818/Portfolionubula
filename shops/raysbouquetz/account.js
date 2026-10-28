const $ = (id) => document.getElementById(id),
  cfg = window.NEBULA_PAYMENTS;
const message = (text, error = false) => {
  const e = $("accountMessage");
  e.textContent = text;
  e.classList.toggle("error", error);
};
let auth,
  authApi,
  user,
  account,
  cursor = null,
  editing = false,
  settingsVersion = null;
const price = (v) =>
    v === null || v === undefined ? "" : (v / 100).toFixed(2),
  money = (v) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(v / 100);
function cents(v) {
  if (v === "") return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(v))
    throw Error("Use CAD amounts with at most two decimal places.");
  const [whole, part = ""] = v.split(".");
  return Number(whole) * 100 + Number(part.padEnd(2, "0"));
}
function label(text) {
  const e = document.createElement("span");
  e.textContent = text;
  return e;
}
async function request(path, method = "GET", body) {
  if (!user) throw Error("Sign in first.");
  const r = await fetch(cfg.endpoint + "/v1/shops/" + cfg.shopId + "/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + (await user.getIdToken()),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(25000),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "The request could not be completed.");
  return data;
}
async function task(fn) {
  try {
    await fn();
  } catch (e) {
    message(e.message || "Please try again.", true);
  }
}
function row(id, name, value, enabled, type) {
  const r = document.createElement("div");
  r.className = "price-row";
  const l = document.createElement("label");
  l.className = "check";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = enabled;
  check.dataset.enable = id;
  check.dataset.type = type;
  l.append(check, label(name));
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.01";
  input.min = "0";
  input.value = price(value);
  input.dataset.price = id;
  input.dataset.type = type;
  input.setAttribute("aria-label", name + " price in CAD");
  r.append(l, input);
  return r;
}
function zone(
  z = {
    id: "area-" + crypto.randomUUID().slice(0, 8),
    label: "",
    feeCents: 0,
    postalPrefixes: [],
  },
) {
  const box = document.createElement("div");
  box.className = "zone";
  box.dataset.zone = z.id;
  const name = document.createElement("input");
  name.value = z.label;
  name.placeholder = "Area name";
  name.maxLength = 100;
  name.setAttribute("aria-label", "Delivery area name");
  name.dataset.zoneLabel = "";
  const amount = document.createElement("input");
  amount.type = "number";
  amount.step = ".01";
  amount.min = "0";
  amount.value = price(z.feeCents);
  amount.setAttribute("aria-label", "Delivery charge in CAD");
  amount.dataset.zonePrice = "";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "text-button";
  remove.textContent = "Remove area";
  remove.onclick = () => box.remove();
  const postal = document.createElement("input");
  postal.value = (z.postalPrefixes || []).join(", ");
  postal.placeholder = "Postal prefixes, for example R3C, R3B";
  postal.setAttribute("aria-label", "Offered three-character postal prefixes");
  postal.dataset.zonePostal = "";
  box.append(name, amount, postal, remove);
  $("zones").append(box);
}
function localDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function fillSettings() {
  const s = account.settings,
    p = s.policy,
    fields = $("priceFields");
  settingsVersion = p.version;
  fields.replaceChildren();
  const h = document.createElement("h3");
  h.textContent = "Items · CAD each";
  fields.append(h);
  for (const [id, name] of RayCommerce.flowerRows)
    fields.append(
      row(id, name, p.unitCents[id], p.enabledItems.includes(id), "item"),
    );
  const heading = document.createElement("h3");
  heading.textContent = "Extras · CAD";
  fields.append(heading);
  for (const id of RayCommerce.extras)
    fields.append(
      row(
        id,
        id.replaceAll("_", " "),
        p.extrasCents[id],
        p.enabledExtras.includes(id),
        "extra",
      ),
    );
  const packages = document.createElement("h3");
  packages.textContent = "Foam-only package prices · CAD";
  fields.append(packages);
  for (const [count, value] of Object.entries(p.foamTiers)) {
    const r = row(
      count,
      count + " foam roses, wrapping and simple bow",
      value,
      true,
      "foam",
    );
    r.querySelector("[data-enable]").hidden = true;
    fields.append(r);
  }
  $("wrapDome").value = price(p.wrappingCents.dome);
  $("wrapHeart").value = price(p.wrappingCents.heart);
  $("moneyEnabled").checked = p.moneyEnabled;
  $("fxRate").value = p.usdToCad
    ? p.usdToCad.numerator / p.usdToCad.denominator
    : "";
  $("fxAsOf").value = localDate(p.usdToCad?.asOf);
  $("fxExpiry").value = localDate(p.usdToCad?.expiresAt);
  $("taxMode").value = p.tax.mode;
  $("taxRate").value = p.tax.bps / 100;
  $("cashTaxable").checked = p.tax.cashValueTaxable === true;
  $("pickupEnabled").checked = p.fulfillment.pickupEnabled;
  $("pickupInstructions").value = p.fulfillment.pickupInstructions;
  $("leadDays").value = p.fulfillment.leadDays;
  $("zones").replaceChildren();
  for (const z of p.fulfillment.deliveryZones) zone(z);
  $("cancellationPolicy").value = p.cancellationPolicy;
  $("pricesApproved").checked = p.approved;
  $("checkoutEnabled").checked = s.checkoutEnabled;
  $("cashApproved").checked = s.cashPaymentsApproved;
  $("platformEligibility").hidden = account.role !== "platform-admin";
}
function renderAccount() {
  const assigned = account.role !== "unassigned";
  $("identity").textContent = user.email;
  $("claimPanel").hidden = assigned;
  $("shopPanel").hidden = !assigned;
  $("uid").textContent = "Your account reference: " + user.uid;
  $("inviteOwnerPanel").hidden = account.role !== "platform-admin";
  if (!assigned) {
    message("Your email is verified. Accept your shop invitation to continue.");
    return;
  }
  $("squareStatus").textContent =
    {
      not_connected: "Square is not connected.",
      connected: "Square is connected.",
      reconnect_required: "Square needs reconnecting.",
      revoked: "The Square connection was revoked.",
      temporarily_unavailable:
        "Square status could not be checked. Please retry.",
    }[account.connection.status] || "Square connection needs attention.";
  $("connectSquare").disabled =
    !account.configured || account.connection.status === "connected";
  $("disconnectSquare").disabled = ![
    "connected",
    "reconnect_required",
    "temporarily_unavailable",
  ].includes(account.connection.status);
  $("squareLocation").replaceChildren();
  for (const l of account.connection.locations) {
    const o = document.createElement("option");
    o.value = l.id;
    o.textContent = l.name + " · CAD";
    $("squareLocation").append(o);
  }
  if (account.connection.locationId)
    $("squareLocation").value = account.connection.locationId;
  $("saveLocation").disabled = !account.connection.locations.length;
  if (!editing) fillSettings();
  message(
    account.enabled
      ? "Checkout is enabled. Verified payments will appear in your orders."
      : !account.configured
        ? "The platform’s Square setup is not configured yet. No real checkout is active."
        : account.missing.length
          ? "Checkout setup remaining: " + account.missing.join(" ")
          : "Checkout is paused or awaiting platform activation.",
  );
}
async function refresh() {
  await user.reload();
  if (!user.emailVerified) {
    $("verifyEmail").hidden = false;
    $("shopPanel").hidden = true;
    $("claimPanel").hidden = true;
    message(
      "Verify your email using the message from Firebase, then sign in again.",
    );
    return;
  }
  $("verifyEmail").hidden = true;
  account = await request("account");
  renderAccount();
  if (account.role !== "unassigned") await orders(true);
}
async function orders(reset = false) {
  if (reset) {
    cursor = null;
    $("ordersList").replaceChildren();
  }
  const data = await request(
    "orders" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
  );
  cursor = data.cursor;
  for (const q of data.orders) {
    const b = document.createElement("button");
    b.className = "order-row";
    b.type = "button";
    const title = document.createElement("strong");
    title.textContent = q.customer.name + " · " + q.customer.date;
    const detail = document.createElement("span");
    detail.textContent =
      q.status.replaceAll("_", " ") +
      " · Total " +
      money(q.totalCents) +
      " · Paid " +
      money(q.paidCents) +
      " · Remaining " +
      money(q.balanceCents);
    b.append(title, detail);
    b.onclick = () => task(() => detailOrder(q.id));
    $("ordersList").append(b);
  }
  if (!$("ordersList").children.length)
    $("ordersList").textContent = "No orders yet.";
  $("moreOrders").hidden = !cursor;
}
async function detailOrder(id) {
  const q = await request("orders/" + id),
    box = $("orderDetail");
  box.hidden = false;
  box.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = q.design.title || "Custom bouquet";
  box.append(title);
  for (const text of [
    "Order " + q.id,
    q.status.replaceAll("_", " "),
    q.customer.name + " · " + q.customer.phone + " · " + q.customer.email,
    q.customer.date + " · " + q.customer.method,
    q.customer.address || "",
    q.customer.note || "",
    q.design.note || "",
  ])
    if (text) {
      const p = document.createElement("p");
      p.textContent = text;
      box.append(p);
    }
  const list = document.createElement("div");
  list.className = "summary-lines";
  for (const l of q.pricing.lines)
    list.append(
      label(l.quantity + " × " + l.label),
      label(money(l.totalCents)),
    );
  list.append(
    label("Tax"),
    label(money(q.pricing.taxCents)),
    label("Order total"),
    label(money(q.totalCents)),
    label("Verified paid"),
    label(money(q.paidCents)),
    label("Balance"),
    label(money(Math.max(0, q.totalCents - q.paidCents))),
  );
  box.append(list);
  const design = document.createElement("button");
  design.type = "button";
  design.textContent = "Download editable bouquet";
  design.className = "secondary";
  design.onclick = () => {
    const blob = new Blob([JSON.stringify(q.design)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "bouquet-" + q.id + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  box.append(design);
  const helper = document.createElement("p");
  helper.className = "helper";
  helper.textContent =
    "Load this file using “Keep your creation” → “Load saved design” in the bouquet studio.";
  box.append(helper);
  const a = document.createElement("a");
  a.textContent = "Open Square dashboard for receipts and refunds ↗";
  a.href =
    cfg.environment === "production"
      ? "https://app.squareup.com/"
      : "https://squareupsandbox.com/dashboard/";
  a.target = "_blank";
  a.rel = "noopener";
  box.append(document.createElement("p"), a);
  box.scrollIntoView({ behavior: "smooth" });
}
function readSettings() {
  const p = structuredClone(account.settings.policy);
  p.enabledItems = [];
  p.enabledExtras = [];
  for (const input of document.querySelectorAll("[data-price]")) {
    const id = input.dataset.price,
      type = input.dataset.type,
      value = cents(input.value),
      enabled = document.querySelector(
        `[data-enable="${id}"][data-type="${type}"]`,
      ).checked;
    if (type === "foam") p.foamTiers[id] = value;
    else if (type === "item") {
      p.unitCents[id] = value;
      if (enabled) p.enabledItems.push(id);
    } else {
      p.extrasCents[id] = value;
      if (enabled) p.enabledExtras.push(id);
    }
  }
  p.wrappingCents = {
    dome: cents($("wrapDome").value),
    heart: cents($("wrapHeart").value),
  };
  p.moneyEnabled = $("moneyEnabled").checked;
  if ($("fxRate").value) {
    if (!/^\d+(?:\.\d{1,4})?$/.test($("fxRate").value))
      throw Error("Use at most four decimals for the TD rate.");
    p.usdToCad = {
      numerator: Math.round(Number($("fxRate").value) * 10000),
      denominator: 10000,
      source: "https://ix0.apps.td.com/en/fxcal",
      basis: "TD cash: client buys USD (pays CAD)",
      asOf: new Date($("fxAsOf").value).toISOString(),
      expiresAt: new Date($("fxExpiry").value).toISOString(),
    };
  } else p.usdToCad = null;
  const approved = $("pricesApproved").checked;
  p.approved = approved;
  p.tax = {
    approved,
    mode: $("taxMode").value,
    bps: Math.round(Number($("taxRate").value) * 100),
    cashValueTaxable: $("cashTaxable").checked,
  };
  p.fulfillment = {
    approved,
    pickupEnabled: $("pickupEnabled").checked,
    pickupInstructions: $("pickupInstructions").value,
    leadDays: Number($("leadDays").value),
    deliveryZones: [...document.querySelectorAll("[data-zone]")].map((e) => ({
      id: e.dataset.zone,
      label: e.querySelector("[data-zone-label]").value,
      feeCents: cents(e.querySelector("[data-zone-price]").value),
      postalPrefixes: e
        .querySelector("[data-zone-postal]")
        .value.toUpperCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })),
  };
  p.cancellationPolicy = $("cancellationPolicy").value;
  return {
    version: settingsVersion,
    policy: p,
    checkoutEnabled: $("checkoutEnabled").checked,
    ...(account.role === "platform-admin"
      ? { cashPaymentsApproved: $("cashApproved").checked }
      : {}),
  };
}
async function start() {
  if (!cfg?.endpoint) {
    message(
      "Online payments are being set up. The shop account will be available after the payment service is connected.",
    );
    return;
  }
  const endpoint = new URL(cfg.endpoint);
  if (
    endpoint.protocol !== "https:" &&
    !(
      cfg.environment === "sandbox" &&
      ["localhost", "127.0.0.1"].includes(endpoint.hostname)
    )
  )
    throw Error("The payment service URL is invalid.");
  cfg.endpoint = endpoint.href.replace(/\/$/, "");
  $("environment").hidden = cfg.environment !== "sandbox";
  $("environment").textContent = "TEST ENVIRONMENT — no real payments.";
  const [appApi, a] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js"),
  ]);
  authApi = a;
  auth = a.getAuth(appApi.initializeApp(cfg.firebase));
  await a.setPersistence(auth, a.browserSessionPersistence);
  const invitation = new URLSearchParams(location.hash.slice(1)).get("invite");
  if (invitation) {
    $("inviteCode").value = invitation;
    history.replaceState(null, "", location.pathname);
  }
  $("loginForm").onsubmit = (e) => {
    e.preventDefault();
    task(() =>
      a.signInWithEmailAndPassword(auth, $("email").value, $("password").value),
    );
  };
  $("createAccount").onclick = () =>
    task(async () => {
      if (!$("loginForm").reportValidity()) return;
      const result = await a.createUserWithEmailAndPassword(
        auth,
        $("email").value,
        $("password").value,
      );
      await a.sendEmailVerification(result.user);
      message("Open your verification email, then return and sign in.");
    });
  $("googleLogin").onclick = () =>
    task(() => a.signInWithPopup(auth, new a.GoogleAuthProvider()));
  $("resetPassword").onclick = () =>
    task(async () => {
      if (!$("email").reportValidity() || !$("email").value) return;
      await a.sendPasswordResetEmail(auth, $("email").value);
      message("If this address can receive a reset email, check its inbox.");
    });
  $("signOut").onclick = () => task(() => a.signOut(auth));
  $("verifyEmail").onclick = () =>
    task(async () => {
      await a.sendEmailVerification(user);
      message("Verification email requested. Check your inbox.");
    });
  $("claimInvite").onclick = () =>
    task(async () => {
      account = await request("claim", "POST", {
        invite: $("inviteCode").value.trim(),
      });
      $("inviteCode").value = "";
      await refresh();
    });
  $("connectSquare").onclick = () =>
    task(async () => {
      message("Opening Square’s secure sign-in…");
      const data = await request("square/connect", "POST", {});
      const target = new URL(data.url);
      if (
        target.origin !== new URL(cfg.endpoint).origin ||
        target.pathname !== "/oauth/start"
      )
        throw Error("Unexpected Square connection URL.");
      location.assign(target.href);
    });
  $("disconnectSquare").onclick = () =>
    task(async () => {
      if (!confirm("Disconnect Square and retire unpaid checkout links?"))
        return;
      await request("square/disconnect", "POST", {});
      await refresh();
    });
  $("saveLocation").onclick = () =>
    task(async () => {
      await request("square/location", "POST", {
        locationId: $("squareLocation").value,
      });
      await refresh();
    });
  $("refreshOrders").onclick = () => task(() => refresh());
  $("moreOrders").onclick = () => task(() => orders());
  $("addZone").onclick = () => zone();
  $("settingsForm").oninput = () => (editing = true);
  $("settingsForm").onsubmit = (e) => {
    e.preventDefault();
    task(async () => {
      account = await request("settings", "PUT", readSettings());
      editing = false;
      renderAccount();
      message(
        "Settings saved. Checkout remains subject to the displayed connection and activation status.",
      );
    });
  };
  $("inviteOwner").onclick = () =>
    task(async () => {
      const data = await request("invites", "POST", {
        email: $("ownerEmail").value,
      });
      const link =
        location.origin + location.pathname + "#invite=" + data.invite;
      $("invitationOutput").textContent =
        "Private invitation, valid for seven days: " + link;
    });
  for (const b of document.querySelectorAll("[data-tab]"))
    b.onclick = () => {
      for (const id of ["ordersPanel", "squarePanel", "settingsPanel"])
        $(id).hidden = id !== b.dataset.tab;
      for (const tab of document.querySelectorAll("[data-tab]"))
        tab.setAttribute("aria-selected", String(tab === b));
    };
  document.querySelector("[data-tab]").setAttribute("aria-selected", "true");
  a.onAuthStateChanged(auth, (current) => {
    user = current;
    $("loginPanel").hidden = !!user;
    $("signedIn").hidden = !user;
    if (!user) {
      message("Sign in with the account invited to this shop.");
      return;
    }
    task(() => refresh());
  });
}
start().catch((e) =>
  message(e.message || "Account setup is temporarily unavailable.", true),
);
