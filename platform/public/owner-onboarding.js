import {
  bouquetRequirements,
  finishBouquetDraft,
  hideUnpriced,
} from "/bouquet-setup.mjs";
const esc = (value = "") =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paid = (shop) => {
  const s = shop.subscription,
    value =
      s?.paidUntil ?? s?.paidThrough ?? s?.expiresAt ?? s?.currentPeriodEnd;
  const expiry =
    typeof value === "number"
      ? value < 1e12
        ? value * 1000
        : value
      : Date.parse(value);
  return s?.status === "active" && expiry > Date.now();
};

function dialog(title, body) {
  document.getElementById("ownerJourneyDialog")?.remove();
  if (!document.getElementById("ownerJourneyStyles")) {
    const style = document.createElement("style");
    style.id = "ownerJourneyStyles";
    style.textContent = `.oj-overlay{position:fixed;inset:0;z-index:100100;background:#30282b70;display:grid;place-items:center;padding:18px;font:15px/1.55 Arial,sans-serif;color:#30282b;box-sizing:border-box}.oj-dialog{background:#fffefa;border-radius:20px;padding:28px;width:min(100%,510px);max-height:calc(100dvh - 36px);overflow:auto;box-sizing:border-box;position:relative;overscroll-behavior:contain}.oj-dialog h2{font:500 32px/1.1 Georgia,serif;margin:12px 34px 16px 0}.oj-dialog p{margin:12px 0}.oj-dialog label{display:grid;gap:6px;margin:14px 0;font-size:14px}.oj-dialog input,.oj-dialog select{font:16px Arial;width:100%;min-height:48px;padding:12px;border:1px solid #ded5ce;border-radius:8px;box-sizing:border-box;min-width:0;background:#fffefa;color:#30282b}.oj-dialog button,.oj-dialog .oj-button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 18px;border:1px solid #672a3f;border-radius:8px;background:#672a3f;color:white;font:600 14px/1.3 Arial;cursor:pointer;text-decoration:none;box-sizing:border-box}.oj-dialog button:disabled{opacity:.55}.oj-dialog .oj-secondary{color:#672a3f;background:transparent}.oj-dialog .oj-close{position:absolute;right:12px;top:12px;width:44px;height:44px;min-height:44px;padding:0;background:transparent;border:0;color:#672a3f;font-size:26px}.oj-dialog .oj-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.oj-dialog .oj-muted{font-size:13px;color:#6b6261}.oj-dialog .oj-check{display:flex;align-items:flex-start;gap:10px}.oj-dialog .oj-check input{width:20px;min-height:20px;height:20px;flex:0 0 20px}.oj-dialog .oj-photo{width:100%;height:180px;object-fit:contain;border-radius:12px;background:#f5f1eb}.oj-dialog [hidden]{display:none!important}.oj-error{color:#922b43;padding:12px;background:#fbeeee;border-radius:8px}.oj-dialog :focus-visible{outline:3px solid #ad824e;outline-offset:3px}.oj-kicker{font-size:11px;letter-spacing:.12em;color:#672a3f;font-weight:bold}@media(max-width:400px){.oj-overlay{padding:10px}.oj-dialog{padding:24px 18px;max-height:calc(100dvh - 20px)}.oj-dialog h2{font-size:28px}.oj-actions>*{width:100%}}`;
    document.head.append(style);
  }
  const previous = document.activeElement,
    overflow = document.body.style.overflow;
  const root = document.createElement("div");
  root.className = "oj-overlay";
  root.id = "ownerJourneyDialog";
  root.innerHTML = `<section class="oj-dialog" role="dialog" aria-modal="true" aria-labelledby="oj-title"><button class="oj-close" aria-label="Close setup">×</button><h2 id="oj-title">${esc(title)}</h2>${body}</section>`;
  document.body.append(root);
  document.body.style.overflow = "hidden";
  let busy = false,
    finish;
  const closed = new Promise((resolve) => {
    finish = resolve;
  });
  const close = (value) => {
    if (busy) return;
    root.remove();
    document.body.style.overflow = overflow;
    document.removeEventListener("keydown", key);
    previous?.focus?.({ preventScroll: true });
    finish(value);
  };
  const key = (event) => {
    if (event.key === "Escape") close(null);
    if (event.key === "Tab") {
      const nodes = [
        ...root.querySelectorAll(
          "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)",
        ),
      ].filter((n) => n.getClientRects().length);
      if (event.shiftKey && document.activeElement === nodes[0]) {
        event.preventDefault();
        nodes.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
        event.preventDefault();
        nodes[0]?.focus();
      }
    }
  };
  root.querySelector(".oj-close").onclick = () => close(null);
  document.addEventListener("keydown", key);
  root.querySelector(".oj-close").focus({ preventScroll: true });
  return {
    root,
    close,
    closed,
    busy: (value) => {
      busy = value;
    },
  };
}

