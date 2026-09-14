/* Petal Press — shared order desk (demo).
   Browser localStorage only. Same phone/laptop sees builder → admin.
   Swap this file later for Firebase; the order shape stays the same. */
(function () {
  "use strict";
  var KEY = "ramos_by_julia_orders_v1";

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
    var n = 104;
    (list || []).forEach(function (o) {
      var m = String(o.id || "").match(/(\d+)$/);
      if (m) n = Math.max(n, parseInt(m[1], 10) + 1);
    });
    return "RJ-" + n;
  }

  function seeds() {
    var t = now();
    return [
      {
        id: "RJ-103",
        createdAt: t - 14 * 60 * 1000,
        status: "requested",
        paid: false,
        customer: {
          name: "Sofia G.",
          phone: "(503) 555-0144",
          area: "Gresham, OR",
          method: "pickup",
          date: "2026-09-18",
          card: "Feliz cumpleaños mamá hermosa"
        },
        quote: { total: 125, depositPct: 50, deposit: 65, balance: 60 },
        bouquet: {
          template: "heart",
          size: "50 Roses",
          wrap: "kraft",
          wrapLabel: "Black & Gold Wrap",
          ribbon: "gold",
          ribbonLabel: "Gold Satin",
          noteOn: true,
          note: "Feliz cumpleaños mamá hermosa",
          stems: [
            { id: "rose_red", label: "Red Fresh Rose", count: 50, file: "rose_red.png" },
            { id: "babys_breath", label: "Baby's Breath Rim", count: 1, file: "babys_breath.png" }
          ],
          bu: {
            rings: 3, wall: "rose_red", fill: "rose_red", center: "rose_white",
            pattern: "zones", sash: "bday", greens: true, jewel: true, choc: true
          }
        },
        recipe: "Heart Buchón · 50 Red Roses · Gold Crown · Baby's Breath · Custom sash 'Feliz Cumpleaños' · Pickup Gresham (Zelle)"
      },
      {
        id: "RJ-102",
        createdAt: t - 3 * 60 * 60 * 1000,
        status: "reviewing",
        paid: true,
        customer: {
          name: "Marcus V.",
          phone: "(503) 555-0190",
          area: "Rockwood, OR",
          method: "pickup",
          date: "2026-09-17",
          card: "Happy anniversary mi amor"
        },
        quote: { total: 70, depositPct: 50, deposit: 35, balance: 35 },
        bouquet: {
          template: "round",
          size: "25 Roses",
          wrap: "kraft",
          wrapLabel: "Frosted Blush",
          ribbon: "blush",
          ribbonLabel: "Blush Pink",
          noteOn: true,
          note: "Happy anniversary mi amor",
          stems: [
            { id: "rose_pink", label: "Pink Fresh Rose", count: 25, file: "rose_pink.png" }
          ],
          bu: {
            rings: 2, wall: "rose_pink", fill: "rose_pink", center: "rose_white",
            pattern: "zones", sash: "love", greens: false, jewel: false, choc: true
          }
        },
        recipe: "Round Buchón · 25 Pink Roses · 3D Gold Butterflies · Custom sash 'Te Amo' · Pickup Rockwood (Cash App)"
      },
      {
        id: "RJ-101",
        createdAt: t - 22 * 60 * 60 * 1000,
        status: "completed",
        paid: true,
        customer: {
          name: "Elena M.",
          phone: "(503) 555-0162",
          area: "Portland, OR",
          method: "pickup",
          date: "2026-09-15",
          card: "Para la más hermosa"
        },
        quote: { total: 220, depositPct: 50, deposit: 110, balance: 110 },
        bouquet: {
          template: "round",
          size: "100 Roses",
          wrap: "journal",
          wrapLabel: "Black Luxury Wrap",
          ribbon: "gold",
          ribbonLabel: "Gold Satin",
          noteOn: false,
          note: "",
          stems: [
            { id: "rose_red", label: "100 Grand Roses", count: 100, file: "rose_red.png" }
          ],
          bu: {
            rings: 5, wall: "rose_red", fill: "rose_red", center: "rose_white",
            pattern: "zones", sash: "love", greens: true, jewel: true, choc: true
          }
        },
        recipe: "Grand 100-Rose Buchón · Luxury Large Crown · Gold Butterflies · Pickup Gresham (Zelle)"
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
