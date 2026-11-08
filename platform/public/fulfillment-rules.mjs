// Shared, deterministic rules. The server independently applies these before quoting.
export const emptyFulfillmentRules = () => ({
  calendarEnabled: false,
  closedWeekdays: [],
  closedDates: [],
  leadHours: 0,
  sameDayCutoff: "",
  enforceDeliveryZones: false,
  deliveryZones: [],
});
const validDate = (date) =>
  typeof date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date + "T12:00:00Z")) &&
  new Date(date + "T12:00:00Z").toISOString().slice(0, 10) === date;
const postcode = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
export function normalizeFulfillmentRules(input) {
  if (input != null && (typeof input !== "object" || Array.isArray(input)))
    throw Error("Review delivery zones and the preparation calendar.");
  const r = { ...emptyFulfillmentRules(), ...(input || {}) };
  const fail = () => {
    throw Error("Review delivery zones and the preparation calendar.");
  };
  if (
    typeof r.calendarEnabled !== "boolean" ||
    typeof r.enforceDeliveryZones !== "boolean" ||
    !Array.isArray(r.closedWeekdays) ||
    r.closedWeekdays.length > 7 ||
    r.closedWeekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    !Array.isArray(r.closedDates) ||
    r.closedDates.length > 90 ||
    r.closedDates.some((d) => !validDate(d)) ||
    !Number.isInteger(r.leadHours) ||
    r.leadHours < 0 ||
    r.leadHours > 720 ||
    typeof r.sameDayCutoff !== "string" ||
    (r.sameDayCutoff && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.sameDayCutoff)) ||
    !Array.isArray(r.deliveryZones) ||
    r.deliveryZones.length > 10
  )
    fail();
  const ids = new Set();
  r.deliveryZones = r.deliveryZones.map((zone) => {
    if (
      !zone ||
      typeof zone.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,40}$/.test(zone.id) ||
      ids.has(zone.id) ||
      typeof zone.name !== "string" ||
      !zone.name.trim() ||
      zone.name.length > 60 ||
      !Array.isArray(zone.postcodes) ||
      !zone.postcodes.length ||
      zone.postcodes.length > 50 ||
      !Number.isSafeInteger(zone.feeCents) ||
      zone.feeCents < 0 ||
      zone.feeCents > 10000000
    )
      fail();
    ids.add(zone.id);
    const postcodes = zone.postcodes.map((code) => {
      if (typeof code !== "string" || code.length > 20) fail();
      const normalized = postcode(code);
      if (!/^[A-Z0-9]{2,16}\*?$/.test(normalized)) fail();
      return normalized;
    });
    return {
      id: zone.id,
      name: zone.name.trim(),
      postcodes: [...new Set(postcodes)],
      feeCents: zone.feeCents,
    };
  });
  return {
    calendarEnabled: r.calendarEnabled,
    closedWeekdays: [...new Set(r.closedWeekdays)],
    closedDates: [...new Set(r.closedDates)],
    leadHours: r.leadHours,
    sameDayCutoff: r.sameDayCutoff,
    enforceDeliveryZones: r.enforceDeliveryZones,
    deliveryZones: r.deliveryZones,
  };
}
export function localDateTime(now = Date.now(), timeZone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function checkFulfillment({
  rules,
  method,
  customer = {},
  timeZone = "UTC",
  country = "",
  deliveryCents = 0,
  now = Date.now(),
}) {
  const r = normalizeFulfillmentRules(rules);
  if (r.calendarEnabled) {
    if (!validDate(customer.date))
      return {
        ok: false,
        error: "Choose an available pickup or delivery date.",
      };
    const local = localDateTime(now, timeZone),
      earliest = localDateTime(now + r.leadHours * 3600000, timeZone).date;
    if (customer.date < earliest)
      return {
        ok: false,
        error:
          "This date does not allow enough preparation time. Choose a later date.",
      };
    const weekday = new Date(customer.date + "T12:00:00Z").getUTCDay();
    if (
      r.closedWeekdays.includes(weekday) ||
      r.closedDates.includes(customer.date)
    )
      return {
        ok: false,
        error:
          "The shop is closed for orders on this date. Choose another date.",
      };
    if (
      customer.date === local.date &&
      r.sameDayCutoff &&
      local.time >= r.sameDayCutoff
    )
      return {
        ok: false,
        error: "The shop’s same-day cutoff has passed. Choose a later date.",
      };
  }
  if (method !== "delivery") return { ok: true, deliveryCents: 0, zone: null };
  if (!r.enforceDeliveryZones) return { ok: true, deliveryCents, zone: null };
  if (country && customer.country !== country)
    return {
      ok: false,
      error: "Delivery is available only within the shop’s country.",
    };
  const code = postcode(customer.postalCode);
  if (!/^[A-Z0-9]{2,16}$/.test(code))
    return {
      ok: false,
      error: "Enter the recipient’s postal code to check delivery.",
    };
  // More specific matching rules win. Equal-specificity overlaps use the first zone.
  let selected = null,
    specificity = -1;
  for (const zone of r.deliveryZones)
    for (const pattern of zone.postcodes) {
      const prefix = pattern.endsWith("*"),
        match = prefix
          ? code.startsWith(pattern.slice(0, -1))
          : code === pattern;
      const score = prefix ? pattern.length - 1 : 100 + pattern.length;
      if (match && score > specificity) {
        selected = zone;
        specificity = score;
      }
    }
  if (!selected)
    return {
      ok: false,
      error:
        "This address is outside the shop’s delivery areas. Choose pickup or contact the florist.",
    };
  return {
    ok: true,
    deliveryCents: selected.feeCents,
    zone: { id: selected.id, name: selected.name },
  };
}
