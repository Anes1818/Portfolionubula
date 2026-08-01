/* ===== Flowers Pavon — bouquet catalog data =====
   Imported from the Flowers Pavon menu (pavonflowers.com). Each entry powers
   its own detail page at bouquet.html?id=<key>. Edit prices / copy here and
   both the detail pages and the "You may also like" cards update. */
window.BOUQUETS = {
  b1: {
    id: "b1", name: "Ramo #9 Sunflower \ud83c\udf3b", cat: "D\u00eda de la Madre",
    occ: "buchon madre", badge: "BEST SELLER", img: "assets/bouquets/b1.jpg", seed: 1, tpl: "round",
    pay: "https://buy.stripe.com/test_9B64gy4KD1Gubj21lJ5Rm00",
    blurb: "A radiant dome of fresh sunflowers, hand-tied buch\u00f3n style with premium wrapping \u2014 our Mother's Day signature.",
    story: "Our number nine is the ramo that started the buch\u00f3n craze in the shop. Dozens of just-opened sunflowers are domed tightly by hand so every golden face points outward, collared in eucalyptus and finished in kraft paper with a wide satin bow. It is loud, happy and impossible to miss on a doorstep.",
    inside: [["Fresh sunflowers", "10\u201312 tight golden heads, domed buch\u00f3n-style"], ["Greenery collar", "eucalyptus & ruscus framing the dome"], ["Premium wrap", "kraft paper + wide satin ribbon, tied by hand"]],
    sizes: [["Classic", 200], ["Grande", 260], ["Luxe", 340]],
    palette: ["#e9b93c", "#c96f4a", "#3c5934"],
    wa: "Hi Flowers Pavon! I'd like to order the Ramo #9 Sunflower buch\u00f3n ($200).",
    waes: "\u00a1Hola Flowers Pavon! Quisiera pedir el Ramo #9 de Girasoles ($200)."
  },
  b2: {
    id: "b2", name: "Amor Infinito Luxury", cat: "Ramo Buch\u00f3n",
    occ: "buchon love", badge: "LUXURY", img: "assets/bouquets/b2.jpg", seed: 2, tpl: "round",
    blurb: "Our grandest buch\u00f3n \u2014 a towering dome of premium red roses for the biggest declarations of love.",
    story: "When words are not enough, this is the answer. Fifty to sixty long-stem red roses are built into a tall, sculpted dome with a delicate baby's breath halo, double-wrapped and tied with velvet ribbon and a wax seal. It arrives as a statement, not a bouquet.",
    inside: [["Premium red roses", "50\u201360 long-stem roses in a tall dome"], ["Baby's breath halo", "a fine white cloud woven through the roses"], ["Luxury wrap", "double kraft + velvet ribbon and wax seal"]],
    sizes: [["Grand", 350], ["Imperial", 450]],
    palette: ["#c9556f", "#e2919f", "#f7f3e8"],
    wa: "Hi Flowers Pavon! I'd like to order the Amor Infinito Luxury buch\u00f3n ($350).",
    waes: "\u00a1Hola Flowers Pavon! Quisiera pedir el Ramo Buch\u00f3n Amor Infinito Luxury ($350)."
  },
  b3: {
    id: "b3", name: "Sol y Rosas \ud83c\udf3b", cat: "Ramo Buch\u00f3n",
    occ: "buchon", badge: "", img: "assets/bouquets/b3.jpg", seed: 5, tpl: "round", pearl: true,
    pay: "https://buy.stripe.com/test_00w4gy2Cv5WKcn6ggD5Rm01",
    blurb: "A golden ring of fresh sunflowers framing a tight dome of red roses \u2014 crowned with your initial in pearls.",
    story: "Two flowers, one showstopper. A dense circle of premium red roses sits at the center of this ramo, wrapped in a full golden ring of fresh sunflowers \u2014 and finished with the detail everyone remembers: an initial of your choice, hand-set in pearls across the roses. Black star-cut wrap, tied fresh the morning it goes out.",
    inside: [["Red rose center", "a tight circle of premium red roses"], ["Sunflower ring", "a full golden frame of fresh sunflowers"], ["Pearl initial + wrap", "your letter hand-set in pearls, black star-cut wrap"]],
    sizes: [["Classic", 160], ["Grande", 210]],
    palette: ["#e9b93c", "#c96f4a", "#3c5934"],
    wa: "Hi Flowers Pavon! I'd like to order the Sol y Rosas ramo ($160).",
    waes: "\u00a1Hola Flowers Pavon! Quisiera pedir el ramo Sol y Rosas ($160)."
  },
  b4: {
    id: "b4", name: "Amor en Primavera", cat: "Arreglos Florales",
    occ: "arreglos love", badge: "MOST GIFTED", img: "assets/bouquets/b4.jpg", seed: 7, tpl: "",
    blurb: "A lavish spring arrangement bursting with color and texture \u2014 roses, tulips and seasonal blooms.",
    story: "Spring in a single arrangement. We mix roses and tulips with whatever seasonal blooms are most beautiful that week \u2014 ranunculus, alstroemeria, textured filler \u2014 for a garden-gathered look that feels effortless and expensive at once.",
    inside: [["Mixed roses & tulips", "pink, coral and cream tones"], ["Seasonal blooms", "ranunculus, alstroemeria & filler"], ["Greens & wrap", "eucalyptus, hand-tied in blush paper"]],
    sizes: [["Standard", 120], ["Deluxe", 160]],
    palette: ["#eeb7c5", "#e9b93c", "#a9bb97"],
    wa: "Hi Flowers Pavon! I'd like to order Amor en Primavera ($120).",
    waes: "\u00a1Hola Flowers Pavon! Quisiera pedir Amor en Primavera ($120)."
  },
  b5: {
    id: "b5", name: "Encanto Rosado", cat: "Arreglos Florales",
    occ: "arreglos", badge: "", img: "assets/bouquets/b5.jpg", seed: 3, tpl: "",
    blurb: "A soft pink charm \u2014 blush roses and delicate blooms in premium packaging.",
    story: "Gentle and romantic without being over the top. A dozen blush roses are nestled with airy filler and greenery, then wrapped in pearl tissue and satin \u2014 the bouquet people reach for when they want understated, grown-up pretty.",
    inside: [["Blush roses", "a dozen soft-pink roses"], ["Filler", "baby's breath & limonium"], ["Wrap", "pearl tissue + satin ribbon"]],
    sizes: [["Petite", 85], ["Classic", 120]],
    palette: ["#eeb7c5", "#f6d5dd", "#a9bb97"],
    wa: "Hi Flowers Pavon! I'd like to order Encanto Rosado ($85).",
    waes: "\u00a1Hola Flowers Pavon! Quisiera pedir Encanto Rosado ($85)."
  },
  b6: {
    id: "b6", name: "Red Roses Eternal", cat: "Flores Eternas",
    occ: "eternas love", badge: "NEW", img: "assets/bouquets/b6.jpg", seed: 2, tpl: "round",
    blurb: "Preserved red roses that last for years \u2014 a love that never fades, in a keepsake box.",
    story: "Real roses, preserved at their peak so they stay velvety and vivid for one to three years \u2014 no water, no wilting. Arranged in a round keepsake hatbox and finished with ribbon, it is the gift that is still on the shelf long after the occasion.",
    inside: [["Preserved red roses", "real roses treated to last 1\u20133 years"], ["Keepsake box", "round hatbox \u2014 no water needed"], ["Finishing", "ribbon & a handwritten gift card"]],
    sizes: [["Petite box", 250], ["Grand box", 360]],
    palette: ["#c9556f", "#a92a58", "#33312a"],
    wa: "Hi Flowers Pavon! I'd like to order Red Roses Eternal ($250).",
    waes: "\u00a1Hola Flowers Pavon! Quisiera pedir Rosas Rojas Eternas ($250)."
  },
  b7: {
    id: "b7", name: "Coraz\u00f3n de Sol \u2764\ufe0f\ud83c\udf3b", cat: "Ramo Buch\u00f3n",
    occ: "buchon love madre", badge: "NEW", img: "assets/bouquets/b10.webp", seed: 4, tpl: "round",
    pay: "https://buy.stripe.com/test_7sY5kCdh9fxkaeY4xV5Rm02",
    blurb: "A hand-sculpted heart of red roses haloed by golden sunflowers, collared in a black star-cut wrap \u2014 finished with a personalized ribbon banner.",
    story: "This is the ramo people stop to photograph. Dozens of red roses are shaped into a tight, velvety heart, then framed with a halo of fresh sunflowers and wisps of baby's breath. The whole piece sits in a dramatic black star-cut collar and carries a satin banner we print with your own words \u2014 a name, a date, a promise.",
    inside: [["Red rose heart", "premium red roses hand-shaped into a dense heart"], ["Sunflower halo", "fresh sunflowers framing the heart, with baby's breath accents"], ["Star-cut wrap + banner", "black premium collar and a personalized satin ribbon"]],
    sizes: [["Classic", 280], ["Grande", 360]],
    palette: ["#a92a58", "#e9b93c", "#33312a"],
    wa: "Hi Flowers Pavon! I'd like to order the Coraz\u00f3n de Sol heart buch\u00f3n ($280).",
    waes: "\u00a1Hola Flowers Pavon! Quisiera pedir el Coraz\u00f3n de Sol \u2014 ramo buch\u00f3n de coraz\u00f3n ($280)."
  }
};
