/* ===== Ashley's Floral Boutique — bouquet catalog data =====
   Home-based florist, Oklahoma City OK 73159. Orders come in by Instagram DM
   or text only — there is no WhatsApp line and no online checkout, so there are
   no `pay` links on these entries. No payment terms are stated anywhere on the
   site: Ashley confirms the total and how to pay when she replies.

   Prices are anchored on her real advertised "75 Roses Classic — $270" (b2) and
   the rest of the range is scaled from it, rounded to $5.

   Each entry powers its own detail page at bouquet.html?id=<key>. Edit prices /
   copy here and both the detail pages and the "You may also like" cards update. */

/* Order channels. Instagram DM cannot carry a pre-filled message, so the text
   link is the one that gets the bouquet details baked in. */
window.SHOP_CONTACT = {
  name: "Ashley's Floral Boutique",
  phone: "14058626632",
  phonePretty: "(405) 862-6632",
  ig: "ashleys.floral.boutique",
  city: "Oklahoma City, OK 73159"
};

/* Order-confirmation line shown with the CTAs. Deliberately states no payment
   terms — swap in Ashley's real policy only once she confirms it in writing. */
window.ORDER_NOTE = {
  en: "We confirm your date and your total by DM or text.",
  es: "Confirmamos tu fecha y tu total por DM o mensaje."
};

/* Add-ons offered with any bouquet. She sells plushies alongside flowers. */
window.ADDONS = {
  plushie: { price: 15, en: "Plushie 🧸", es: "Peluche 🧸",
             enNote: "Add a soft plushie to any bouquet",
             esNote: "Agrega un peluche suave a cualquier ramo" },
  card:    { price: 5,  en: "Handwritten card 💌", es: "Tarjeta escrita a mano 💌",
             enNote: "We write your message by hand",
             esNote: "Escribimos tu mensaje a mano" }
};

