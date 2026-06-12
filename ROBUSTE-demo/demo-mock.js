/* ROBUSTE - DEMO MOCK BACKEND
   Replaces ALL real backend services for the public portfolio demo:
     - Firebase (Firestore + Auth) -> in-browser store backed by localStorage
     - EmailJS                     -> no-op that always "succeeds"
     - Google Analytics (gtag)     -> no-op (no real tracking)
   No real API keys, tokens, or network calls ship in the demo build.
   The API surface mirrors firebase-compat so original site code runs unchanged. */
(function () {
  "use strict";
  var STORE_KEY = "robuste_demo_db_v1";

  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function save(db) { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) {} }
  function coll(db, name) { if (!db[name]) db[name] = {}; return db[name]; }
  function genId() { return "demo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function resolve(v) { return Promise.resolve(v); }

  function makeDoc(id, data) { return { id: id, exists: true, data: function () { return data; } }; }
  function makeSnap(docs) {
    return { docs: docs, size: docs.length, empty: docs.length === 0,
      forEach: function (fn) { for (var i = 0; i < docs.length; i++) fn(docs[i]); } };
  }

  function makeQuery(collName, filters, limitN) {
    filters = filters || [];
    return {
      where: function (field, op, val) { return makeQuery(collName, filters.concat([[field, op, val]]), limitN); },
      orderBy: function () { return makeQuery(collName, filters, limitN); },
      limit: function (n) { return makeQuery(collName, filters, n); },
      get: function () {
        var db = load(), c = coll(db, collName), docs = [];
        Object.keys(c).forEach(function (id) {
          var data = c[id], ok = true;
          for (var i = 0; i < filters.length; i++) {
            var f = filters[i], cur = data[f[0]];
            if (f[1] === "==" && cur !== f[2]) ok = false;
            if (f[1] === "!=" && cur === f[2]) ok = false;
          }
          if (ok) docs.push(makeDoc(id, data));
        });
        if (typeof limitN === "number") docs = docs.slice(0, limitN);
        return resolve(makeSnap(docs));
      }
    };
  }

  function makeCollection(collName) {
    var q = makeQuery(collName, [], undefined);
    q.add = function (obj) {
      var db = load(), c = coll(db, collName), id = genId();
      c[id] = JSON.parse(JSON.stringify(obj || {})); save(db); return resolve({ id: id });
    };
    q.doc = function (id) {
      return {
        id: id,
        get: function () {
          var db = load(), c = coll(db, collName);
          return resolve(c[id] ? makeDoc(id, c[id]) : { id: id, exists: false, data: function () { return undefined; } });
        },
        set: function (obj) { var db = load(), c = coll(db, collName); c[id] = JSON.parse(JSON.stringify(obj || {})); save(db); return resolve(); },
        update: function (obj) { var db = load(), c = coll(db, collName); c[id] = Object.assign({}, c[id] || {}, obj); save(db); return resolve(); },
        delete: function () { var db = load(), c = coll(db, collName); delete c[id]; save(db); return resolve(); }
      };
    };
    return q;
  }

  var DEMO_USER = { uid: "demo-admin", email: "demo@robuste.store", displayName: "Demo Admin" };
  var authState = { user: DEMO_USER, listeners: [] };
  function notifyAuth() { authState.listeners.forEach(function (cb) { try { cb(authState.user); } catch (e) {} }); }
  function makeAuth() {
    return {
      get currentUser() { return authState.user; },
      onAuthStateChanged: function (cb) { authState.listeners.push(cb); setTimeout(function () { try { cb(authState.user); } catch (e) {} }, 0); return function () {}; },
      signInWithEmailAndPassword: function () { authState.user = DEMO_USER; notifyAuth(); return resolve({ user: DEMO_USER }); },
      signOut: function () { authState.user = null; notifyAuth(); return resolve(); }
    };
  }

  var _db = { collection: function (name) { return makeCollection(name); } };
  var _auth = makeAuth();
  window.firebase = {
    apps: [],
    initializeApp: function () { if (!this.apps.length) this.apps.push({ name: "[DEFAULT]" }); return this.apps[0]; },
    firestore: function () { return _db; },
    auth: function () { return _auth; }
  };
  window.firebase.firestore.FieldValue = { serverTimestamp: function () { return new Date().toISOString(); } };
  window.firebase.firestore.Timestamp = { now: function () { return { toDate: function () { return new Date(); }, seconds: Math.floor(Date.now() / 1000) }; } };

  window.emailjs = {
    init: function () {},
    send: function () { return resolve({ status: 200, text: "OK (demo)" }); },
    sendForm: function () { return resolve({ status: 200, text: "OK (demo)" }); }
  };

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") { window.gtag = function () {}; }

  window.ROBUSTE_DEMO = window.ROBUSTE_DEMO || {};
  window.ROBUSTE_DEMO.mock = true;
  window.ROBUSTE_DEMO.resetData = function () { try { localStorage.removeItem(STORE_KEY); } catch (e) {} };

  (function seed() {
    var db = load();
    if (db.__seeded) return;
    var orders = coll(db, "orders"), reviews = coll(db, "reviews");
    var WILAYAS = ["\u0627\u0644\u062c\u0632\u0627\u0626\u0631", "\u0648\u0647\u0631\u0627\u0646", "\u0642\u0633\u0646\u0637\u064a\u0646\u0629", "\u0633\u0637\u064a\u0641", "\u0639\u0646\u0627\u0628\u0629", "\u0627\u0644\u0628\u0644\u064a\u062f\u0629", "\u062a\u064a\u0632\u064a \u0648\u0632\u0648", "\u0628\u0627\u062a\u0646\u0629"];
    var NAMES = ["\u0623\u0645\u064a\u0646 \u0628.", "\u0633\u0627\u0631\u0629 \u0645.", "\u064a\u0648\u0633\u0641 \u062d.", "\u0646\u0633\u0631\u064a\u0646 \u0639.", "\u0643\u0631\u064a\u0645 \u0628.", "\u0644\u064a\u0644\u0649 \u0635.", "\u0631\u0636\u0627 \u0645.", "\u0647\u062f\u0649 \u0628.", "\u0633\u0641\u064a\u0627\u0646 \u0637.", "\u0645\u0631\u064a\u0645 \u0632.", "\u0628\u0644\u0627\u0644 \u0634.", "\u0625\u064a\u0645\u0627\u0646 \u0642."];
    var PRODUCTS = [
      { name: "SECHE CHEVEUX PRO2000", price: 4200 },
      { name: "LISSEUR CHEVEUX SW 207", price: 4100 },
      { name: "ROBOT PATISSIER 1500W", price: 18900 },
      { name: "FRITEUSE SANS HUILE 5L", price: 12500 },
      { name: "MIXEUR PLONGEANT 800W", price: 3600 },
      { name: "ASPIRATEUR BALAI 2EN1", price: 9800 }
    ];
    var STATUSES = ["\u062c\u062f\u064a\u062f", "\u0645\u0624\u0643\u062f", "\u0642\u064a\u062f \u0627\u0644\u062a\u062d\u0636\u064a\u0631", "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645", "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645", "\u0645\u0644\u063a\u0649"];
    function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
    for (var i = 0; i < 14; i++) {
      var p = PRODUCTS[i % PRODUCTS.length], qty = 1 + (i % 3), id = "demo-seed-" + (1000 + i);
      orders[id] = {
        customer: NAMES[i % NAMES.length],
        phone: "0" + (550000000 + Math.floor(Math.random() * 49999999)),
        wilaya: WILAYAS[i % WILAYAS.length],
        address: "\u062d\u064a " + (i + 1) + "\u060c \u0634\u0627\u0631\u0639 \u0627\u0644\u0627\u0633\u062a\u0642\u0644\u0627\u0644",
        products: [{ name: p.name, price: p.price, quantity: qty }],
        totalPrice: p.price * qty,
        payment: "\u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645",
        status: STATUSES[i % STATUSES.length],
        archived: false,
        timestamp: daysAgo(i),
        createdAt: daysAgo(i)
      };
    }
    var RV = [
      { name: "\u0623\u0645\u064a\u0646\u0629 \u0643.", rating: 5, comment: "\u0645\u0646\u062a\u062c \u0631\u0627\u0626\u0639 \u0648\u062c\u0648\u062f\u0629 \u0645\u0645\u062a\u0627\u0632\u0629!", productId: 1 },
      { name: "\u0645\u062d\u0645\u062f \u0644.", rating: 4, comment: "\u0633\u0639\u0631 \u0645\u0646\u0627\u0633\u0628 \u0648\u0627\u0644\u062e\u062f\u0645\u0629 \u0645\u062d\u062a\u0631\u0645\u0629.", productId: 1 },
      { name: "\u0641\u0627\u0637\u0645\u0629 \u0632.", rating: 5, comment: "\u062a\u0639\u0627\u0645\u0644 \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u060c \u0623\u0646\u0635\u062d \u0628\u0647\u0645.", productId: 3 }
    ];
    for (var r = 0; r < RV.length; r++) {
      reviews["demo-rev-" + r] = Object.assign({ status: "\u062c\u062f\u064a\u062f", timestamp: daysAgo(r) }, RV[r]);
    }
    db.__seeded = true; save(db);
  })();
})();
