/* ROBUSTE eulma — Phase 1 interface i18n (AR / EN / FR)
   Translates UI chrome only. Product names/descriptions stay as-is (Phase 2).
   No HTML edits needed beyond including this script. */
(function () {
  "use strict";

  // [arabic source, english, french]
  var ROWS = [
    // ---- Nav / chrome ----
    [`الرئيسية`, `Home`, `Accueil`],
    [`المنتجات`, `Products`, `Produits`],
    [`آراء العملاء`, `Reviews`, `Avis clients`],
    [`اتصل بنا`, `Contact us`, `Contactez-nous`],
    [`الوضع المظلم`, `Dark mode`, `Mode sombre`],
    [`القائمة`, `Menu`, `Menu`],
    [`إغلاق`, `Close`, `Fermer`],
    [`السابق`, `Previous`, `Précédent`],
    [`التالي`, `Next`, `Suivant`],
    [`صورة 1`, `Image 1`, `Image 1`],
    [`صورة 2`, `Image 2`, `Image 2`],
    [`صورة 3`, `Image 3`, `Image 3`],
    [`صورة 4`, `Image 4`, `Image 4`],
    [`صورة 5`, `Image 5`, `Image 5`],
    [`فيسبوك`, `Facebook`, `Facebook`],
    [`واتساب`, `WhatsApp`, `WhatsApp`],

    // ---- Page titles ----
    [`ROBUSTE eulma - المتجر الرسمي`, `ROBUSTE eulma - Official Store`, `ROBUSTE eulma - Boutique officielle`],
    [`ROBUSTE | تفاصيل المنتج`, `ROBUSTE | Product details`, `ROBUSTE | Détails du produit`],

    // ---- Hero ----
    [`أجهزة منزلية تجعل حياتك أسهل`, `Home appliances that make your life easier`, `Des appareils ménagers qui vous simplifient la vie`],
    [`جودة عالية بأسعار تنافسية لكل منزل جزائري مع خدمة توصيل سريعة وضمان سنة واحدة`, `High quality at competitive prices for every Algerian home, with fast delivery and a 1-year warranty`, `Une haute qualité à prix compétitifs pour chaque foyer algérien, avec livraison rapide et garantie de 1 an`],
    [`تسوق الآن`, `Shop now`, `Acheter maintenant`],

    // ---- Trust bar ----
    [`توصيل حتى باب البيت`, `Door-to-door delivery`, `Livraison à domicile`],
    [`إلى جميع الولايات`, `To all provinces`, `Vers toutes les wilayas`],
    [`إلى 58 ولاية`, `To 58 provinces`, `Vers 58 wilayas`],
    [`ضمان عام`, `Warranty included`, `Garantie incluse`],
    [`جودة مضمونة`, `Guaranteed quality`, `Qualité garantie`],
    [`منتجات أصلية`, `Authentic products`, `Produits authentiques`],
    [`خدمة ما بعد الشراء`, `After-sales service`, `Service après-vente`],
    [`دعم دائم لك`, `Always here to help`, `Toujours à votre service`],
    [`دعم متواصل`, `Continuous support`, `Support continu`],
    [`دفع يد بيد`, `Pay on delivery`, `Paiement à la livraison`],
    [`ادفع عند الاستلام`, `Pay upon receipt`, `Payez à la réception`],
    [`عند الاستلام`, `Upon receipt`, `À la réception`],

    // ---- Offers ----
    [`🔥 عروض حصرية 🔥`, `🔥 Exclusive offers 🔥`, `🔥 Offres exclusives 🔥`],
    [`استفد من عروضنا الاستثنائية مع تخفيضات تصل إلى 30% على أفضل الأجهزة المنزلية. العرض محدود زمنياً!`, `Take advantage of our exceptional offers with discounts up to 30% on the best home appliances. Limited-time offer!`, `Profitez de nos offres exceptionnelles avec jusqu'à 30% de réduction sur les meilleurs appareils. Offre à durée limitée !`],
    [`⏳ ينتهي العرض خلال :`, `⏳ Offer ends in:`, `⏳ L'offre se termine dans :`],
    [`أيام`, `Days`, `Jours`],
    [`ساعات`, `Hours`, `Heures`],
    [`دقائق`, `Minutes`, `Minutes`],
    [`ثواني`, `Seconds`, `Secondes`],
    [`الأكثر مبيعاً`, `Best seller`, `Meilleure vente`],
    [`الأعلى مبيعاً`, `Top seller`, `Top des ventes`],
    [`جديد`, `New`, `Nouveau`],
    [`عرض خاص`, `Special offer`, `Offre spéciale`],
    [`اشتر الآن`, `Buy now`, `Acheter`],

    // ---- Products / categories ----
    [`أحدث منتجاتنا`, `Our latest products`, `Nos derniers produits`],
    [`الكل`, `All`, `Tous`],
    [`العناية بالشعر`, `Hair care`, `Soin des cheveux`],
    [`أجهزة المطبخ`, `Kitchen appliances`, `Électroménager cuisine`],
    [`العناية الشخصية`, `Personal care`, `Soin personnel`],
    [`الأجهزة المنزلية`, `Home appliances`, `Électroménager`],
    [`الحديقة`, `Garden`, `Jardin`],
    [`آلات القهوة`, `Coffee machines`, `Machines à café`],
    [`متوفر`, `In stock`, `En stock`],
    [`غير متوفر`, `Out of stock`, `En rupture`],
    [`منتج بدون اسم`, `Unnamed product`, `Produit sans nom`],

    // ---- Reviews ----
    [`عمر`, `Omar`, `Omar`],
    [`روز بلانش`, `Rose Blanche`, `Rose Blanche`],
    [`محمد`, `Mohamed`, `Mohamed`],
    [`"جودة المنتج ممتازة والتوصيل كان في الموعد، شكراً لفريق ROBUSTE!"`, `"Excellent product quality and delivery was right on time. Thank you, ROBUSTE team!"`, `"Excellente qualité du produit et livraison à l'heure. Merci à l'équipe ROBUSTE !"`],
    [`"أنا سعيدة بعلامة ROBUSTE، أستخدم منتجاتكم منذ سنوات عديدة."`, `"I'm happy with the ROBUSTE brand; I've been using your products for many years."`, `"Je suis satisfaite de la marque ROBUSTE ; j'utilise vos produits depuis de nombreuses années."`],
    [`"الدفع عند الاستلام مريح جداً، والمنتج يعمل بكفاءة عالية، أنصح بالتعامل معهم."`, `"Cash on delivery is very convenient and the product works great. I recommend them."`, `"Le paiement à la livraison est très pratique et le produit fonctionne très bien. Je les recommande."`],

    // ---- Order modal ----
    [`طلب منتج`, `Order product`, `Commander le produit`],
    [`ملخص الطلب`, `Order summary`, `Résumé de la commande`],
    [`الاسم واللقب`, `Full name`, `Nom complet`],
    [`الاسم الكامل *`, `Full name *`, `Nom complet *`],
    [`رقم الهاتف`, `Phone number`, `Numéro de téléphone`],
    [`رقم الهاتف *`, `Phone number *`, `Numéro de téléphone *`],
    [`مثال: 0551234566`, `Example: 0551234566`, `Exemple : 0551234566`],
    [`البريد الإلكتروني (اختياري)`, `Email (optional)`, `E-mail (optionnel)`],
    [`البريد الإلكتروني`, `Email`, `E-mail`],
    [`الولاية`, `Province`, `Wilaya`],
    [`الولاية *`, `Province *`, `Wilaya *`],
    [`اختر ولايتك`, `Choose your province`, `Choisissez votre wilaya`],
    [`اختر الولاية`, `Choose province`, `Choisir la wilaya`],
    [`العنوان`, `Address`, `Adresse`],
    [`طريقة الدفع`, `Payment method`, `Mode de paiement`],
    [`الدفع عند الاستلام`, `Cash on delivery`, `Paiement à la livraison`],
    [`الدفع عبر الإنترنت`, `Online payment`, `Paiement en ligne`],
    [`إلغاء`, `Cancel`, `Annuler`],
    [`تأكيد الطلب`, `Confirm order`, `Confirmer la commande`],
    [`جاري المعالجة...`, `Processing...`, `Traitement...`],
    [`جاري الإرسال...`, `Sending...`, `Envoi...`],

    // ---- Contact ----
    [`معلومات الاتصال`, `Contact information`, `Coordonnées`],
    [`الهاتف`, `Phone`, `Téléphone`],
    [`ساعات العمل`, `Working hours`, `Horaires`],
    [`يومياً من 07:00 إلى 16:00`, `Daily from 07:00 to 16:00`, `Tous les jours de 07:00 à 16:00`],
    [`تابعنا على`, `Follow us`, `Suivez-nous`],
    [`أرسل لنا رسالة`, `Send us a message`, `Envoyez-nous un message`],
    [`اسمك`, `Your name`, `Votre nom`],
    [`بريدك الإلكتروني`, `Your email`, `Votre e-mail`],
    [`رسالتك`, `Your message`, `Votre message`],
    [`إرسال الرسالة`, `Send message`, `Envoyer le message`],
    [`موقع المتجر`, `Store location`, `Emplacement du magasin`],

    // ---- Footer ----
    [`نبذة عن ROBUSTE`, `About ROBUSTE`, `À propos de ROBUSTE`],
    [`متجر متخصص في الأجهزة المنزلية عالية الجودة بأسعار تنافسية. نقدم أفضل المنتجات مع توصيل سريع.`, `A store specialized in high-quality home appliances at competitive prices. We offer the best products with fast delivery.`, `Une boutique spécialisée dans l'électroménager de haute qualité à prix compétitifs. Nous offrons les meilleurs produits avec une livraison rapide.`],
    [`روابط سريعة`, `Quick links`, `Liens rapides`],
    [`خدمة العملاء`, `Customer service`, `Service client`],
    [`الأسئلة الشائعة`, `FAQ`, `FAQ`],
    [`طرق الدفع`, `Payment methods`, `Moyens de paiement`],
    [`شروط الضمان`, `Warranty terms`, `Conditions de garantie`],
    [`اشترك في صفحتنا`, `Follow our page`, `Suivez notre page`],
    [`اشترك لتصلك أحدث العروض`, `Subscribe for the latest offers`, `Abonnez-vous pour les dernières offres`],
    [`اشترك الآن`, `Subscribe now`, `S'abonner`],
    [`© 2025 ROBUSTE. جميع الحقوق محفوظة.`, `© 2025 ROBUSTE. All rights reserved.`, `© 2025 ROBUSTE. Tous droits réservés.`],
    [`© 2025 ROBUSTE — جميع الحقوق محفوظة`, `© 2025 ROBUSTE — All rights reserved`, `© 2025 ROBUSTE — Tous droits réservés`],
    [`الدفع متاح ببطاقة الذهب`, `Payment available with the Edahabia card`, `Paiement par carte Edahabia`],

    // ---- Cart ----
    [`السلة`, `Cart`, `Panier`],
    [`سلة التسوق`, `Shopping cart`, `Panier`],
    [`سلة التسوق فارغة`, `Your cart is empty`, `Votre panier est vide`],
    [`سلة المشتريات فارغة`, `Your cart is empty`, `Votre panier est vide`],
    [`لم تقم بإضافة أي منتجات إلى السلة بعد`, `You haven't added any products to the cart yet`, `Vous n'avez encore ajouté aucun produit au panier`],
    [`استكشف منتجاتنا وأضف ما يناسبك`, `Explore our products and add what suits you`, `Découvrez nos produits et ajoutez ce qui vous convient`],
    [`استكشف المنتجات`, `Explore products`, `Découvrir les produits`],
    [`تصفح المنتجات`, `Browse products`, `Parcourir les produits`],
    [`المجموع:`, `Total:`, `Total :`],
    [`إنهاء الطلب`, `Checkout`, `Finaliser la commande`],
    [`إتمام الشراء`, `Complete purchase`, `Finaliser l'achat`],

    // ---- Product page ----
    [`أضف للسلة`, `Add to cart`, `Ajouter au panier`],
    [`شراء فوري`, `Buy now`, `Achat immédiat`],
    [`طلب سريع`, `Quick order`, `Commande rapide`],
    [`متوفر · توصيل سريع`, `In stock · Fast delivery`, `En stock · Livraison rapide`],
    [`وصف المنتج`, `Product description`, `Description du produit`],
    [`قد يعجبك أيضاً`, `You may also like`, `Vous aimerez aussi`],
    [`المنتج غير موجود`, `Product not found`, `Produit introuvable`],
    [`فشل تحميل المنتج`, `Failed to load product`, `Échec du chargement du produit`],
    [`جودة عالية`, `High quality`, `Haute qualité`],
    [`ضمان سنتان`, `2-year warranty`, `Garantie 2 ans`],
    [`توصيل سريع`, `Fast delivery`, `Livraison rapide`],
    [`منتج عالي الجودة من ROBUSTE`, `A high-quality product by ROBUSTE`, `Un produit de haute qualité de ROBUSTE`],

    // ---- Success overlay / toasts ----
    [`تم تأكيد طلبكم`, `Your order is confirmed`, `Votre commande est confirmée`],
    [`سنتواصل معكم قريباً على رقمكم الخاص`, `We'll contact you soon on your number`, `Nous vous contacterons bientôt sur votre numéro`],
    [`شكراً لثقتكم بنا`, `Thank you for your trust`, `Merci de votre confiance`],
    [`تواصل عبر واتساب`, `Contact via WhatsApp`, `Contacter via WhatsApp`],
    [`تم إزالة المنتج`, `Item removed`, `Article retiré`],
    [`السلة فارغة`, `Cart is empty`, `Panier vide`],
    [`يرجى ملء جميع الحقول المطلوبة`, `Please fill in all required fields`, `Veuillez remplir tous les champs requis`],
    [`الرجاء ملء جميع الحقول المطلوبة`, `Please fill in all required fields`, `Veuillez remplir tous les champs requis`],
    [`يرجى ملء البيانات`, `Please fill in the details`, `Veuillez remplir les informations`],
    [`رقم هاتف غير صحيح`, `Invalid phone number`, `Numéro de téléphone invalide`],
    [`حدث خطأ، حاول مجدداً`, `An error occurred, please try again`, `Une erreur s'est produite, réessayez`],
    [`حدث خطأ`, `An error occurred`, `Une erreur s'est produite`]
  ];

  var T = {};
  for (var i = 0; i < ROWS.length; i++) { T[ROWS[i][0]] = { en: ROWS[i][1], fr: ROWS[i][2] }; }

  var NAMES = { ar: "العربية", en: "English", fr: "Français" };
  var ATTRS = ["placeholder", "title", "aria-label"];
  var origText = new WeakMap();
  var origAttr = new WeakMap();
  var docTitleOrig = null;
  var CUR = detect();
  var observer = null;
  var pending = false;
  var bsLink = null, bsOrigHref = null;

  function detect() {
    // Returning visitors keep their explicit choice; otherwise follow the browser language (fallback Arabic).
    try { var s = localStorage.getItem("site_lang"); if (s === "ar" || s === "en" || s === "fr") return s; } catch (e) {}
    var n = (navigator.language || "ar").toLowerCase();
    if (n.indexOf("fr") === 0) return "fr";
    if (n.indexOf("en") === 0) return "en";
    return "ar";
  }

  function tr(text, lang) {
    var key = text.trim();
    if (!key) return text;
    var lead = (text.match(/^\s*/) || [""])[0];
    var trail = (text.match(/\s*$/) || [""])[0];
    var out = key;
    var e = T[key];
    if (lang !== "ar" && e && e[lang] != null) out = e[lang];
    if (lang !== "ar") out = out.replace(/د\.ج/g, "DA").replace(/دج/g, "DA");
    return lead + out + trail;
  }

  function translateNode(node, lang) {
    if (!origText.has(node)) origText.set(node, node.nodeValue);
    var o = origText.get(node);
    var v = tr(o, lang);
    if (node.nodeValue !== v) node.nodeValue = v;
  }

  function translateEl(el, lang) {
    var store = origAttr.get(el);
    if (!store) { store = {}; origAttr.set(el, store); }
    for (var k = 0; k < ATTRS.length; k++) {
      var a = ATTRS[k];
      if (el.hasAttribute(a)) {
        if (!(a in store)) store[a] = el.getAttribute(a);
        var v = tr(store[a], lang);
        if (el.getAttribute(a) !== v) el.setAttribute(a, v);
      }
    }
  }

  function findBootstrap() {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if (/bootstrap@[\d.]+\/dist\/css\/bootstrap(\.rtl)?\.min\.css/.test(links[i].href)) {
        bsLink = links[i]; bsOrigHref = links[i].href; return;
      }
    }
  }

  function setDir(lang) {
    var rtl = (lang === "ar");
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", rtl ? "rtl" : "ltr");
    if (bsLink && bsOrigHref) {
      if (rtl) {
        if (bsLink.getAttribute("href") !== bsOrigHref) bsLink.setAttribute("href", bsOrigHref);
      } else {
        var ltr = bsOrigHref.replace("bootstrap.rtl.min.css", "bootstrap.min.css");
        if (bsLink.getAttribute("href") !== ltr) bsLink.setAttribute("href", ltr);
      }
    }
  }

  function inSwitcher(node) {
    var el = node.nodeType === 1 ? node : node.parentNode;
    return !!(el && el.closest && el.closest("#i18nSwitcher"));
  }

  function applyLang(lang) {
    CUR = lang;
    try { localStorage.setItem("site_lang", lang); } catch (e) {}
    setDir(lang);
    if (docTitleOrig == null) docTitleOrig = document.title;
    document.title = tr(docTitleOrig, lang).trim();
    if (observer) observer.disconnect();
    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentNode;
          if (!p) return NodeFilter.FILTER_REJECT;
          var tag = p.nodeName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") return NodeFilter.FILTER_REJECT;
          if (inSwitcher(p)) return NodeFilter.FILTER_REJECT;
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [], cur;
      while ((cur = walker.nextNode())) nodes.push(cur);
      for (var i = 0; i < nodes.length; i++) translateNode(nodes[i], lang);
      var els = document.querySelectorAll("[placeholder],[title],[aria-label]");
      for (var j = 0; j < els.length; j++) { if (!inSwitcher(els[j])) translateEl(els[j], lang); }
    } catch (e) { /* never break the page */ }
    updateSwitcherLabel(lang);
    if (observer) connectObserver();
  }

  function connectObserver() {
    if (observer && document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  function buildSwitcher() {
    if (document.getElementById("i18nSwitcher")) return;
    var style = document.createElement("style");
    style.textContent =
      "#i18nSwitcher{position:relative;display:inline-block;margin-inline-end:8px;}" +
      "#i18nSwitcher .i18n-btn{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 12px;border-radius:22px;border:1px solid rgba(0,0,0,.12);background:rgba(0,0,0,.05);color:inherit;font-weight:700;font-size:.88rem;cursor:pointer;line-height:1;}" +
      "#i18nSwitcher .i18n-btn:hover{background:var(--primary,#FF6B35);color:#fff;}" +
      "#i18nSwitcher .i18n-menu{position:absolute;top:52px;inset-inline-end:0;min-width:150px;background:var(--light,#fff);border:1px solid rgba(0,0,0,.1);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:6px;display:none;z-index:4000;}" +
      "#i18nSwitcher.open .i18n-menu{display:block;}" +
      "#i18nSwitcher .i18n-menu button{display:block;width:100%;text-align:start;padding:10px 12px;border:none;background:none;border-radius:8px;cursor:pointer;font-weight:600;color:var(--dark,#333);font-size:.9rem;}" +
      "#i18nSwitcher .i18n-menu button:hover{background:rgba(255,107,53,.12);}" +
      "#i18nSwitcher .i18n-menu button.active{background:var(--primary,#FF6B35);color:#fff;}";
    document.head.appendChild(style);

    var wrap = document.createElement("div");
    wrap.id = "i18nSwitcher";
    wrap.innerHTML =
      '<button type="button" class="i18n-btn" id="i18nBtn" aria-haspopup="true" aria-expanded="false" aria-label="Language"><i class="bi bi-globe2"></i> <span id="i18nCur"></span></button>' +
      '<div class="i18n-menu" id="i18nMenu" role="menu">' +
      '<button type="button" role="menuitem" data-lang="ar">العربية</button>' +
      '<button type="button" role="menuitem" data-lang="en">English</button>' +
      '<button type="button" role="menuitem" data-lang="fr">Français</button>' +
      "</div>";

    var tgl = document.getElementById("themeToggle");
    if (tgl && tgl.parentNode) { tgl.parentNode.insertBefore(wrap, tgl); }
    else {
      var nav = document.querySelector(".navbar .container") || document.body;
      nav.appendChild(wrap);
    }

    var btn = wrap.querySelector("#i18nBtn");
    var menu = wrap.querySelector("#i18nMenu");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = wrap.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function () {
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
    var items = menu.querySelectorAll("button");
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener("click", function (e) {
        e.stopPropagation();
        wrap.classList.remove("open");
        applyLang(this.getAttribute("data-lang"));
      });
    }
  }

  function updateSwitcherLabel(lang) {
    var cur = document.getElementById("i18nCur");
    if (cur) cur.textContent = NAMES[lang] || lang;
    var items = document.querySelectorAll("#i18nMenu button");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle("active", items[i].getAttribute("data-lang") === lang);
    }
  }

  function init() {
    try { findBootstrap(); } catch (e) {}
    try { buildSwitcher(); } catch (e) {}
    observer = new MutationObserver(function (muts) {
      if (CUR === "ar") return;
      var relevant = false;
      for (var i = 0; i < muts.length; i++) {
        if (!inSwitcher(muts[i].target)) { relevant = true; break; }
      }
      if (!relevant || pending) return;
      pending = true;
      (window.requestAnimationFrame || window.setTimeout)(function () {
        pending = false;
        applyLang(CUR);
      }, 50);
    });
    applyLang(CUR);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
