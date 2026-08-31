/* =============================================================
   Petal Press — core.js
   -------------------------------------------------------------
   Wires brand.config.js into the DOM. In template #1 the brand was
   welded into ten files (~140 hard-coded hits), so a reskin meant a
   find-and-replace across the whole site. Here every page is brand
   agnostic: it declares data-* hooks and this file fills them.
   ============================================================= */

(function () {
  "use strict";

  var B = window.BRAND;
  if (!B) { console.warn("brand.config.js must load before core.js"); return; }

  var page = document.body.getAttribute("data-page") || "";
  var lang = B.defaultLang;

  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  /* --- dotted paths: data-brand="tagline.en" ---------------- */
  function resolve(path) {
    return path.split(".").reduce(function (o, k) {
      return o == null ? null : o[k];
    }, B);
  }

  each("[data-brand]", function (el) {
    var v = resolve(el.getAttribute("data-brand"));
    if (v != null && typeof v !== "object") el.textContent = v;
  });

  /* --- links ------------------------------------------------ */
  each("[data-wa]", function (el) {
    el.href = B.waLink(el.getAttribute("data-wa") || ("Hi " + B.name + "! "));
    el.target = "_blank";
    el.rel = "noopener";
  });

  each("[data-ig]", function (el) {
    el.href = B.igLink();
    el.target = "_blank";
    el.rel = "noopener";
  });

  /* --- small substitutions --------------------------------- */
  each("[data-year]", function (el) { el.textContent = new Date().getFullYear(); });
  each("[data-cutoff]", function (el) { el.textContent = B.cutoffLabel[lang]; });
  each("[data-areas]", function (el) { el.textContent = B.areas.join(" \u00b7 "); });

  /* --- honesty: don't promise same-day after the cutoff ----- */
  each("[data-sameday]", function (el) {
    el.textContent = new Date().getHours() < B.cutoffHour
      ? B.cutoffLabel[lang]
      : "Ordered now \u2192 delivered tomorrow morning";
  });

  /* --- Pip is zoned ---------------------------------------- *
   * A mascot next to a wedding price list makes the shop look
   * like it is not taking the money seriously, so brand.config
   * lists the pages where Pip is allowed and everything tagged
   * data-mascot is removed everywhere else.                    */
  if (!B.showsMascot(page)) {
    each("[data-mascot]", function (el) { el.remove(); });
  }

  /* Showcase mode for the studio's own portfolio: same markup,
     no prices. Replaces the second 62 KB file in template #1. */
  if (!B.features.showPrices) {
    each("[data-price]", function (el) { el.remove(); });
  }

  /* --- toast ------------------------------------------------ */
  var toast, timer;
  window.ppToast = function (msg) {
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("toast--on");
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove("toast--on"); }, 2200);
  };
})();