window.BOUQUETS = {
  b1: {
    id: "b1", name: "Sunflower Ramo 🌻", cat: "Ramo Buchón",
    occ: "buchon madre", badge: "BEST SELLER", img: "assets/bouquets/b1.jpg", seed: 1, tpl: "round",
    blurb: "A radiant dome of fresh sunflowers, hand-tied buchón style with premium wrapping — our Mother's Day signature.",
    story: "This is the ramo that started the buchón requests. Dozens of just-opened sunflowers are domed tightly by hand so every golden face points outward, collared in eucalyptus and finished in kraft paper with a wide satin bow. It is loud, happy and impossible to miss on a doorstep anywhere in south Oklahoma City.",
    inside: [["Fresh sunflowers", "10–12 tight golden heads, domed buchón-style"], ["Greenery collar", "eucalyptus & ruscus framing the dome"], ["Premium wrap", "kraft paper + wide satin ribbon, tied by hand"]],
    sizes: [["Classic", 155], ["Grande", 200], ["Luxe", 260]],
    palette: ["#e9b93c", "#c96f4a", "#3c5934"],
    msg: "Hi Ashley's Floral Boutique! I'd like to order the Sunflower Ramo buchón ($155).",
    msges: "¡Hola Ashley's Floral Boutique! Quisiera pedir el Ramo Buchón de Girasoles ($155)."
  },
  b2: {
    id: "b2", name: "75 Roses Classic", cat: "Roses",
    occ: "roses love", badge: "SIGNATURE", img: "assets/bouquets/b2.jpg", seed: 2, tpl: "round",
    blurb: "Seventy-five premium roses built into one towering dome — the bouquet people order when words are not enough.",
    story: "Seventy-five long-stem roses, counted out and built into a tall sculpted dome with a delicate baby's breath halo, double-wrapped and tied with velvet ribbon. It takes most of a morning to build and it arrives as a statement, not a bouquet. This is the piece Ashley is known for.",
    inside: [["75 premium roses", "counted long-stem roses in a tall hand-built dome"], ["Baby's breath halo", "a fine white cloud woven through the roses"], ["Luxury wrap", "double wrap + velvet ribbon and wax seal"]],
    sizes: [["Classic", 270], ["Grande", 345]],
    palette: ["#d4738f", "#f2b0ca", "#f7f3e8"],
    msg: "Hi Ashley's Floral Boutique! I'd like to order the 75 Roses Classic ($270).",
    msges: "¡Hola Ashley's Floral Boutique! Quisiera pedir el 75 Roses Classic ($270)."
  },
  b3: {
    id: "b3", name: "Sol y Rosas 🌻", cat: "Ramo Buchón",
    occ: "buchon", badge: "", img: "assets/bouquets/b3.jpg", seed: 5, tpl: "round", pearl: true,
    blurb: "A golden ring of fresh sunflowers framing a tight dome of red roses — crowned with your initial in pearls.",
    story: "Two flowers, one showstopper. A dense circle of premium red roses sits at the center, wrapped in a full golden ring of fresh sunflowers — and finished with the detail everyone remembers: an initial of your choice, hand-set in pearls across the roses. Black star-cut wrap, built fresh the morning it goes out.",
    inside: [["Red rose center", "a tight circle of premium red roses"], ["Sunflower ring", "a full golden frame of fresh sunflowers"], ["Pearl initial + wrap", "your letter hand-set in pearls, black star-cut wrap"]],
    sizes: [["Classic", 125], ["Grande", 160]],
    palette: ["#e9b93c", "#c96f4a", "#3c5934"],
    msg: "Hi Ashley's Floral Boutique! I'd like to order the Sol y Rosas ramo ($125).",
    msges: "¡Hola Ashley's Floral Boutique! Quisiera pedir el ramo Sol y Rosas ($125)."
  },
  b4: {
    id: "b4", name: "Spring Arrangement", cat: "Arrangements",
    occ: "arrangements love", badge: "MOST GIFTED", img: "assets/bouquets/b4.jpg", seed: 7, tpl: "",
    blurb: "A lavish spring arrangement bursting with color and texture — roses, tulips and seasonal blooms.",
    story: "Spring in a single arrangement. Roses and tulips are mixed with whatever seasonal blooms are most beautiful that week — ranunculus, alstroemeria, textured filler — for a garden-gathered look that feels effortless and expensive at once.",
    inside: [["Mixed roses & tulips", "pink, coral and cream tones"], ["Seasonal blooms", "ranunculus, alstroemeria & filler"], ["Greens & wrap", "eucalyptus, hand-tied in blush paper"]],
    sizes: [["Standard", 95], ["Deluxe", 125]],
    palette: ["#f2b0ca", "#e9b93c", "#a9bb97"],
    msg: "Hi Ashley's Floral Boutique! I'd like to order the Spring Arrangement ($95).",
    msges: "¡Hola Ashley's Floral Boutique! Quisiera pedir el Arreglo de Primavera ($95)."
  },
  b5: {
    id: "b5", name: "Pink Charm", cat: "Arrangements",
    occ: "arrangements", badge: "", img: "assets/bouquets/b5.jpg", seed: 3, tpl: "",
    blurb: "A soft pink charm — blush roses and delicate blooms in premium packaging.",
    story: "Gentle and romantic without being over the top. A dozen blush roses are nestled with airy filler and greenery, then wrapped in pearl tissue and satin — the bouquet people reach for when they want understated, grown-up pretty.",
    inside: [["Blush roses", "a dozen soft-pink roses"], ["Filler", "baby's breath & limonium"], ["Wrap", "pearl tissue + satin ribbon"]],
    sizes: [["Petite", 65], ["Classic", 95]],
    palette: ["#f2b0ca", "#fadfe9", "#a9bb97"],
    msg: "Hi Ashley's Floral Boutique! I'd like to order the Pink Charm ($65).",
    msges: "¡Hola Ashley's Floral Boutique! Quisiera pedir el Pink Charm ($65)."
  },
  b6: {
    id: "b6", name: "Roses Eternal", cat: "Preserved Roses",
    occ: "preserved love", badge: "NEW", img: "assets/bouquets/b6.jpg", seed: 2, tpl: "round",
    blurb: "Preserved roses that last for years — a love that never fades, in a keepsake box.",
    story: "Real roses, preserved at their peak so they stay velvety and vivid for one to three years — no water, no wilting. Arranged in a round keepsake hatbox and finished with ribbon, it is the gift that is still on the shelf long after the occasion.",
    inside: [["Preserved roses", "real roses treated to last 1–3 years"], ["Keepsake box", "round hatbox — no water needed"], ["Finishing", "ribbon & a handwritten gift card"]],
    sizes: [["Petite box", 195], ["Grand box", 275]],
    palette: ["#d4738f", "#b8536f", "#141216"],
    msg: "Hi Ashley's Floral Boutique! I'd like to order Roses Eternal ($195).",
    msges: "¡Hola Ashley's Floral Boutique! Quisiera pedir Rosas Eternas ($195)."
  },
  b7: {
    id: "b7", name: "Heart of Roses ❤️🌻", cat: "Ramo Buchón",
    occ: "buchon love madre", badge: "NEW", img: "assets/bouquets/b10.webp", seed: 4, tpl: "round",
    blurb: "A hand-sculpted heart of red roses haloed by golden sunflowers, collared in a black star-cut wrap — finished with a personalized ribbon banner.",
    story: "This is the ramo people stop to photograph. Dozens of red roses are shaped into a tight, velvety heart, then framed with a halo of fresh sunflowers and wisps of baby's breath. The whole piece sits in a dramatic black star-cut collar and carries a satin banner printed with your own words — a name, a date, a promise.",
    inside: [["Red rose heart", "premium red roses hand-shaped into a dense heart"], ["Sunflower halo", "fresh sunflowers framing the heart, with baby's breath accents"], ["Star-cut wrap + banner", "black premium collar and a personalized satin ribbon"]],
    sizes: [["Classic", 215], ["Grande", 275]],
    palette: ["#b8536f", "#e9b93c", "#141216"],
    msg: "Hi Ashley's Floral Boutique! I'd like to order the Heart of Roses buchón ($215).",
    msges: "¡Hola Ashley's Floral Boutique! Quisiera pedir el Heart of Roses — ramo buchón de corazón ($215)."
  }
};
