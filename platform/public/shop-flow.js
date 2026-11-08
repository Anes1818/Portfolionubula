const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const mainNavigation = [
  ["/dashboard", "Home", "home"],
  ["/dashboard/collection", "Bouquet builder", "bouquet"],
  ["/dashboard/orders", "Orders", "orders"],
  ["/dashboard/editor", "Store design", "shop"],
  ["/dashboard/shop", "Settings", "settings"],
];
const catalogueRoutes = [
  "/dashboard/products",
  "/dashboard/collection",
  "/dashboard/prices",
];
const settingsRoutes = [
  "/dashboard/shop",
  "/dashboard/payments",
  "/dashboard/billing",
];
export function activeNavigation(path) {
  return catalogueRoutes.includes(path)
    ? "/dashboard/collection"
    : settingsRoutes.includes(path)
      ? "/dashboard/shop"
      : path;
}
export function subNavigation(path, setup = false) {
  const links = catalogueRoutes.includes(path)
    ? [
        ["/dashboard/collection", "Your six bouquets"],
        ["/dashboard/prices", "Builder flowers & prices"],
        ["/dashboard/products", "Gifts & fixed products"],
      ]
    : settingsRoutes.includes(path)
      ? [
          ["/dashboard/shop", "Shop details"],
          ["/dashboard/payments", "Orders, payment & delivery"],
          ["/dashboard/billing", "Plan & publishing"],
        ]
      : [];
  return links.length
    ? `<nav class="workspace-subnav" aria-label="${catalogueRoutes.includes(path) ? "Bouquet" : "Setting"} pages">${links.map(([href, label]) => `<a href="${href}${setup ? "?setup=1" : ""}" data-nav ${path === href ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav>`
    : "";
}
export function setupProgress(path) {
  const step =
    path === "/dashboard/shop"
      ? 1
      : catalogueRoutes.includes(path)
        ? 2
        : path === "/dashboard/payments"
          ? 3
          : 4;
  const steps = [
    ["/dashboard/shop", "See my shop"],
    ["/dashboard/collection", "First bouquet"],
    ["/dashboard/payments", "Receive orders"],
    ["/dashboard/billing", "Activate & open"],
  ];
  return `<section class="setup-progress" aria-label="Shop setup"><div><p class="eyebrow">YOUR SHOP SETUP · STEP ${step} OF 4</p><a class="plain-button" href="/dashboard" data-nav>Finish later ↗</a></div><ol>${steps.map(([href, label], i) => `<li><a href="${href}?setup=1" data-nav ${i + 1 === step ? 'aria-current="step"' : ""}><span>${i + 1}</span>${label}</a></li>`).join("")}</ol><p class="helper">Your edits are saved as a private draft. One complete bouquet is enough to open. Extra products are optional.</p></section>`;
}
export function setupFooter(path) {
  const step =
    path === "/dashboard/shop"
      ? 1
      : catalogueRoutes.includes(path)
        ? 2
        : path === "/dashboard/payments"
          ? 3
          : 4;
  const next = [
    null,
    "/dashboard/collection?setup=1",
    "/dashboard/payments?setup=1",
    "/dashboard/billing?setup=1",
  ];
  return `<div class="setup-next"><a class="button secondary" href="/s/" data-owner-preview>Preview my shop ↗</a>${step < 4 ? `<a class="button" href="${next[step]}" data-nav>Save & continue →</a>` : ""}</div>`;
}
// ISO region codes; display names come from the browser's international data.
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
export const countries = [
  ["", "Choose country"],
  ..."AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
    .split(" ")
    .map((code) => [code, regionNames.of(code)])
    .sort((a, b) => a[1].localeCompare(b[1], "en")),
];
export function countryOptions(selected = "") {
  return countries
    .map(
      ([code, name]) =>
        `<option value="${code}" ${selected === code ? "selected" : ""}>${esc(name)}</option>`,
    )
    .join("");
}
export function localeFields(value, prefix = "data-path") {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC"];
  return `<label class="field">Shop country<select ${prefix}="country">${countries.map(([code, name]) => `<option value="${code}" ${value.country === code ? "selected" : ""}>${name}</option>`).join("")}${value.country && !countries.some(([code]) => code === value.country) ? `<option selected value="${esc(value.country)}">${esc(value.country)}</option>` : ""}</select></label><label class="field">Shop time zone<input ${prefix}="timeZone" list="shopTimeZones" value="${esc(value.timeZone || "UTC")}" maxlength="80" required autocomplete="off"><span class="helper">Use the shop’s local time zone for order dates and preparation times.</span></label><datalist id="shopTimeZones"><option value="UTC">${zones.map((zone) => `<option value="${esc(zone)}">`).join("")}</datalist>`;
}
