/* Petal Press — shared order desk (demo).
   Browser localStorage only. Same phone/laptop sees builder → admin.
   Swap this file later for Firebase; the order shape stays the same. */
(function () {
  "use strict";
  var KEY = "nebula_orders_v1";

  function now() { return Date.now(); }

  function loadRaw() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
  }

  function nextId(list) {
    var n = 2410;
    (list || []).forEach(function (o) {
      var m = String(o.id || "").match(/(\d+)$/);
      if (m) n = Math.max(n, parseInt(m[1], 10) + 1);
    });
    return "PP-" + n;
  }

  function seeds() {
    var t = now();
    return [
      {
        id: "PP-2408",
        createdAt: t - 12 * 60 * 1000,
        status: "requested",
        paid: false,
        customer: {
          name: "Sofia G.",
          phone: "(703) 555-0144",
          area: "Tysons, VA",
          method: "delivery",
          date: "2026-09-05",
          card: "Feliz graduación mija"
        },
        quote: { total: 286, depositPct: 50, deposit: 143, balance: 143 },
        bouquet: {
          template: "heart",
          size: "M",
          wrap: "kraft",
          wrapLabel: "Kraft Paper",
          ribbon: "blush",
          ribbonLabel: "Blush",
          noteOn: true,
          note: "Feliz graduación mija",
          stems: [
            { id: "rose_red", label: "Red Rose", count: 36, file: "rose_red.png" },
            { id: "babys_breath", label: "Baby's Breath", count: 8, file: "babys_breath.png" }
          ],
          bu: {
            rings: 3, wall: "rose_red", fill: "rose_red", center: "rose_white",
            pattern: "zones", sash: "bday", greens: true, jewel: false, choc: false
          }
        },
        recipe: "Heart buchón · M · red rose wall · birthday sash · kraft · blush bow"
      },
      {
        id: "PP-2407",
        createdAt: t - 3 * 60 * 60 * 1000,
        status: "reviewing",
        paid: false,
        customer: {
          name: "Marcus V.",
          phone: "(571) 555-0190",
          area: "Alexandria, VA",
          method: "delivery",
          date: "2026-09-02",
          card: "Happy anniversary"
        },
        quote: { total: 42, depositPct: 50, deposit: 21, balance: 21 },
        bouquet: {
          template: "classic",
          size: "Classic",
          wrap: "kraft",
          wrapLabel: "Kraft Paper",
          ribbon: "blush",
          ribbonLabel: "Blush",
          noteOn: true,
          note: "Happy anniversary",
          stems: [
            { id: "rose_pink", label: "Pink Rose", count: 4, file: "rose_pink.png" },
            { id: "eucalyptus", label: "Eucalyptus", count: 1, file: "eucalyptus.png" },
            { id: "babys_breath", label: "Baby's Breath", count: 1, file: "babys_breath.png" }
          ],
          bu: null
        },
        recipe: "Classic · 4× Pink Rose, 1× Eucalyptus, 1× Baby's Breath · kraft · blush"
      },
      {
        id: "PP-2406",
        createdAt: t - 26 * 60 * 60 * 1000,
        status: "deposit",
        paid: false,
        customer: {
          name: "Hannah L.",
          phone: "(202) 555-0162",
          area: "Washington, D.C.",
          method: "pickup",
          date: "2026-09-03",
          card: ""
        },
        quote: { total: 58, depositPct: 50, deposit: 29, balance: 29 },
        bouquet: {
          template: "classic",
          size: "Classic",
          wrap: "journal",
          wrapLabel: "Journal",
          ribbon: "sage",
          ribbonLabel: "Sage",
          noteOn: false,
          note: "",
          stems: [
            { id: "rose_white", label: "White Rose", count: 4, file: "rose_white.png" },
            { id: "tulip_white", label: "White Tulip", count: 3, file: "tulip_white.png" },
            { id: "limonium", label: "Limonium", count: 2, file: "limonium.png" }
          ],
          bu: null
        },
        recipe: "Classic · white roses & tulips · journal wrap · sage ribbon"
      }
    ];
  }

  function all() {
    var list = loadRaw();
    if (!list || !list.length) {
      list = seeds();
      save(list);
    }
    return list;
  }

  function add(order) {
    var list = all();
    if (!order.id) order.id = nextId(list);
    if (!order.createdAt) order.createdAt = now();
    list.unshift(order);
    save(list);
    return order;
  }

  function update(id, patch) {
    var list = all();
    list.forEach(function (o) {
      if (o.id === id) {
        Object.keys(patch).forEach(function (k) { o[k] = patch[k]; });
      }
    });
    save(list);
    return list;
  }

  function reset() {
    localStorage.removeItem(KEY);
    return all();
  }

  var LABELS = {
    requested: "New request",
    reviewing: "Checking cooler",
    deposit: "Ask for deposit",
    confirmed: "Locked in",
    declined: "Can't make it"
  };

  window.PPOrders = {
    all: all,
    add: add,
    update: update,
    reset: reset,
    label: function (s) { return LABELS[s] || s; },
    nextId: function () { return nextId(all()); }
  };
})();
