(function () {
  "use strict";
  var IMG = "assets/build/";
  var selected = null;

  function money(n) { return "$" + Number(n).toFixed(0); }
  function when(ts) {
    var d = new Date(ts);
    var diff = (Date.now() - ts) / 60000;
    if (diff < 60) return Math.max(1, Math.round(diff)) + " min ago";
    if (diff < 1440) return Math.round(diff / 60) + "h ago";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  function fileUrl(f) { return IMG + encodeURIComponent(f); }

  function stemsOf(o) {
    return (o.bouquet && o.bouquet.stems) || [];
  }

  function renderList() {
    var list = PPOrders.all();
    var el = document.getElementById("ticketList");
    if (!list.length) {
      el.innerHTML = "<p class='muted'>No tickets.</p>";
      return;
    }
    if (!selected) selected = list[0].id;
    el.innerHTML = list.map(function (o) {
      var st = stemsOf(o)[0];
      var thumb = st ? fileUrl(st.file) : "";
      return '<button type="button" class="ticket-card' + (o.id === selected ? ' on' : '') + '" data-id="' + o.id + '">' +
        (thumb ? '<span class="ticket-card__ph" style="background-image:url(' + thumb + ')"></span>' : '') +
        '<span class="ticket-card__body">' +
          '<b>' + o.id + ' · ' + o.customer.name + '</b>' +
          '<small>' + when(o.createdAt) + ' · ' + o.customer.area + '</small>' +
          '<i class="status-pill status-' + o.status + '">' + PPOrders.label(o.status) + '</i>' +
        '</span>' +
        '<span class="ticket-card__amt">' + money(o.quote.total) + '</span>' +
      '</button>';
    }).join("");
    el.querySelectorAll(".ticket-card").forEach(function (b) {
      b.onclick = function () { selected = b.dataset.id; render(); };
    });
  }

  function renderDetail() {
    var o = PPOrders.all().filter(function (x) { return x.id === selected; })[0];
    var el = document.getElementById("ticketDetail");
    if (!o) { el.innerHTML = "<p class='muted'>Pick a ticket.</p>"; return; }
    var bq = o.bouquet || {};
    var stems = stemsOf(o);
    var cooler = stems.map(function (s, i) {
      var id = "c-" + o.id + "-" + i;
      return '<label class="cooler-row" for="' + id + '">' +
        '<input type="checkbox" id="' + id + '" class="cooler-box">' +
        '<img src="' + fileUrl(s.file) + '" alt="">' +
        '<span><b>' + s.count + '× ' + s.label + '</b><small>In the cooler?</small></span>' +
      '</label>';
    }).join("");

    var extras = "";
    if (bq.bu) {
      extras += '<p class="recipe-line">Buchón · ' + bq.template + ' · ' + (bq.size || "") + '</p>';
      if (bq.bu.sash) extras += '<p class="recipe-line">Sash: ' + bq.bu.sash + '</p>';
      if (bq.bu.greens) extras += '<p class="recipe-line">Greenery collar</p>';
      if (bq.bu.jewel) extras += '<p class="recipe-line">Diamond pins</p>';
    }

    var wa = "https://wa.me/" + String((window.BRAND && BRAND.whatsapp) || "15713367129").replace(/\D/g, "") +
      "?text=" + encodeURIComponent(
        "Hi " + o.customer.name + "! We can make " + o.id + " for " + o.customer.date +
        ". Quote " + money(o.quote.total) + ". To lock the date, Zelle " +
        money(o.quote.deposit) + " (50%). Then we start the flowers."
      );

    el.innerHTML =
      '<div class="detail-head">' +
        '<div><p class="kicker">' + o.id + '</p><h2 style="margin:0">' + o.customer.name + '</h2>' +
        '<p class="muted" style="margin:6px 0 0">' + o.customer.phone + ' · ' + o.customer.area + '</p></div>' +
        '<i class="status-pill status-' + o.status + '">' + PPOrders.label(o.status) + '</i>' +
      '</div>' +
      '<div class="detail-meta">' +
        '<span><b>' + (o.customer.method === "pickup" ? "Pickup" : "Delivery") + '</b><small>Method</small></span>' +
        '<span><b>' + o.customer.date + '</b><small>Needed by</small></span>' +
        '<span><b>' + money(o.quote.total) + '</b><small>Quote · not charged</small></span>' +
        '<span><b>' + money(o.quote.deposit) + '</b><small>If you say yes, 50%</small></span>' +
      '</div>' +
      '<p class="hand" style="margin:18px 0 8px">RECIPE FROM THE BUILDER</p>' +
      '<p style="margin:0 0 12px">' + (o.recipe || "") + '</p>' +
      extras +
      (bq.noteOn && bq.note ? '<p class="gift-note">💌 “' + bq.note + '”</p>' : '') +
      '<p class="hand" style="margin:22px 0 8px">COOLER CHECK</p>' +
      '<p class="muted" style="margin:0 0 10px">Tick every stem you actually have. Deposit unlocks when the cooler is honest.</p>' +
      '<div class="cooler" id="cooler">' + cooler + '</div>' +
      '<p class="cooler-gate" id="coolerGate">Ask for deposit stays locked until every stem is ticked.</p>' +
      '<div class="detail-cta">' +
        '<button type="button" class="btn-ink btn-ink--primary" id="btnYes" disabled><span class="btn-ink__frame"></span>We can make this · ask 50%</button>' +
        '<button type="button" class="btn-ink" id="btnNo"><span class="btn-ink__frame"></span>Can’t make this date</button>' +
        (o.status === "deposit" ? '<a class="btn-ink btn-ink--marker" href="' + wa + '" target="_blank" rel="noopener"><span class="btn-ink__frame"></span>WhatsApp the deposit ask</a>' : '') +
      '</div>';

    var boxes = el.querySelectorAll(".cooler-box");
    var yes = document.getElementById("btnYes");
    var gate = document.getElementById("coolerGate");
    function syncGate() {
      var ok = true;
      boxes.forEach(function (c) { if (!c.checked) ok = false; });
      if (!boxes.length) ok = true;
      yes.disabled = !ok || o.status === "declined" || o.status === "confirmed";
      gate.style.display = ok ? "none" : "block";
    }
    boxes.forEach(function (c) { c.addEventListener("change", syncGate); });
    if (o.status === "deposit" || o.status === "confirmed") {
      boxes.forEach(function (c) { c.checked = true; });
    }
    syncGate();

    yes.onclick = function () {
      PPOrders.update(o.id, { status: "deposit" });
      render();
    };
    document.getElementById("btnNo").onclick = function () {
      PPOrders.update(o.id, { status: "declined" });
      render();
    };
  }

  function render() {
    renderList();
    renderDetail();
  }

  document.getElementById("resetDemo").onclick = function () {
    PPOrders.reset();
    selected = null;
    render();
  };

  render();
})();