export function welcomeToShop(shop, studioUrl) {
  const view = dialog(
    "This is your shop, " + shop.draft.name + ".",
    `<p>Your name is already on the page. Start with one bouquet you make. You can add the other five later.</p><p class="oj-muted">${studioUrl.includes("trial=1") ? "Your trial design is ready to continue. " : "Build its recipe with our flower library. "}Then add your photo and prices for the items you used. ${paid(shop) ? "Your plan is already active. These edits stay private until you publish." : "Your preview stays free and private."}</p><div class="oj-actions"><a class="oj-button" href="${esc(studioUrl)}">Build my first bouquet →</a><button class="oj-secondary" data-explore>Explore my shop first</button></div>`,
  );
  view.root.querySelector("[data-explore]").onclick = () => view.close(null);
  return view.closed;
}

async function compressedPhoto(file) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw Error("Choose a PNG, JPEG or WebP photo under 20 MB.");
  const image = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    for (let i = 0; i < 10; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/webp", Math.max(0.45, 0.86 - i * 0.055)),
      );
      if (blob && blob.size <= 150 * 1024) return blob;
      scale *= 0.82;
    }
    throw Error("Try a smaller photo; this one could not be resized enough.");
  } finally {
    image.close();
  }
}

export async function finishBouquet({
  shop,
  cardId,
  catalog,
  api,
  makeDesignPhoto,
}) {
  const card = shop.draft.collection.find((row) => row.id === cardId);
  const required = bouquetRequirements(shop.draft, card, catalog);
  const view = dialog(
    "Bring your bouquet into your shop.",
    `<p class="oj-kicker">DESIGN SAVED · ADD ITS PHOTO & PRICES</p><p>Upload the bouquet you make in real life. Customers will see your photo and customise this saved recipe.</p><form id="ojBouquetForm"><div class="oj-error" role="alert" hidden></div><label>Bouquet name<input name="title" maxlength="80" required value="${esc(card.title)}"></label><img class="oj-photo" data-photo-preview alt="Selected bouquet cover" hidden><label>Photo of your bouquet<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="oj-muted" data-photo-status>${card.cover ? "Your current photo is saved. Upload here only if you want to replace it." : "Choose your own photo, or finish this step later."}</p>${makeDesignPhoto ? '<button type="button" class="oj-secondary" data-design-photo>Use builder preview for now</button>' : ""}<h3>Prices for this bouquet</h3><p class="oj-muted">Only the flowers and extras you used. Prices are per item in ${esc(shop.draft.currency)}. Enter 0 only if an extra is included.</p><p class="oj-muted">Does your menu use a price for a whole bouquet or rose count? Keep your recipe as a draft and <a href="https://www.instagram.com/nebulaa_studio/" target="_blank" rel="noopener noreferrer">show Nebula your price menu</a> before opening orders.</p>${required.fields.map((field, index) => `<label>${esc(field.label)}<input data-price-index="${index}" type="number" min="0" max="10000" step="0.01" inputmode="decimal" required value="${field.value === null ? "" : (field.value / 100).toFixed(2)}"></label>`).join("")}<label class="oj-check"><input name="limitLibrary" type="checkbox" checked>Keep unpriced library items hidden from customers. I can add them later.</label><div class="oj-actions"><button type="submit">See this bouquet in my shop →</button><button type="button" class="oj-secondary" data-later>Finish later</button></div><p class="oj-muted">This saves your private preview. No subscription or customer payment starts here.</p></form>`,
  );
  let photo = null,
    objectUrl = null;
  const form = view.root.querySelector("form"),
    error = view.root.querySelector("[role=alert]");
  const showError = (e) => {
    error.textContent = e.message;
    error.hidden = false;
  };
  const setPhoto = (blob) => {
    photo = blob;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);
    const image = view.root.querySelector("[data-photo-preview]");
    image.src = objectUrl;
    image.hidden = false;
  };
  const busy = (value) => {
    view.busy(value);
    view.root
      .querySelectorAll("button,input")
      .forEach((n) => (n.disabled = value));
  };
  form.elements.photo.onchange = async () => {
    const file = form.elements.photo.files[0];
    if (!file) return;
    busy(true);
    try {
      setPhoto(await compressedPhoto(file));
      view.root.querySelector("[data-photo-status]").textContent =
        "Your photo is ready to save.";
    } catch (e) {
      showError(e);
    } finally {
      busy(false);
    }
  };
  const generated = view.root.querySelector("[data-design-photo]");
  if (generated)
    generated.onclick = async () => {
      busy(true);
      try {
        setPhoto(await makeDesignPhoto());
        view.root.querySelector("[data-photo-status]").textContent =
          "Builder preview selected. You can replace it with your real photo later.";
      } catch (e) {
        showError(e);
      } finally {
        busy(false);
      }
    };
  view.root.querySelector("[data-later]").onclick = () => view.close(null);
  form.onsubmit = async (event) => {
    event.preventDefault();
    error.hidden = true;
    busy(true);
    try {
      if (!card.cover && !photo)
        throw Error(
          "Choose a photo or use the builder preview. Your design is saved if you want to finish later.",
        );
      const prices = {};
      for (const [index, field] of required.fields.entries()) {
        const raw = form.querySelector(`[data-price-index="${index}"]`).value;
        if (!/^\d+(?:\.\d{1,2})?$/.test(raw))
          throw Error(
            "Enter a price with at most two decimal places for " +
              field.label +
              ".",
          );
        prices[field.bucket + ":" + field.id] = Math.round(Number(raw) * 100);
      }
      let cover = card.cover;
      // Validate fields before uploading, then attach the confirmed media ID.
      let draft = finishBouquetDraft(shop.draft, cardId, catalog, {
        title: form.elements.title.value,
        prices,
        cover,
        limitLibrary: form.elements.limitLibrary.checked,
      });
      if (photo) {
        const index = draft.collection.findIndex((row) => row.id === cardId);
        const result = await api(
          `/api/shops/${shop.id}/media?kind=cover&slot=${index + 2}`,
          { method: "POST", body: photo },
        );
        cover = result.media?.id;
        if (!/^img_[a-f0-9]{64}$/.test(cover || ""))
          throw Error("Your photo upload could not be confirmed.");
        draft.collection[index].cover = cover;
      }
      const result = await api(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: shop.version, draft },
      });
      busy(false);
      view.close(result.shop);
    } catch (e) {
      showError(e);
      busy(false);
    }
  };
  const result = await view.closed;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  return result;
}

