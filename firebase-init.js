/*
 * firebase-init.js — SINGLE Firebase initialization for the whole site.
 * --------------------------------------------------------------------
 * WHY THIS EXISTS:
 *   Before this, the SAME Firebase config + initializeApp() call was copy-
 *   pasted into main.js, product.html, and admin.html (plus a dead app.js).
 *   Four copies of one config = four places to update and an easy way to
 *   drift out of sync. A professional template has ONE init.
 *
 * HOW TO USE:
 *   Load this file AFTER the firebase-*-compat SDK scripts and BEFORE any
 *   page script that talks to Firestore/Auth. It exposes:
 *     window.db             -> Firestore handle (pages that load the firestore SDK)
 *     window.auth           -> Auth handle (only admin.html loads the auth SDK)
 *     window.firebaseConfig -> the single config object
 *
 * SECURITY NOTE (revisited in Phase 10):
 *   A Firebase web config is NOT a private secret — it is safe in the client.
 *   What actually protects your data is Firestore Security Rules, which we will
 *   harden later. (The Telegram bot token in telegram.js, by contrast, IS a real
 *   secret and must move server-side.)
 */
(function (global) {
  'use strict';

  var firebaseConfig = {
    apiKey: "AIzaSyBTrnKCYOtfSSDYtmVQbzP2HcwgkLT565Y",
    authDomain: "robuste-c8e0f.firebaseapp.com",
    projectId: "robuste-c8e0f",
    storageBucket: "robuste-c8e0f.appspot.com",
    messagingSenderId: "975609984963",
    appId: "1:975609984963:web:a481efb493a88d7bc7af76",
    measurementId: "G-DWT7MZN028"
  };

  global.firebaseConfig = firebaseConfig;

  if (typeof firebase === 'undefined' || !firebase.initializeApp) {
    console.error('[firebase-init] Firebase SDK must load before firebase-init.js');
    return;
  }

  try {
    // Idempotent: initialize only once, even if included on several pages.
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (e) {
    console.error('[firebase-init] initializeApp failed', e);
  }

  // Expose shared handles. Guarded because not every page loads every SDK
  // (for example, only admin.html loads the Auth SDK).
  try { global.db = firebase.firestore(); } catch (e) { global.db = global.db || null; }
  try { if (firebase.auth) global.auth = firebase.auth(); } catch (e) {}
})(window);
