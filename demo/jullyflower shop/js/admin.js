(function () {
  "use strict";

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function money(n) {
    return "$" + Number(n || 0).toFixed(0);
  }

  function when(ts) {
    var diff = (Date.now() - ts) / 60000;
    if (diff < 60) return Math.max(1, Math.round(diff)) + " min ago";
    if (diff < 1440) return Math.round(diff / 60) + "h ago";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function prettyDate(iso) {
    if (!iso) return "TBD";
    var p = String(iso).split("-");
    if (p.length !== 3) return iso;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function photoSrc(o) {
    return (o.bouquet && o.bouquet.image) || "";
  }

  function photoTag(o) {
    var src = photoSrc(o);
    if (!src) return '<div class="ticket__photo placeholder">No photo yet</div>';
    var safe = src.indexOf("data:") === 0 ? src : esc(src);
    return '<img class="ticket__photo" src="' + safe + '" alt="' + esc(o.bouquet.title || "Bouquet") + '">';
  }

  var viewer = document.getElementById("viewer");
  var viewerImg = document.getElementById("viewerImg");
  var viewerCap = document.getElementById("viewerCap");

  function openViewer(src, title) {
    if (!src || !viewer) return;
    viewerImg.src = src;
    viewerImg.alt = title || "Bouquet";
    viewerCap.textContent = title || "Bouquet";
    viewer.hidden = false;
    viewer.classList.add("on");
  }

  function closeViewer() {
    if (!viewer) return;
    viewer.classList.remove("on");
    viewer.hidden = true;
    viewerImg.removeAttribute("src");
  }

  function render() {
    var list = PPOrders.all();
    var el = document.getElementById("orderList");
    if (!list.length) {
      el.innerHTML = "<p class='empty'>No orders yet.</p>";
      return;
    }
    el.innerHTML = list.map(function (o) {
      var tel = PPOrders.tel(o.customer.phone);
      var ready = o.status === "ready";
      var src = photoSrc(o);
      return (
        '<article class="ticket" data-id="' + esc(o.id) + '">' +
          photoTag(o) +
          '<div class="ticket__body">' +
            '<div class="ticket__top">' +
              '<span>' + esc(o.id) + '</span>' +
              '<span>' + when(o.createdAt) + '</span>' +
            '</div>' +
            '<h2>' + esc(o.customer.name) + '</h2>' +
            '<p class="ticket__phone">' + esc(o.customer.phone || "No phone") + '</p>' +
            '<p class="ticket__bq">' + esc(o.bouquet.title || "Custom ramo") + '</p>' +
            (o.bouquet.note ? '<p class="ticket__note">' + esc(o.bouquet.note) + '</p>' : '') +
            '<div class="ticket__meta">' +
              '<span><small>Pickup</small><b>' + prettyDate(o.customer.date) + '</b></span>' +
              '<span><small>Total</small><b>' + money(o.quote.total) + '</b></span>' +
            '</div>' +
            '<div class="ticket__status" role="group" aria-label="Order status">' +
              '<button type="button" class="chip' + (!ready ? ' on' : '') + '" data-status="confirmed">Confirmed</button>' +
              '<button type="button" class="chip' + (ready ? ' on' : '') + '" data-status="ready">Ready</button>' +
            '</div>' +
            '<div class="ticket__actions">' +
              (src ? '<button type="button" class="view" data-view>View bouquet</button>' : '') +
              (tel ? '<a class="call" href="' + tel + '">Call ' + esc(o.customer.phone) + '</a>' : '') +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join("");

    el.querySelectorAll(".ticket").forEach(function (card) {
      var id = card.getAttribute("data-id");
      card.querySelectorAll("[data-status]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          PPOrders.update(id, { status: btn.getAttribute("data-status") });
          render();
        });
      });
      function show() {
        var order = PPOrders.all().filter(function (x) { return x.id === id; })[0];
        if (order) openViewer(photoSrc(order), order.bouquet.title || "Bouquet");
      }
      var viewBtn = card.querySelector("[data-view]");
      if (viewBtn) viewBtn.addEventListener("click", show);
      var photo = card.querySelector(".ticket__photo");
      if (photo && photo.tagName === "IMG") {
        photo.style.cursor = "pointer";
        photo.addEventListener("click", show);
      }
    });
  }

  document.getElementById("viewerClose").addEventListener("click", closeViewer);
  viewer.addEventListener("click", function (e) {
    if (e.target === viewer) closeViewer();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeViewer();
  });

  render();
})();