async function contactSetup(shop, api) {
  const view = dialog(
    "Where should customers reach you?",
    `<p>Your bouquet is ready. Add the number you want to use for customer requests.</p><form><div class="oj-error" role="alert" hidden></div><label>Phone / WhatsApp, including country code<input name="phone" type="tel" maxlength="40" autocomplete="tel" placeholder="+1 416 555 0123" required value="${esc(shop.draft.phone)}"></label><label>Receive requests by<select name="channel"><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="both">WhatsApp + SMS</option></select></label><label>City or service area · optional<input name="city" maxlength="80" value="${esc(shop.draft.city)}"></label><button type="submit">Save my contact details →</button><p class="oj-muted">Customers review and send their message. These requests are unpaid. Square can be connected separately.</p></form>`,
  );
  const form = view.root.querySelector("form");
  form.elements.channel.value = shop.draft.requestChannel || "whatsapp";
  form.onsubmit = async (e) => {
    e.preventDefault();
    view.busy(true);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const phone = form.elements.phone.value.trim();
      if (
        !/^\+?[\d\s().-]{8,40}$/.test(phone) ||
        phone.replace(/\D/g, "").length > 15
      )
        throw Error("Include a valid country code and phone number.");
      const draft = {
        ...shop.draft,
        phone,
        city: form.elements.city.value.trim(),
        requestChannel: form.elements.channel.value,
      };
      const result = await api(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: shop.version, draft },
      });
      view.busy(false);
      view.close(result.shop);
    } catch (e) {
      const error = form.querySelector("[role=alert]");
      error.textContent = e.message;
      error.hidden = false;
      view.busy(false);
      button.disabled = false;
    }
  };
  return view.closed;
}

