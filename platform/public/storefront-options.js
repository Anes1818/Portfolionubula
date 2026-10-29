/* Text and presentation options only. Catalogue, pricing and checkout stay separate. */
export const storefrontHomeDefaults = Object.freeze({
  announcementText: "",
  announcementEnabled: true,
  heroEyebrow: "YOUR MOMENTS, IN FULL BLOOM",
  heroButtonLabel: "",
  heroButtonTarget: "auto",
  builderButtonLabel: "Build your own",
  heroNote: "Thoughtfully made. A little more you.",
  heroStamp: "a little flower magic",
  heroLayout: "split",
  ribbonText:
    "Flowers for the little things · And the really big feelings · Made with a personal touch",
  ribbonEnabled: true,
  customTitle: "Make it your kind of beautiful.",
  customDescription:
    "Start with a favourite. Make the finishing touches your own.",
  productsTitle: "Lovely, just as they are.",
  productsDescription: "Handcrafted favourites. Ready for your kind of moment.",
  builderTitle: "A little imagination. A beautiful bouquet.",
  builderDescription:
    "Choose your flowers, find your colours and bring your own idea to life in our bouquet builder.",
  aboutTitle: "Flowers with a personal touch.",
  contactTitle: "A little hello goes a long way.",
  contactDetails: "",
  footerText: "Your craft. Their imagination.",
  navCustom: "Bouquets",
  navProducts: "Our shop",
  navAbout: "Our story",
  navContact: "Say hello",
  motionEnabled: true,
});

const fields = {
  announcementEnabled: ["Show the announcement bar", "checkbox"],
  announcementText: [
    "Announcement text",
    "text",
    160,
    "Example: Mother’s Day orders are now open · Pickup in Toronto",
  ],
  navCustom: ["Bouquets menu label", "text", 40],
  navProducts: ["Products menu label", "text", 40],
  navAbout: ["About menu label", "text", 40],
  navContact: ["Contact menu label", "text", 40],
  builderButtonLabel: ["Builder button label", "text", 60],
  heroEyebrow: ["Small text above the headline", "text", 80],
  headline: [
    "Main headline",
    "textarea",
    160,
    "Example: Flowers made for your kind of beautiful.",
  ],
  description: [
    "Welcome description",
    "textarea",
    600,
    "Tell customers what you make and where you serve.",
  ],
  heroButtonLabel: [
    "Main button text",
    "text",
    60,
    "Leave empty for an automatic label",
  ],
  heroButtonTarget: [
    "Main button destination",
    "select",
    [
      ["auto", "First visible section"],
      ["custom", "Customisable bouquets"],
      ["products", "Fixed products"],
      ["builder", "Bouquet builder"],
      ["about", "Your story"],
      ["contact", "Contact details"],
    ],
  ],
  heroNote: ["Note below the buttons", "text", 160],
  heroStamp: ["Photo badge text", "text", 60],
  heroLayout: [
    "Hero layout",
    "select",
    [
      ["split", "Text beside photo"],
      ["image-first", "Photo first"],
      ["centered", "Centered introduction"],
    ],
  ],
  ribbonEnabled: ["Show the decorative text strip", "checkbox"],
  ribbonText: ["Text strip below the hero", "text", 200],
  customTitle: ["Bouquet section title", "text", 120],
  customDescription: ["Bouquet section introduction", "textarea", 300],
  productsTitle: ["Product section title", "text", 120],
  productsDescription: ["Product section introduction", "textarea", 300],
  builderTitle: ["Builder section title", "text", 120],
  builderDescription: ["Builder section introduction", "textarea", 400],
  aboutTitle: ["Your story title", "text", 120],
  about: ["Your story", "textarea", 3000],
  contactTitle: ["Contact section title", "text", 120],
  contactDetails: [
    "Address, opening hours & ordering information",
    "textarea",
    1200,
    "Example: Pickup by appointment\nTuesday–Saturday, 10am–6pm\nPlease order at least 3 days ahead.",
  ],
  footerText: ["Footer message", "text", 160],
  motionEnabled: ["Gentle movement and hover effects", "checkbox"],
};
export const storefrontGroups = {
  header: [
    "Top bar & menu",
    [
      "announcementEnabled",
      "announcementText",
      "navCustom",
      "navProducts",
      "navAbout",
      "navContact",
      "builderButtonLabel",
    ],
  ],
  "hero-copy": [
    "Hero text & buttons",
    [
      "heroEyebrow",
      "headline",
      "description",
      "heroButtonLabel",
      "heroButtonTarget",
      "builderButtonLabel",
      "heroNote",
      "heroStamp",
    ],
  ],
  "hero-look": ["Photo & layout", ["heroLayout"]],
  "section-custom": [
    "Customisable bouquets",
    ["customTitle", "customDescription"],
  ],
  "section-products": [
    "Fixed products",
    ["productsTitle", "productsDescription"],
  ],
  "section-builder": [
    "Bouquet builder section",
    ["builderTitle", "builderDescription", "builderButtonLabel"],
  ],
  "section-about": ["Your story", ["aboutTitle", "about"]],
  contact: ["Contact & opening hours", ["contactTitle", "contactDetails"]],
  footer: [
    "Text strip & footer",
    ["ribbonEnabled", "ribbonText", "footerText"],
  ],
  appearance: ["Style & movement", ["motionEnabled"]],
};
export function storefrontControls(group, home, escape) {
  return (storefrontGroups[group]?.[1] || [])
    .map((key) => {
      const [label, type, limit, placeholder] = fields[key];
      const value = home[key] ?? storefrontHomeDefaults[key] ?? "";
      const path = `data-path="home.${key}"`;
      if (type === "checkbox")
        return `<label class="toggle-line"><input type="checkbox" ${path} ${value ? "checked" : ""}>${escape(label)}</label>`;
      if (type === "select")
        return `<label class="field">${escape(label)}<select ${path}>${limit.map(([id, text]) => `<option value="${id}" ${value === id ? "selected" : ""}>${escape(text)}</option>`).join("")}</select></label>`;
      return `<label class="field">${escape(label)}${type === "textarea" ? `<textarea ${path} maxlength="${limit}" placeholder="${escape(placeholder || "")}">${escape(value)}</textarea>` : `<input type="text" ${path} maxlength="${limit}" value="${escape(value)}" placeholder="${escape(placeholder || "")}">`}</label>`;
    })
    .join("");
}
