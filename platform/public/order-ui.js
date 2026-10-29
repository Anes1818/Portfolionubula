const escape = (value = "") =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

let cataloguePromise;
async function reviewDetails(shop, kind, productId, design, preview) {
  if (kind === "product") {
    const product = shop.draft?.products?.find((row) => row.id === productId);
    if (
      !product ||
      product.available === false ||
      !Number.isSafeInteger(product.priceCents)
    )
      throw new Error("This product is unavailable. Please reload the shop.");
    return {
      totalCents: product.priceCents,
      lines: [
        { label: product.title, quantity: 1, totalCents: product.priceCents },
      ],
    };
  }
  cataloguePromise ||= fetch("/api/catalog", {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  })
    .then((response) => {
      if (!response.ok)
        throw new Error("The flower catalogue could not load. Please retry.");
      return response.json();
    })
    .catch((error) => {
      cataloguePromise = null;
      throw error;
    });
  const [catalog, { priceDesign }] = await Promise.all([
    cataloguePromise,
    import("/policy.mjs"),
  ]);
  const pricing = priceDesign(design, shop.draft, catalog);
  if (!pricing.ok && !preview)
    throw new Error(
      pricing.issues[0]?.message || "Review your bouquet before requesting.",
    );
  const labels = new Map(
    [...catalog.flowers, ...catalog.extras].map((row) => [
      row.id,
      row.en || row.label || row.id,
    ]),
  );
  const counts = new Map();
  for (const item of design.items || [])
    counts.set(item.id, (counts.get(item.id) || 0) + 1);
  return {
    totalCents: pricing.ok ? pricing.totalCents : null,
    lines: pricing.ok
      ? [...pricing.lines, ...pricing.extraLines].map((row) => ({
          ...row,
          label: labels.get(row.id) || row.id,
        }))
      : [...counts].map(([id, quantity]) => ({
          label: labels.get(id) || id,
          quantity,
          totalCents: null,
        })),
  };
}

