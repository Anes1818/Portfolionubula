/* ROBUSTE reusable template configuration.
   Change this file for each client instead of editing every HTML/JS file. */
(function () {
  'use strict';
  window.STORE_CONFIG = {
    demoMode: true,
    business: {
      name: 'ROBUSTE eulma',
      shortName: 'ROBUSTE',
      tagline: 'أجهزة منزلية تجعل حياتك أسهل',
      description: 'متجر متخصص في الأجهزة المنزلية عالية الجودة بأسعار تنافسية.',
      type: 'Store',
      logo: 'https://i.postimg.cc/7P7BK44r/f525e1dd-9f2c-4160-aed1-882a8b28b75c-20250703-131500-0000.png',
      paymentLogo: 'https://i.postimg.cc/bY06X2YN/logo-round.png',
      accentColor: '#ff6600',
      country: 'DZ',
      locale: 'ar-DZ',
      siteUrl: 'https://example.com',
      defaultOgImage: 'images/banner.webp'
    },
    contact: {
      phoneLocal: '0656360457',
      phoneInternational: '+213656360457',
      whatsapp: '213656360457',
      email: 'owner@example.com',
      address: 'Rue Bourquaa El Manouar, 426 Parcelle, El Eulma, Sétif, Algérie',
      city: 'El Eulma',
      region: 'Sétif',
      country: 'Algeria',
      hours: 'يومياً من 07:00 إلى 16:00',
      googleMapsUrl: 'https://maps.app.goo.gl/Cpk1L8fAadgE9pB76',
      googleMapsEmbedUrl: '',
      socials: { facebook: 'https://www.facebook.com/share/19QooaXfy8/' }
    },
    currency: {
      code: 'DZD',
      symbol: 'د.ج',
      locale: 'ar-DZ',
      position: 'after'
    },
    payments: {
      mode: 'cod', // cod | payment_link | external_checkout
      label: 'الدفع عند الاستلام',
      provider: 'cash', // cash | stripe | paypal | square | custom
      checkoutUrl: '', // client-owned Stripe/Square/PayPal payment link when mode is payment_link/external_checkout
      openInNewTab: true,
      appendOrderParams: true,
      enabledText: 'ادفع الآن بالبطاقة',
      disabledText: 'الدفع عند الاستلام'
    },
    firebase: {
      enabled: true,
      config: {
        apiKey: 'DEMO_DISABLED',
        authDomain: 'demo.firebaseapp.com',
        projectId: 'demo-project',
        storageBucket: 'demo.appspot.com',
        messagingSenderId: '000000000000',
        appId: '1:000000000000:web:demo'
      }
    },
    notifications: {
      // Never put Telegram bot token in frontend. Put it in the Worker secret instead.
      workerUrl: '',
      channel: 'telegram-worker',
      simulateWhenMissing: true
    },
    emailjs: {
      enabled: true,
      publicKey: 'DEMO_DISABLED',
      serviceId: 'DEMO_SERVICE_ID',
      orderTemplateId: 'DEMO_ORDER_TEMPLATE',
      contactTemplateId: 'DEMO_CONTACT_TEMPLATE'
    },
    storage: {
      cartKey: 'robuste_cart',
      demoDbKey: 'robuste_demo_db_v1',
      themeKey: 'robuste_theme',
      langKey: 'site_lang'
    },
    admin: {
      demoEmail: 'demo@robuste.store',
      statuses: ['جديد', 'مؤكد', 'قيد التحضير', 'تم التسليم', 'ملغى']
    }
  };
})();