export async function mountOwnerJourney({
  slot,
  shop,
  catalog,
  config,
  api,
  onChange,
  studioUrl,
}) {
  const hasMissingDetails = (card) => {
    try {
      const r = bouquetRequirements(shop.draft, card, catalog);
      return (
        !card.cover ||
        r.fields.some((field) => !Number.isSafeInteger(field.value))
      );
    } catch {
      return true;
    }
  };
  const activeCards = shop.draft.collection.filter(
    (row) => row.available !== false,
  );
  const card = activeCards.find(hasMissingDetails) || activeCards.at(-1);
  const incomplete = card && hasMissingDetails(card);
  const show = (title, text, action, label) => {
    slot.innerHTML = `<div><p class="eyebrow">${shop.published ? "YOUR SAVED SHOP DRAFT" : "YOUR PRIVATE SHOP PREVIEW"}${paid(shop) ? " · PLAN ACTIVE" : ""}</p><h2>${esc(title)}</h2><p>${esc(text)}</p></div><div class="actions">${action === "build" ? `<a class="button" href="${esc(studioUrl)}">${esc(label)}</a>` : `<button class="button" data-journey-action>${esc(label)}</button>`}<a class="plain-button" href="/dashboard/editor" data-nav>Edit shop design ↗</a></div><div class="owner-bouquet-progress"><strong>${shop.draft.collection.length} / 6 signature bouquets saved</strong><div class="actions">${shop.draft.collection.length < 6 && action !== "build" ? `<a class="button secondary" href="${esc(studioUrl)}" data-studio>Build another bouquet →</a>` : ""}<a class="plain-button" href="/dashboard/collection" data-nav>Manage my bouquets ↗</a>${activeCards.length && shop.draft.home.sections.includes("custom") ? '<a class="plain-button" href="#custom">See saved bouquets ↓</a>' : ""}${card && !incomplete ? `<a class="plain-button" href="/studio/studio.html?shop=${encodeURIComponent(shop.id)}&card=${encodeURIComponent(card.id)}&try=1" data-studio>Try customer customisation ↗</a>` : ""}</div><p class="helper">One complete bouquet is enough to open. Empty slots stay private.</p></div><p class="helper" role="status" data-journey-status></p>`;
  };
  const fixedOnly =
    !shop.draft.home.sections.includes("builder") &&
    shop.draft.products.some(
      (row) => row.available !== false && Number.isSafeInteger(row.priceCents),
    );
  if (!card && !fixedOnly) {
    if (shop.draft.collection.length >= 6) {
      show(
        "Your six recipes are saved.",
        "Choose which bouquets customers can see in your shop.",
        "manage",
        "Manage my bouquets →",
      );
      slot.querySelector("[data-journey-action]").onclick = () =>
        location.assign("/dashboard/collection");
      return;
    }
    show(
      "Your name is here. Add your first bouquet.",
      "Build a bouquet you sell, add its photo and let customers make it their own. You have six signature bouquet slots. Start with one and add the rest whenever you like.",
      "build",
      "Build my first bouquet →",
    );
    return;
  }
  if (card && incomplete) {
    show(
      "Your design is saved. Give it your finishing touches.",
      "Add your bouquet photo and prices for the items you used. It will appear in your shop as a starting point for customers.",
      "details",
      "Add photo & prices →",
    );
    slot.querySelector("[data-journey-action]").onclick = async () => {
      try {
        const next = await finishBouquet({
          shop,
          cardId: card.id,
          catalog,
          api,
        });
        if (next) onChange(next);
      } catch (e) {
        slot.querySelector("[data-journey-status]").textContent = e.message;
      }
    };
    return;
  }
  if (!shop.draft.phone) {
    show(
      "Your first bouquet is in your shop.",
      "Add a contact number so customers can send you their bouquet requests.",
      "contact",
      "Set up customer requests →",
    );
    slot.querySelector("[data-journey-action]").onclick = async () => {
      const next = await contactSetup(shop, api);
      if (next) onChange(next);
    };
    return;
  }
  show(
    "Checking your opening details…",
    "Your saved work stays here while we check what is ready.",
    "check",
    "Checking…",
  );
  slot.querySelector("button").disabled = true;
  try {
    const report = await api(`/api/shops/${shop.id}/readiness`);
    if (!slot.isConnected) return;
    const issues = (report.checks || []).filter(
      (row) => row.area === "content" && row.severity !== "warning",
    );
    if (issues.length) {
      const onlyLibrary = issues.every((row) =>
        ["unpriced_flower", "unpriced_extra"].includes(row.code),
      );
      show(
        "One more detail before opening.",
        onlyLibrary
          ? "The bouquets you priced are ready. Hide the remaining unpriced library items to open with your current collection."
          : issues[0].message,
        "fix",
        onlyLibrary ? "Offer my priced items only →" : "Review this detail →",
      );
      slot.querySelector("button").onclick = async () => {
        if (!onlyLibrary) {
          location.assign(issues[0].href || "/dashboard/collection");
          return;
        }
        const b = slot.querySelector("button");
        b.disabled = true;
        try {
          const result = await api(`/api/shops/${shop.id}/draft`, {
            method: "PUT",
            body: {
              version: shop.version,
              draft: hideUnpriced(shop.draft, catalog),
            },
          });
          onChange(result.shop);
        } catch (e) {
          slot.querySelector("[data-journey-status]").textContent = e.message;
          b.disabled = false;
        }
      };
      return;
    }
    if (!paid(shop)) {
      const pending = shop.activationRequest?.status === "pending";
      show(
        pending
          ? "Your activation request is saved."
          : "Your shop is ready to activate.",
        config.sandboxTestAccess
          ? "Ask the Nebula administrator to grant test access, then publish your test shop."
          : pending
            ? "Continue to activation to message Nebula about your invoice."
            : "Review the $29 USD plan and request activation. Once Nebula verifies payment, you can publish your shop.",
        "activate",
        config.sandboxTestAccess
          ? "View test activation →"
          : pending
            ? "Continue activation →"
            : "Activate my shop →",
      );
      slot.querySelector("button").onclick = () =>
        location.assign("/dashboard/billing?from=preview");
      return;
    }
    if (!config.publishingEnabled) {
      show(
        "Your plan is active.",
        "Publishing is being prepared. Your saved shop and designs are safe.",
        "paused",
        "Publishing unavailable",
      );
      slot.querySelector("button").disabled = true;
      return;
    }
    if (
      shop.published &&
      (shop.published.sourceVersion ?? shop.published.version) === shop.version
    ) {
      show(
        "Your shop is open.",
        "Share your public link. Customers can choose a bouquet and send requests; online payments depend on your Square setup.",
        "share",
        "Open my customer shop ↗",
      );
      slot.querySelector("button").onclick = () =>
        location.assign("/s/" + encodeURIComponent(shop.slug) + "?view=live");
      return;
    }
    show(
      "Your plan is active. Your shop is ready.",
      "Publish this saved version to open customer requests. You can keep changing your private draft afterward.",
      "publish",
      shop.published ? "Publish my changes →" : "Publish my shop →",
    );
    const button = slot.querySelector("button");
    button.disabled = report.canPublish !== true;
    button.onclick = async () => {
      button.disabled = true;
      try {
        const result = await api(`/api/shops/${shop.id}/publish`, {
          method: "POST",
          body: { version: shop.version },
        });
        onChange(result.shop);
      } catch (e) {
        slot.querySelector("[data-journey-status]").textContent = e.message;
        button.disabled = false;
      }
    };
  } catch (e) {
    if (slot.isConnected) {
      slot.querySelector("[data-journey-status]").textContent = e.message;
      slot.querySelector("button").textContent = "Try again";
      slot.querySelector("button").disabled = false;
      slot.querySelector("button").onclick = () =>
        mountOwnerJourney({
          slot,
          shop,
          catalog,
          config,
          api,
          onChange,
          studioUrl,
        });
    }
  }
}