/** Preview sends nothing. Public requests persist before optional WhatsApp. */
export async function openOrderRequest({
  shop,
  kind,
  productId,
  design,
  cardId,
  preview = false,
}) {
  if (!shop?.id || !["product", "design"].includes(kind))
    return Promise.reject(new Error("This shop request is unavailable."));
  const review = await reviewDetails(shop, kind, productId, design, preview);
  document.getElementById("nebula-order-modal")?.remove();
  if (!document.getElementById("nebula-order-styles")) {
    const style = document.createElement("style");
    style.id = "nebula-order-styles";
    style.textContent = `.nb-order-overlay{position:fixed;inset:0;z-index:100000;background:#30282b73;display:grid;place-items:center;padding:20px;font:14px/1.6 Arial,sans-serif;color:#30282b;overflow:auto}.nb-order-dialog{position:relative;width:min(100%,480px);max-height:calc(100dvh - 40px);overflow:auto;background:#fffefa;border:1px solid #e7dfd8;border-radius:18px;padding:32px;box-shadow:0 24px 100px #30282b30}.nb-order-dialog h2{font:500 36px/1.1 Georgia,serif;margin:10px 24px 16px 0}.nb-order-dialog p{margin:12px 0}.nb-order-kicker{font-size:10px;letter-spacing:.16em;color:#672a3f;font-weight:700}.nb-order-dialog .nb-order-muted{font-size:12px;color:#817575}.nb-order-close{position:absolute;right:18px;top:14px;border:0;background:transparent;color:#672a3f;font:28px Arial;cursor:pointer}.nb-order-form{display:grid;gap:15px;margin-top:20px}.nb-order-form label{display:grid;gap:6px;font-size:11px;font-weight:600}.nb-order-form input,.nb-order-form select,.nb-order-form textarea{box-sizing:border-box;width:100%;padding:12px;border:1px solid #ded5ce;background:#fffefa;border-radius:7px;font:13px Arial;color:#30282b;min-width:0}.nb-order-form textarea{min-height:80px;resize:vertical}.nb-order-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.nb-order-button{display:inline-flex;align-items:center;justify-content:center;padding:13px 18px;border:1px solid #672a3f;border-radius:7px;background:#672a3f;color:white;font:600 12px Arial;text-decoration:none;cursor:pointer}.nb-order-button:disabled{opacity:.5;cursor:wait}.nb-order-button.secondary{background:transparent;color:#672a3f}.nb-order-notice{padding:13px 15px;border-radius:7px;background:#edf2e9;border:1px solid #cfddc5;font-size:12px}.nb-order-notice.error{background:#fbeeee;border-color:#e8caca;color:#8c283a}.nb-order-price{font:30px Georgia,serif}.nb-order-dialog :focus-visible{outline:3px solid #b78b5b;outline-offset:3px}@media(max-width:440px){.nb-order-dialog{padding:24px}.nb-order-row{grid-template-columns:1fr}}`;
    document.head.append(style);
  }
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const root = document.createElement("div");
    root.id = "nebula-order-modal";
    root.className = "nb-order-overlay";
    const requestKey = crypto.randomUUID();
    const accessToken = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
    )
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    const online = !preview && shop.features?.checkoutEnabled === true;
    const item = shop.draft?.products?.find((row) => row.id === productId);
    const title =
      kind === "product"
        ? item?.title || "Your flower request"
        : "Your personal bouquet";
    const currency = shop.draft?.currency || "USD";
    const money = (cents) =>
      new Intl.NumberFormat("en", { style: "currency", currency }).format(
        cents / 100,
      );
    let receipt = null,
      submitting = false;
    const close = () => {
      if (submitting) return;
      root.remove();
      document.removeEventListener("keydown", keyboard);
      previousFocus?.focus();
      resolve(receipt);
    };
    const keyboard = (event) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const nodes = [
          ...root.querySelectorAll(
            "button:not(:disabled),a[href],input,select,textarea",
          ),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    root.innerHTML = `<section class="nb-order-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-order-title"><button class="nb-order-close" aria-label="Close request">×</button><p class="nb-order-kicker">A LITTLE SOMETHING LOVELY</p><h2 id="nb-order-title">${escape(title)}</h2><p class="nb-order-muted">${kind === "product" && item?.priceCents != null ? escape(money(item.priceCents)) + " · " : ""}Your florist will confirm availability and fulfillment. No payment is taken here.</p><form class="nb-order-form"><div class="nb-order-notice error" role="alert" hidden></div><label>Your name<input name="name" autocomplete="name" maxlength="100" required></label><label>Phone or WhatsApp<input name="phone" type="tel" autocomplete="tel" maxlength="40" required></label><div class="nb-order-row"><label>Preferred date<input name="date" type="date" min="${new Date().toISOString().slice(0, 10)}"></label><label>Fulfillment<select name="fulfillment"><option value="pickup">Pickup</option><option value="delivery">Delivery · confirm with florist</option></select></label></div><label>A little note<textarea name="note" maxlength="1000" placeholder="The occasion, your message or delivery details…"></textarea></label><button class="nb-order-button" type="submit">Send unpaid request ↗</button><p class="nb-order-muted">A request is not a confirmed order or a payment. Your request and price are saved by the shop before any optional WhatsApp draft opens.</p></form></section>`;
    const heading = root.querySelector("#nb-order-title");
    const section = document.createElement("section");
    section.className = "nb-order-review";
    section.setAttribute("aria-label", "Bouquet contents and estimate");
    section.innerHTML = `<p class="nb-order-kicker">${preview ? "OWNER PREVIEW" : "REVIEW YOUR REQUEST"}</p><p class="nb-order-price">${review.totalCents === null ? "Prices needed" : escape(money(review.totalCents))}</p><ul>${review.lines.map((row) => `<li><span>${escape(row.quantity)} × ${escape(row.label)}</span>${row.totalCents === null ? "" : `<strong>${escape(money(row.totalCents))}</strong>`}</li>`).join("")}</ul><p class="nb-order-muted">Design estimate. Your florist confirms delivery, applicable tax and availability.${preview ? " This preview cannot submit a request or take a payment." : ""}</p>`;
    section.style.cssText =
      "background:#f5f1eb;border-radius:9px;padding:16px;margin:16px 0";
    for (const row of section.querySelectorAll("li"))
      row.style.cssText =
        "display:flex;justify-content:space-between;gap:16px;margin:6px 0";
    section.querySelector("ul").style.cssText =
      "list-style:none;padding:0;margin:12px 0;font-size:12px";
    heading.after(section);
    if (preview) {
      const submit = root.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Preview only · requests are closed";
    }
    if (online) {
      const fulfillment = root.querySelector('[name="fulfillment"]');
      for (const option of [...fulfillment.options])
        if (
          shop.checkoutSettings &&
          !shop.checkoutSettings[option.value + "Enabled"]
        )
          option.remove();
      root.querySelector('button[type="submit"]').textContent =
        "Review final price & payment options";
      const notes = root.querySelectorAll(
        ".nb-order-dialog > p.nb-order-muted,.nb-order-form > p.nb-order-muted",
      );
      notes.forEach(
        (n) =>
          (n.textContent =
            "First save your request. Then review the florist’s final tax, delivery and terms before choosing a 50% deposit or full payment on Square."),
      );
    }
    document.body.append(root);
    root.querySelector(".nb-order-close").onclick = close;
    root.addEventListener("click", (event) => {
      if (event.target === root) close();
    });
    document.addEventListener("keydown", keyboard);
    root.querySelector("input")?.focus();
    root.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      if (preview) return;
      if (submitting) return;
      submitting = true;
      const button = event.submitter,
        error = root.querySelector("[role=alert]");
      button.disabled = true;
      button.textContent = "Saving your request…";
      error.hidden = true;
      const fields = new FormData(event.target);
      try {
        const body = {
          requestKey,
          accessToken,
          kind,
          publishedVersion: shop.published?.version ?? shop.version,
          ...(kind === "product"
            ? { productId }
            : { design, ...(cardId ? { cardId } : {}) }),
          customer: {
            name: String(fields.get("name")).trim(),
            phone: String(fields.get("phone")).trim(),
            note: String(fields.get("note")).trim(),
            date: fields.get("date") || null,
          },
          fulfillment: fields.get("fulfillment"),
        };
        const response = await fetch(
          `/api/shops/${encodeURIComponent(shop.id)}/requests`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(25000),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Your request could not be saved. Please try again.",
          );
        if (!data.request?.id || !Number.isSafeInteger(data.request.totalCents))
          throw new Error(
            "The saved request receipt was incomplete. Please try again using this same form.",
          );
        receipt = data;
        if (online) {
          const fragment = new URLSearchParams({
            shop: shop.id,
            request: data.request.id,
            token: accessToken,
          });
          try {
            localStorage.setItem(
              `nebula-request:${shop.id}:${data.request.id}`,
              accessToken,
            );
          } catch {}
          location.assign("/receipt.html#" + fragment);
          return;
        }
        const request = data.request;
        const summary =
          typeof request.summary === "string"
            ? request.summary
            : request.summary?.text ||
              "Your florist has your request and will confirm the details with you.";
        const whatsapp =
          data.whatsappUrl &&
          /^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(data.whatsappUrl)
            ? data.whatsappUrl
            : null;
        root.querySelector(".nb-order-dialog").innerHTML =
          `<button class="nb-order-close" aria-label="Close request">×</button><p class="nb-order-kicker">YOUR REQUEST IS SAVED</p><h2 id="nb-order-title">A lovely beginning.</h2><div class="nb-order-notice">Request ${escape(request.id)} saved. This is an unpaid request, awaiting your florist’s confirmation.</div><p class="nb-order-price">${escape(new Intl.NumberFormat("en", { style: "currency", currency: request.currency || currency }).format(request.totalCents / 100))}</p><p class="nb-order-muted">${escape(summary)}</p>${whatsapp ? `<a class="nb-order-button" href="${escape(whatsapp)}" target="_blank" rel="noopener">Open WhatsApp draft ↗</a><p class="nb-order-muted">Review the draft in WhatsApp and send it when you are ready.</p>` : ""}<p><button class="nb-order-button secondary" data-close>Back to the flowers</button></p>`;
        root.querySelector(".nb-order-close").onclick = close;
        root.querySelector("[data-close]").onclick = close;
        root.querySelector("[data-close]").focus();
      } catch (cause) {
        error.textContent =
          cause.message || "Your request could not be saved. Please try again.";
        error.hidden = false;
      } finally {
        submitting = false;
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = online
            ? "Review final price & payment options"
            : "Send unpaid request ↗";
        }
      }
    };
  });
}
