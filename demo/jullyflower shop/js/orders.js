/* Ramos by Julia — local order list for the demo desk. */
(function () {
  "use strict";
  var KEY = "ramos_by_julia_orders_v4";

  function loadRaw() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
  }

  function digits(phone) {
    return String(phone || "").replace(/\D/g, "");
  }

  function bouquetOf(o) {
    var b = (o && o.bouquet) || {};
    return {
      title: b.title || b.size || "Custom ramo",
      note: b.note || b.orderNotes || (o.customer && o.customer.specialRequests) || "",
      image: b.image || "",
      template: b.template || "",
      size: b.size || ""
    };
  }

  function normalize(order) {
    var o = order || {};
    var status = o.status === "ready" ? "ready" : "confirmed";
    return {
      id: o.id || "RJ-100",
      createdAt: o.createdAt || Date.now(),
      status: status,
      customer: {
        name: (o.customer && o.customer.name) || "Customer",
        phone: (o.customer && o.customer.phone) || "",
        date: (o.customer && o.customer.date) || ""
      },
      quote: { total: (o.quote && o.quote.total) || 0 },
      bouquet: bouquetOf(o)
    };
  }

  function seeds() {
    var t = Date.now();
    return [
      {
        id: "RJ-105",
        createdAt: t - 12 * 60 * 1000,
        status: "confirmed",
        customer: { name: "Ana R.", phone: "(503) 555-0177", date: "2026-09-19" },
        quote: { total: 73 },
        bouquet: {
          title: "Custom dome · 30 red roses",
          note: "Built in the studio",
          image: "assets/bouquets/studio-dome.jpg",
          template: "dome",
          size: "30 stems"
        }
      },
      {
        id: "RJ-104",
        createdAt: t - 40 * 60 * 1000,
        status: "confirmed",
        customer: { name: "Sofia G.", phone: "(503) 555-0144", date: "2026-09-18" },
        quote: { total: 125 },
        bouquet: {
          title: "50 White Roses · Día De Las Madres",
          note: "Feliz cumpleaños mamá",
          image: "assets/bouquets/julia_50_madres.jpg"
        }
      },
      {
        id: "RJ-103",
        createdAt: t - 5 * 60 * 60 * 1000,
        status: "ready",
        customer: { name: "Marcus V.", phone: "(503) 555-0190", date: "2026-09-17" },
        quote: { total: 60 },
        bouquet: {
          title: "25 Pink Roses",
          note: "",
          image: "assets/bouquets/b4.jpg"
        }
      }
    ].map(normalize);
  }

  function all() {
    var list = loadRaw();
    if (!list || !list.length) {
      list = seeds();
      save(list);
    }
    return list.map(normalize);
  }

  function nextId(list) {
    var n = 105;
    (list || []).forEach(function (o) {
      var m = String(o.id || "").match(/(\d+)$/);
      if (m) n = Math.max(n, parseInt(m[1], 10) + 1);
    });
    return "RJ-" + n;
  }

  function add(order) {
    var list = all();
    var row = normalize(order);
    if (!order.id) row.id = nextId(list);
    list.unshift(row);
    save(list);
    return list[0];
  }

  function update(id, patch) {
    var list = all().map(function (o) {
      if (o.id !== id) return o;
      var next = Object.assign({}, o, patch);
      if (patch.customer) next.customer = Object.assign({}, o.customer, patch.customer);
      if (patch.bouquet) next.bouquet = Object.assign({}, o.bouquet, patch.bouquet);
      if (patch.quote) next.quote = Object.assign({}, o.quote, patch.quote);
      return normalize(next);
    });
    save(list);
    return list;
  }

  window.PPOrders = {
    KEY: KEY,
    all: all,
    add: add,
    update: update,
    digits: digits,
    tel: function (phone) {
      var d = digits(phone);
      if (d.length < 10) return "";
      if (d.length === 10) return "tel:+1" + d;
      return "tel:+" + d;
    }
  };
})();
