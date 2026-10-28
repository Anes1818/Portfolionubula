/* Shared verified-owner session for the dashboard and bouquet studio. */
let initialization;
let currentUser = null;
let auth;
let authApi;
let publicConfig;

function requestError(message, status = 0, data = null) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  error.data = data;
  return error;
}

export async function initialize() {
  if (!initialization) {
    initialization = (async () => {
      const response = await fetch("/api/config", {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      publicConfig = await response.json();
      if (!response.ok)
        throw requestError(
          publicConfig.error || "Account setup is temporarily unavailable.",
          response.status,
          publicConfig,
        );
      if (
        !publicConfig.firebase?.apiKey ||
        !publicConfig.firebase?.authDomain ||
        !publicConfig.firebase?.projectId
      )
        throw requestError(
          "Sign-in is being connected. Your private shop will be available when account setup is ready.",
          503,
        );
      const [app, firebaseAuth] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js"),
      ]);
      authApi = firebaseAuth;
      auth = authApi.getAuth(app.initializeApp(publicConfig.firebase));
      await authApi.setPersistence(auth, authApi.browserSessionPersistence);
      await new Promise((resolve, reject) => {
        authApi.onAuthStateChanged(
          auth,
          (user) => {
            currentUser = user;
            resolve();
          },
          reject,
        );
      });
      return { auth, authApi, config: publicConfig };
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

export async function getUser() {
  await initialize();
  currentUser = auth.currentUser;
  return currentUser;
}

export async function token() {
  const user = await getUser();
  if (!user) throw requestError("Sign in to open your shop.", 401);
  if (!user.emailVerified)
    throw requestError("Verify your email before opening your shop.", 403);
  return user.getIdToken();
}

export async function refreshUser() {
  const user = await getUser();
  if (user) {
    await user.reload();
    await user.getIdToken(true);
    currentUser = auth.currentUser;
  }
  return currentUser;
}

export async function api(path, { method = "GET", body } = {}) {
  const url = new URL(path, location.origin);
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/"))
    throw requestError("This shop request has an invalid address.");
  const raw =
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body);
  const response = await fetch(url.href, {
    method,
    headers: {
      Authorization: "Bearer " + (await token()),
      ...(body !== undefined
        ? {
            "Content-Type": raw
              ? body.type || "application/octet-stream"
              : "application/json",
          }
        : {}),
    },
    ...(body !== undefined ? { body: raw ? body : JSON.stringify(body) } : {}),
    credentials: "same-origin",
    cache: "no-store",
    referrerPolicy: "same-origin",
    signal: AbortSignal.timeout(25000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw requestError(
      "The service returned an incomplete response. Please try again.",
      response.status,
    );
  }
  if (!response.ok)
    throw requestError(
      data.error || "Your changes could not be saved. Please try again.",
      response.status,
      data,
    );
  return data;
}
