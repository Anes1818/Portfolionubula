let pending;
let scriptReady;
function loadWidget() {
  if (window.turnstile) return Promise.resolve();
  return (scriptReady ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const failed = () => {
      clearTimeout(timeout);
      script.remove();
      scriptReady = null;
      reject(Error("Human verification could not load. Please try again."));
    };
    const timeout = setTimeout(failed, 15000);
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = failed;
    document.head.append(script);
  }));
}
export function ensureHuman(config) {
  if (!config?.humanCheck?.enabled) return Promise.resolve();
  if (pending) return pending;
  pending = challenge(config).finally(() => {
    pending = null;
  });
  return pending;
}
async function challenge(config) {
  if (!config.humanCheck.siteKey)
    throw Error(
      "Human verification is being configured. Please try again later.",
    );
  await loadWidget();
  return new Promise((resolve, reject) => {
    const dialog = document.createElement("dialog");
    dialog.className = "human-check-dialog";
    dialog.innerHTML =
      '<h2>A quick security check.</h2><p>This helps protect your shop from automated spam.</p><div class="human-widget"></div><p class="helper" role="status"></p><button class="button secondary" type="button">Cancel</button>';
    document.body.append(dialog);
    let widget;
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (widget !== undefined) window.turnstile.remove(widget);
      dialog.close();
      dialog.remove();
      error ? reject(error) : resolve();
    };
    dialog.querySelector("button").onclick = () =>
      finish(Error("Human verification cancelled."));
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      finish(Error("Human verification cancelled."));
    });
    dialog.showModal();
    try {
      widget = window.turnstile.render(dialog.querySelector(".human-widget"), {
        sitekey: config.humanCheck.siteKey,
        action: "nebula_access",
        theme: "light",
        size: "flexible",
        callback: async (token) => {
          try {
            const response = await fetch("/api/human-check", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
              signal: AbortSignal.timeout(15000),
            });
            const data = await response.json();
            if (!response.ok)
              throw Error(data.error || "Human verification failed.");
            finish();
          } catch (error) {
            if (settled) return;
            dialog.querySelector("[role=status]").textContent = error.message;
            window.turnstile.reset(widget);
          }
        },
        "error-callback": () => {
          dialog.querySelector("[role=status]").textContent =
            "Verification could not complete. Check your connection and try again.";
        },
        "expired-callback": () => window.turnstile.reset(widget),
      });
    } catch (error) {
      finish(error);
    }
  });
}
