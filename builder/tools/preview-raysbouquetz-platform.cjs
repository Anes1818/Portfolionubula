#!/usr/bin/env node
"use strict";

/**
 * Local interactive preview server for the pre-provisioned `raysbouquetz`
 * platform experience (http://127.0.0.1:4190).
 *
 * Pre-provisions `raysbouquetz@gmail.com` via `POST /api/admin/reservations`
 * and injects a local-only Persona Switcher toolbar so you can test:
 *   1. Ray (`raysbouquetz@gmail.com`) — claims & edits her pre-populated shop
 *   2. Public Visitor (signed out) — sees `/s/raysbouquetz` is locked/private
 *   3. Another Florist (`stranger@gmail.com`) — cannot see or claim Ray's shop
 *   4. Platform Admin (`anescareer@gmail.com`) — views `/admin` reservations
 */

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { pathToFileURL } = require("node:url");
const { buildRaysReservationSeed } = require("./import-raysbouquetz-to-platform.cjs");

const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_ROOT = path.join(ROOT, "platform/public");
const PORT = Number(process.env.PORT || 4190);

const IDENTITIES = {
  ray: {
    uid: "firebase-uid-ray",
    email: "raysbouquetz@gmail.com",
    emailVerified: true,
    label: "Ray (raysbouquetz@gmail.com)",
  },
  stranger: {
    uid: "firebase-uid-stranger",
    email: "stranger@gmail.com",
    emailVerified: true,
    label: "Other User (stranger@gmail.com)",
  },
  admin: {
    uid: "firebase-uid-admin",
    email: "anescareer@gmail.com",
    emailVerified: true,
    label: "Platform Admin (anescareer@gmail.com)",
  },
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const LOCAL_FIREBASE_AUTH_SHIM = `
const PERSONAS = {
  ray: { uid: "firebase-uid-ray", email: "raysbouquetz@gmail.com", emailVerified: true },
  stranger: { uid: "firebase-uid-stranger", email: "stranger@gmail.com", emailVerified: true },
  admin: { uid: "firebase-uid-admin", email: "anescareer@gmail.com", emailVerified: true },
};
let listener = null;
const auth = { currentUser: null };

function buildUser(key) {
  const p = PERSONAS[key];
  if (!p) return null;
  return {
    uid: p.uid,
    email: p.email,
    emailVerified: p.emailVerified,
    providerData: [{ providerId: "google.com" }],
    reload: async () => {},
    getIdToken: async () => key,
  };
}

const initialKey = sessionStorage.getItem("nebulaPreviewPersona") || "ray";
auth.currentUser = initialKey === "anon" ? null : buildUser(initialKey);

export const getAuth = () => auth;
export const browserSessionPersistence = {};
export const setPersistence = async () => {};
export const onAuthStateChanged = (_a, cb) => {
  listener = cb;
  queueMicrotask(() => cb(auth.currentUser));
  return () => {};
};
export class GoogleAuthProvider {}
export const EmailAuthProvider = { credential: () => ({}) };
export async function signInWithPopup() {
  const chosen = sessionStorage.getItem("nebulaPreviewPersona");
  const nextKey = (!chosen || chosen === "anon") ? "ray" : chosen;
  sessionStorage.setItem("nebulaPreviewPersona", nextKey);
  auth.currentUser = buildUser(nextKey);
  listener?.(auth.currentUser);
  return { user: auth.currentUser };
}
export async function signInWithEmailAndPassword(_a, email) {
  const clean = String(email || "").trim().toLowerCase();
  const nextKey = clean === "anescareer@gmail.com" ? "admin" : clean === "raysbouquetz@gmail.com" ? "ray" : "stranger";
  sessionStorage.setItem("nebulaPreviewPersona", nextKey);
  auth.currentUser = buildUser(nextKey);
  listener?.(auth.currentUser);
  return { user: auth.currentUser };
}
export async function createUserWithEmailAndPassword(_a, email) {
  return signInWithEmailAndPassword(_a, email);
}
export async function signOut() {
  sessionStorage.setItem("nebulaPreviewPersona", "anon");
  auth.currentUser = null;
  listener?.(null);
}
export const reauthenticateWithPopup = async () => ({ user: auth.currentUser });
export const reauthenticateWithCredential = async () => ({ user: auth.currentUser });
export async function sendPasswordResetEmail() {}
export async function sendEmailVerification() {}

if (typeof document !== "undefined") {
  const mountToolbar = () => {
    if (document.getElementById("nebulaPersonaBar")) return;
    const active = sessionStorage.getItem("nebulaPreviewPersona") || "ray";
    const bar = document.createElement("div");
    bar.id = "nebulaPersonaBar";
    bar.style.cssText = "position:fixed;bottom:14px;right:14px;z-index:99999;background:#1f171d;color:#fff;padding:10px 14px;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.28);font:12px/1.4 system-ui,sans-serif;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid rgba(255,255,255,.15)";
    bar.innerHTML = \`
      <strong style="color:#f4c6d3;margin-right:4px">LOCAL PREVIEW PERSONA:</strong>
      <button data-persona="ray" data-goto="/dashboard" style="padding:5px 9px;border-radius:8px;border:0;cursor:pointer;font-weight:600;background:\${active==='ray'?'#c85a70':'#382b34'};color:#fff">Ray (raysbouquetz@gmail.com)</button>
      <button data-persona="ray" data-goto="/s/raysbouquetz" style="padding:5px 9px;border-radius:8px;border:0;cursor:pointer;font-weight:600;background:#382b34;color:#f8d9e2">Ray Storefront Preview</button>
      <button data-persona="anon" data-goto="/s/raysbouquetz" style="padding:5px 9px;border-radius:8px;border:0;cursor:pointer;font-weight:600;background:\${active==='anon'?'#c85a70':'#382b34'};color:#fff">Public Visitor (Locked)</button>
      <button data-persona="stranger" data-goto="/dashboard" style="padding:5px 9px;border-radius:8px;border:0;cursor:pointer;font-weight:600;background:\${active==='stranger'?'#c85a70':'#382b34'};color:#fff">Stranger (stranger@gmail.com)</button>
      <button data-persona="admin" data-goto="/admin" style="padding:5px 9px;border-radius:8px;border:0;cursor:pointer;font-weight:600;background:\${active==='admin'?'#c85a70':'#382b34'};color:#fff">Admin (/admin)</button>
    \`;
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-persona]");
      if (!btn) return;
      sessionStorage.setItem("nebulaPreviewPersona", btn.dataset.persona);
      location.assign(btn.dataset.goto || "/dashboard");
    });
    document.body.appendChild(bar);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToolbar);
  } else {
    mountToolbar();
  }
}
`;

async function startServer() {
  const { fixture } = await import(
    pathToFileURL(path.join(ROOT, "cloudflare/platform/test/fixtures.mjs")).href
  );

  const assets = {
    fetch: async (request) => {
      const reqUrl = new URL(request.url);
      const file = path.resolve(
        PUBLIC_ROOT,
        "." + decodeURIComponent(reqUrl.pathname),
      );
      if (
        !file.startsWith(PUBLIC_ROOT + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      ) {
        return new Response("Not found", { status: 404 });
      }
      const ext = path.extname(file);
      let body = fs.readFileSync(file);
      if (path.basename(file) === "session.js") {
        const text = body
          .toString("utf8")
          .replace(
            "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js",
            "/__local_firebase_app.js",
          )
          .replace(
            "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js",
            "/__local_firebase_auth.js",
          );
        body = Buffer.from(text, "utf8");
      }
      return new Response(body, {
        headers: {
          "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        },
      });
    },
  };

  const f = fixture({
    env: {
      ASSETS: assets,
      ENVIRONMENT: "local",
      PUBLIC_ORIGIN: `http://127.0.0.1:${PORT}`,
      CANONICAL_ORIGIN: `http://127.0.0.1:${PORT}`,
      PUBLIC_SIGNUPS: "true",
      BETA_ACCESS_EMAILS: "anescareer@gmail.com,raysbouquetz@gmail.com",
      MANUAL_ACTIVATION_ENABLED: "true",
      PUBLISHING_ENABLED: "true",
    },
    verifyIdentity: async (token) => {
      const nowSec = Math.floor(Date.now() / 1000);
      const identity = IDENTITIES[token];
      if (!identity) throw new Error("Invalid session token");
      return {
        uid: identity.uid,
        email: identity.email,
        emailVerified: identity.emailVerified,
        authTime: nowSec - 5,
      };
    },
    verifyAdmin: async (user) => user.uid === IDENTITIES.admin.uid,
  });

  // Pre-seed Ray's shop reservation via POST /api/admin/reservations
  const { payload } = await buildRaysReservationSeed();
  const seedRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "admin",
    from: `http://127.0.0.1:${PORT}`,
    body: payload,
  });
  if (seedRes.status !== 201 && seedRes.status !== 200) {
    throw new Error(
      `Failed to seed raysbouquetz reservation: ${seedRes.status} ${await seedRes.text()}`,
    );
  }
  const seeded = await seedRes.json();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      if (url.pathname === "/__local_firebase_app.js") {
        res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
        res.end("export const initializeApp = (c) => c;\n");
        return;
      }
      if (url.pathname === "/__local_firebase_auth.js") {
        res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
        res.end(LOCAL_FIREBASE_AUTH_SHIM);
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const response = await f.handler(
        new Request(url, {
          method: req.method,
          headers: req.headers,
          ...(["GET", "HEAD"].includes(req.method)
            ? {}
            : { body: Buffer.concat(chunks) }),
        }),
        f.env,
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(error.stack || String(error));
    }
  });

  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  console.log(
    JSON.stringify(
      {
        ok: true,
        previewUrl: `http://127.0.0.1:${PORT}/s/raysbouquetz`,
        dashboardUrl: `http://127.0.0.1:${PORT}/dashboard`,
        editorUrl: `http://127.0.0.1:${PORT}/dashboard/editor`,
        adminUrl: `http://127.0.0.1:${PORT}/admin`,
        reservedShopId: seeded.shop.id,
        reservedEmail: seeded.reservation.email,
      },
      null,
      2,
    ),
  );
}

startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
