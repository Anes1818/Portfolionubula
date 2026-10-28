(async function () {
  "use strict";
  const cfg = window.NEBULA_PAYMENTS;
  if (!cfg?.endpoint) return;
  try {
    const response = await fetch(
      cfg.endpoint + "/v1/shops/" + cfg.shopId + "/config",
      {
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return;
    const data = await response.json();
    if (
      !data.available ||
      data.shopId !== cfg.shopId ||
      data.environment !== cfg.environment
    )
      return;
    const banner = document.querySelector(".preview-bar");
    if (banner)
      banner.textContent =
        cfg.environment === "sandbox"
          ? "Test shop · no real payments"
          : "Made personal in Winnipeg · Secure checkout with Square";
    for (const card of document.querySelectorAll(".card-bottom")) {
      card.querySelector("strong").textContent = "Priced to your design";
      card.querySelector("span").textContent =
        "See your exact total in the studio";
    }
  } catch {
    /* Keep the preview available during an outage. */
  }
})();
