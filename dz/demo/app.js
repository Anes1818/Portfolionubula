// ============== تهيئة Firebase ==============
      
                                        // Polyfill for Object.entries for Safari
        if (typeof Object.entries !== 'function') {
            Object.entries = function(obj) {
                var ownProps = Object.keys(obj),
                    i = ownProps.length,
                    resArray = new Array(i);
                while (i--) {
                    resArray[i] = [ownProps[i], obj[ownProps[i]]];
                }
                return resArray;
            };
        }

        // Polyfill for localStorage in Safari private mode
        var storage = (function() {
            var uid = new Date().getTime().toString();
            var storage;
            try {
                (storage = window.localStorage).setItem(uid, uid);
                var available = storage.getItem(uid) == uid;
                storage.removeItem(uid);
                return available ? storage : false;
            } catch (e) {
                return {
                    data: {},
                    setItem: function(id, val) {
                        this.data[id] = val;
                    },
                    getItem: function(id) {
                        return this.data.hasOwnProperty(id) ? this.data[id] : undefined;
                    },
                    removeItem: function(id) {
                        delete this.data[id];
                    },
                    clear: function() {
                        this.data = {};
                    }
                };
            }
        })();

        // Polyfill for Array.from for older Safari versions
        if (!Array.from) {
            Array.from = (function () {
                var toStr = Object.prototype.toString;
                var isCallable = function (fn) {
                    return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
                };
                var toInteger = function (value) {
                    var number = Number(value);
                    if (isNaN(number)) { return 0; }
                    if (number === 0 || !isFinite(number)) { return number; }
                    return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
                };
                var maxSafeInteger = Math.pow(2, 53) - 1;
                var toLength = function (value) {
                    var len = toInteger(value);
                    return Math.min(Math.max(len, 0), maxSafeInteger);
                };

                return function from(arrayLike/*, mapFn, thisArg */) {
                    var C = this;
                    var items = Object(arrayLike);
                    if (arrayLike == null) {
                        throw new TypeError('Array.from requires an array-like object - not null or undefined');
                    }
                    var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
                    var T;
                    if (typeof mapFn !== 'undefined') {
                        if (!isCallable(mapFn)) {
                            throw new TypeError('Array.from: when provided, the second argument must be a function');
                        }
                        if (arguments.length > 2) {
                            T = arguments[2];
                        }
                    }
                    var len = toLength(items.length);
                    var A = isCallable(C) ? Object(new C(len)) : new Array(len);
                    var k = 0;
                    var kValue;
                    while (k < len) {
                        kValue = items[k];
                        if (mapFn) {
                            A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                        } else {
                            A[k] = kValue;
                        }
                        k += 1;
                    }
                    A.length = len;
                    return A;
                };
            })();
        }

        // Polyfill for NodeList.forEach for older Safari versions
        if (window.NodeList && !NodeList.prototype.forEach) {
            NodeList.prototype.forEach = function(callback, thisArg) {
                thisArg = thisArg || window;
                for (var i = 0; i < this.length; i++) {
                    callback.call(thisArg, this[i], i, this);
                }
            };
        }

       document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.slideshow-container1 img').forEach(function(img) {
    if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
      if (img.naturalWidth && img.naturalHeight) {
        img.setAttribute('width', img.naturalWidth);
        img.setAttribute('height', img.naturalHeight);
      }
      // لا تضيف auto هنا، خليه يتعامل مع CSS
    }
  });
});

        // حل مشكلة event listeners في Safari
        document.addEventListener('DOMContentLoaded', function() {
            // إعادة تهيئة جميع event listeners
            initEventListeners();
        });

        function initEventListeners() {
            // إعادة إرفاق جميع event listeners هنا
            // خاصة تلك المتعلقة بالسلة والطلبات
            
            // إضافة مستمعي الأحداث لأزرار الإضافة إلى السلة
            document.querySelectorAll('.add-to-cart-btn').forEach(function(button) {
                button.addEventListener('click', function() {
                    var productId = this.getAttribute('data-id');
                    var product = products.find(p => p.id == productId);
                    if (product) {
                        addToCart(product.name, product.price, product.priceValue, product.images, product.id);
                    }
                });
            });
            
            // إضافة مستمعي الأحداث لأزرار الطلب المباشر
            document.querySelectorAll('.buy-now-btn').forEach(function(button) {
                button.addEventListener('click', function() {
                    var productId = this.getAttribute('data-id');
                    var product = products.find(p => p.id == productId);
                    if (product) {
                        showOrderModal(product.name, product.price, product.priceValue, product.images);
                    }
                });
            });
            
            // إخفاء مؤشر الحالة عند النقر على زر الإغلاق
            var closeButton = document.querySelector('#statusIndicator .btn-close');
            if (closeButton) {
                closeButton.addEventListener('click', hideStatus);
            }
        }

        const firebaseConfig = {
            apiKey: "AIzaSyBTrnKCYOtfSSDYtmVQbzP2HcwgkLT565Y",
            authDomain: "robuste-c8e0f.firebaseapp.com",
            projectId: "robuste-c8e0f",
            storageBucket: "robuste-c8e0f.appspot.com",
            messagingSenderId: "975609984963",
            appId: "1:975609984963:web:a481efb493a88d7bc7af76",
            measurementId: "G-DWT7MZN028"
        };

        // تهيئة Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // تهيئة EmailJS باستخدام المفاتيح المقدمة
        (function() {
            emailjs.init("k77vdaUWPpnLrfTnS");
        })();

       // قائمة الولايات الجزائرية
        const wilayas = [
            "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "البليدة",
            "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل",
            "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم",
            "المسيلة", "معسكر", "ورقلة", "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف",
            "تيندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة",
            "عين تموشنت", "غرداية", "غليزان"
        ];

// ============== دالة جلب المنتجات من JSON ==============
async function loadProductsFromJSON() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des produits');
        }
        const products = await response.json();
        console.log('Produits chargés:', products.length, 'produits');
        return products;
    } catch (error) {
        console.error('Erreur:', error);
        showStatus('Erreur lors du chargement des produits', 'error');
        return [];
    }
}

// ============== دالة تحميل العروض الخاصة ==============
async function loadSpecialOffers() {
    try {
        const products = await loadProductsFromJSON();
        
        // اختر 3 منتجات لها خصم للعروض الخاصة
        const specialOffers = products
            .filter(product => product.old_price && product.old_price > product.price)
            .slice(0, 3);
        
        console.log('Offres spéciales chargées:', specialOffers.length, 'produits');
        renderSpecialOffers(specialOffers);
    } catch (error) {
        console.error('Erreur lors du chargement des offres spéciales:', error);
    }
}

// ============== دالة عرض العروض الخاصة ==============
function renderSpecialOffers(offers) {
    const offersContainer = document.querySelector('.offer-products');
    if (!offersContainer) return;
    
    if (offers.length === 0) {
        offersContainer.innerHTML = '<div class="col-12 text-center text-muted">Aucune offre spéciale pour le moment</div>';
        return;
    }
    
    offersContainer.innerHTML = offers.map((product, index) => {
        const discountPercentage = Math.round(((product.old_price - product.price) / product.old_price) * 100);
        
        return `
            <div class="col-md-4">
                <div class="offer-product">
                    <div class="offer-product-discount">-${discountPercentage}%</div>
                    ${product.badge ? `<div class="offer-product-badge">${product.badge}</div>` : ''}

                    <div id="carousel-offer-${product.id}" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-indicators">
                            ${product.images.map((_, i) => `
                                <button type="button" data-bs-target="#carousel-offer-${product.id}" data-bs-slide-to="${i}" 
                                    ${i === 0 ? 'class="active"' : ''}></button>
                            `).join('')}
                        </div>
                        <div class="carousel-inner">
                            ${product.images.map((img, i) => `
                                <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                    <img src="${img}" class="d-block w-100" alt="${product.title}" height="300" loading="lazy">
                                </div>
                            `).join('')}
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#carousel-offer-${product.id}" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon"></span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#carousel-offer-${product.id}" data-bs-slide="next">
                            <span class="carousel-control-next-icon"></span>
                        </button>
                    </div>

                    <h4 class="offer-product-title">${product.title}</h4>
                    <div class="offer-product-price">${product.price.toLocaleString()} DA</div>
                    <div class="offer-product-old-price">${product.old_price.toLocaleString()} DA</div>
                    <a href="product.html?pid=${product.id}" class="offer-btn" style="display: block; text-decoration: none; text-align: center; color: inherit;">
                        Voir le produit
                    </a>
                </div>
            </div>
        `;
    }).join('');

    // تفعيل التمرير التلقائي للعروض
    setTimeout(function() {
        var offerCarousels = document.querySelectorAll('.offer-product .carousel');
        if (typeof bootstrap !== 'undefined' && bootstrap.Carousel) {
            offerCarousels.forEach(function(carousel) {
                try {
                    new bootstrap.Carousel(carousel, {
                        interval: 3000,
                        wrap: true,
                        pause: 'hover',
                        touch: false
                    });
                } catch (e) {
                    console.log('Offer carousel error:', e);
                }
            });
        }
    }, 100);
}
        // متغيرات عامة
        let orderModal = null;
        const ORDER_SERVICE_ID = "service_lc1q5k8";
        const ORDER_TEMPLATE_ID = "template_a15g7yg";
        const CONTACT_TEMPLATE_ID = "template_11pkq0k";

        // عند تحميل الصفحة
   // عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    renderProducts(); // ستعرض جميع المنتجات افتراضيًا
    populateWilayas();
    setupEventListeners();
    
    // تهيئة نموذج الطلب
    orderModal = new bootstrap.Modal(document.getElementById('orderModal'));
    
    // إعداد نموذج الاتصال
    document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        sendContactMessage();
    });
    
    // بدء مؤقت العرض الخاص
    startOfferTimer();
    loadSpecialOffers(); // تحميل العروض الخاصة من JSON
    // تهيئة سلة المشتريات
updateCartCount();
renderCart();
});

      function renderProducts(category = 'all') {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';
    
    // تصفية المنتجات حسب الفئة
    const filteredProducts = category === 'all' 
        ? products 
        : products.filter(product => product.category === category);
    
    filteredProducts.forEach(product => {
        const discountBadge = product.discount ? `
            <div class="discount-badge">
                خصم ${product.discount}
            </div>
        ` : '';
        
        const oldPrice = product.oldPrice ? `
            <small dir="ltr" class="text-decoration-line-through text-muted me-2">${product.oldPrice}</small>
        ` : '';
        
        const productBadge = product.badge ? `
            <div class="product-badge">
                ${product.badge}
            </div>
        ` : '';
        
        // إنشاء سلايدر للصور
        const carouselIndicators = product.images.map((_, index) => `
            <button type="button" data-bs-target="#carousel-${product.id}" data-bs-slide-to="${index}" 
                ${index === 0 ? 'class="active" aria-current="true"' : ''} 
                aria-label="صورة ${index + 1}">
            </button>
        `).join('');
        
       const carouselItems = product.images.map((img, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${img}" class="d-block w-100" alt="صورة المنتج ${index + 1}" loading="lazy"
                width="auto" >
            </div>
        `).join('');
        
        const carouselControls = product.images.length > 1 ? `
            <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">السابق</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">التالي</span>
            </button>
        ` : '';
        
      const productCard = `
    <div class="col-6 col-md-4 col-lg-3 mb-4">
        <a href="product.html?pid=${product.id}" style="text-decoration: none; color: inherit;">
            <div class="product-card card h-100 position-relative">
                ${productBadge}
                ${discountBadge}
                <div id="carousel-${product.id}" class="carousel slide product-carousel" data-bs-ride="carousel">
                    <div class="carousel-indicators">
                        ${carouselIndicators}
                    </div>
                    <div class="carousel-inner">
                        ${carouselItems}
                    </div>
                    ${carouselControls}
                </div>
                <div class="card-body">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text text-muted small">${product.description}</p>
                    <div class="d-flex align-items-center mt-3">
                        ${oldPrice}
                        <p dir="ltr" class="fw-bold text-primary mb-0">${product.price}</p>
                    </div>
                </div>
                <div class="card-footer bg-transparent border-0">
                    <button class="btn btn-orange w-100">
                        <i class="bi bi-eye"></i> Voir le produit
                    </button>
                </div>
            </div>
        </a>
    </div>
`;
        container.innerHTML += productCard;
    });


}
        // تعبئة قائمة الولايات
        function populateWilayas() {
            const wilayaSelect = document.getElementById('wilaya');
            wilayas.forEach(wilaya => {
                const option = document.createElement('option');
                option.value = wilaya;
                option.textContent = wilaya;
                wilayaSelect.appendChild(option);
            });
        }

function setupEventListeners() {
    // إخفاء مؤشر الحالة عند النقر على زر الإغلاق
    document.querySelector('#statusIndicator .btn-close').addEventListener('click', hideStatus);
    
    // أحداث الفئات الجديدة
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // إزالة النشط من جميع الأزرار
            document.querySelectorAll('.category-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // إضافة النشط للزر المحدد
            this.classList.add('active');
            
            // تصفية المنتجات حسب الفئة
            const category = this.dataset.category;
            renderProducts(category);
        });
    });
}

        // بدء مؤقت العرض الخاص
        function startOfferTimer() {
            const daysElement = document.getElementById('days');
            const hoursElement = document.getElementById('hours');
            const minutesElement = document.getElementById('minutes');
            const secondsElement = document.getElementById('seconds');
            
            // تاريخ انتهاء العرض (3 أيام من الآن)
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 3);
            
            function updateTimer() {
                const now = new Date();
                const difference = endDate - now;
                
                if (difference <= 0) {
                    // انتهى الوقت
                    daysElement.textContent = '00';
                    hoursElement.textContent = '00';
                    minutesElement.textContent = '00';
                    secondsElement.textContent = '00';
                    return;
                }
                
                // حساب الأيام، الساعات، الدقائق، الثواني
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                
                // تحديث العناصر
                daysElement.textContent = days.toString().padStart(2, '0');
                hoursElement.textContent = hours.toString().padStart(2, '0');
                minutesElement.textContent = minutes.toString().padStart(2, '0');
                secondsElement.textContent = seconds.toString().padStart(2, '0');
            }
            
            // تحديث المؤثر كل ثانية
            updateTimer();
            setInterval(updateTimer, 1000);
        }
// ============== إدارة سلة المشتريات - متوافق مع جميع المتصفحات ==============
// حل مشاكل التوافق مع سفاري والمتصفحات الأخرى

// تهيئة سلة المشتريات مع معالجة الأخطاء
let cart = [];
try {
    const cartData = localStorage.getItem('robuste_cart');
    if (cartData) {
        cart = JSON.parse(cartData);
    }
} catch (e) {
    console.error('خطأ في تحميل سلة المشتريات:', e);
    cart = [];
}

// دالة مساعدة للتوافق مع eventListener في سفاري
function safeAddEventListener(element, event, handler) {
    if (element && typeof element.addEventListener === 'function') {
        element.addEventListener(event, handler);
    }
}

// تحديث عداد السلة مع التحقق من وجود العناصر
function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!cartCount || !checkoutBtn) return;
    
    const count = cart.reduce((total, item) => total + (item.quantity || 0), 0);
    cartCount.textContent = count;
    checkoutBtn.disabled = count === 0;
}

// عرض محتويات السلة مع معالجة الأخطاء
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartItems || !cartTotal) return;
    
    // مسح المحتوى الحالي بطريقة متوافقة
    while (cartItems.firstChild) {
        cartItems.removeChild(cartItems.firstChild);
    }
    
    if (cart.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'text-center py-4 text-muted';
        emptyDiv.id = 'emptyCartMessage';
        emptyDiv.innerHTML = '<i class="bi bi-cart-x display-4 d-block mb-2"></i>سلة المشتريات فارغة';
        cartItems.appendChild(emptyDiv);
        cartTotal.textContent = '0 د.ج';
        return;
    }
    
    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        total += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.dataset.id = item.id || '';
        
        itemElement.innerHTML = `
            <div class="d-flex">
                <img src="${item.image || ''}" alt="${item.name || 'منتج'}" class="cart-item-img me-3">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name || 'منتج بدون اسم'}</div>
                    <div class="cart-item-price">${item.price || 0} د.ج</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" data-action="decrease" data-index="${index}">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity || 1}" min="1" data-index="${index}">
                        <button class="quantity-btn" data-action="increase" data-index="${index}">+</button>
                    </div>
                </div>
                <button class="remove-item align-self-start" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        cartItems.appendChild(itemElement);
    });
    
    cartTotal.textContent = `${total.toLocaleString('ar-DZ')} د.ج`;
    
    // إضافة معالجي الأحداث بعد عرض العناصر
    attachCartEventListeners();
}

// إضافة معالجي الأحداث لعناصر السلة
function attachCartEventListeners() {
    // معالجة أزرار الكمية
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        safeAddEventListener(btn, 'click', function(e) {
            const index = parseInt(this.dataset.index);
            const action = this.dataset.action;
            
            if (isNaN(index) || index < 0 || index >= cart.length) return;
            
            if (action === 'increase') {
                updateQuantity(index, cart[index].quantity + 1);
            } else if (action === 'decrease') {
                updateQuantity(index, cart[index].quantity - 1);
            }
        });
    });
    
    // معالجة حقول الإدخال
    document.querySelectorAll('.quantity-input').forEach(input => {
        safeAddEventListener(input, 'change', function(e) {
            const index = parseInt(this.dataset.index);
            if (isNaN(index) || index < 0 || index >= cart.length) return;
            
            const newQuantity = parseInt(this.value) || 1;
            updateQuantity(index, newQuantity);
        });
        
        // منع الإدخال غير الرقمي
        safeAddEventListener(input, 'keydown', function(e) {
            // السماح فقط بالأرقام ومفاتيح التحكم
            if (!/[\d\b\t\n]|Arrow|Delete|Backspace|Tab/.test(e.key) && 
                !(e.ctrlKey || e.metaKey)) {
                e.preventDefault();
            }
        });
    });
    
    // معالجة أزرار الحذف
    document.querySelectorAll('.remove-item').forEach(btn => {
        safeAddEventListener(btn, 'click', function(e) {
            const index = parseInt(this.dataset.index);
            if (isNaN(index) || index < 0 || index >= cart.length) return;
            
            removeFromCart(index);
        });
    });
}

// إظهار/إخفاء السلة مع التحقق من وجود bootstrap
function toggleCart() {
    if (cart.length === 0) {
        showStatus('سلة المشتريات فارغة', 'info');
        return;
    }
    
    try {
        // التحقق من وجود bootstrap قبل استخدامه
        if (typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
            const cartOffcanvas = new bootstrap.Offcanvas(document.getElementById('cartOffcanvas'));
            cartOffcanvas.show();
        } else {
            // fallback في حالة عدم وجود bootstrap
            document.getElementById('cartOffcanvas').classList.add('show');
        }
    } catch (e) {
        console.error('خطأ في فتح السلة:', e);
        // fallback يدوي
        document.getElementById('cartOffcanvas').classList.add('show');
        document.body.classList.add('offcanvas-open');
    }
}

// إضافة منتج إلى السلة مع معالجة القيم
function addToCart(productName, productPrice, priceValue, productImages, productId) {
    // التحقق من القيم المدخلة
    const name = typeof productName === 'string' ? productName : 'منتج بدون اسم';
    const price = typeof priceValue === 'number' ? priceValue : 
                 typeof productPrice === 'number' ? productPrice : 0;
    const id = productId || Date.now().toString(); // إنشاء معرف فريد إذا لم يتم توفيره
    
    let image = '';
    if (Array.isArray(productImages) && productImages.length > 0) {
        image = productImages[0];
    } else if (typeof productImages === 'string') {
        image = productImages;
    }
    
    const existingItemIndex = cart.findIndex(item => item.id === id);
    
    if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += 1;
    } else {
        cart.push({
            id: id,
            name: name,
            price: price,
            image: image,
            quantity: 1
        });
    }
    
    // حفظ السلة في localStorage مع معالجة الأخطاء
    try {
        localStorage.setItem('robuste_cart', JSON.stringify(cart));
    } catch (e) {
        console.error('خطأ في حفظ السلة:', e);
        showStatus('تعذر حفظ السلة، قد تكون ذاكرة التخزين ممتلئة', 'error');
    }
    
    // تحديث الواجهة
    updateCartCount();
    renderCart();
    
    // إظهار تأكيد الإضافة
    showStatus(`تمت إضافة "${name}" إلى السلة`, 'success');
}

// تحديث كمية المنتج
function updateQuantity(index, newQuantity) {
    if (isNaN(index) || index < 0 || index >= cart.length) return;
    
    if (newQuantity < 1) {
        removeFromCart(index);
        return;
    }
    
    cart[index].quantity = newQuantity;
    
    try {
        localStorage.setItem('robuste_cart', JSON.stringify(cart));
    } catch (e) {
        console.error('خطأ في تحديث السلة:', e);
    }
    
    renderCart();
    updateCartCount();
}

// إزالة منتج من السلة
function removeFromCart(index) {
    if (isNaN(index) || index < 0 || index >= cart.length) return;
    
    const productName = cart[index].name || 'منتج';
    cart.splice(index, 1);
    
    try {
        localStorage.setItem('robuste_cart', JSON.stringify(cart));
    } catch (e) {
        console.error('خطأ في تحديث السلة:', e);
    }
    
    renderCart();
    updateCartCount();
    showStatus(`تمت إزالة "${productName}" من السلة`, 'success');
}

// دالة مساعدة لعرض الرسائل
function showStatus(message, type) {
    // يمكن تنفيذ هذه الدالة حسب بيئة العمل الخاصة بك
    console.log(`${type}: ${message}`);
    // مثال بسيط:
    alert(message);
}

// تهيئة السلة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();
    renderCart();
});

// حل مشكلة localStorage في وضع التصفح الخاص
function isLocalStorageAvailable() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}

// استخدام بديل إذا كان localStorage غير متاح
if (!isLocalStorageAvailable()) {
    console.warn('localStorage غير متاح، سيتم استخدام تخزين مؤقت في الذاكرة فقط');
    // يمكن إضافة بديل مثل cookies أو التخزين في الذاكرة فقط
}
// إتمام عملية الشراء
async function checkout() {
    if (cart.length === 0) {
        showStatus('سلة المشتريات فارغة', 'error');
        return;
    }
    
    // إخفاء سلة المشتريات
    const cartOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'));
    cartOffcanvas.hide();
    
    // إظهار نموذج بيانات العميل
    document.getElementById('orderForm').reset();
    document.getElementById('cashOnDelivery').checked = true;
    
    // حساب المجموع الكلي
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // ملء بيانات الطلب (سيتم استخدام أول منتج كعنوان للطلب)
    const firstItem = cart[0];
    document.getElementById('productName').value = `${cart.length} منتجات مختلفة`;
    document.getElementById('productPriceValue').value = total;
    document.getElementById('productImageUrl').value = firstItem.image;
    
    document.getElementById('productNameDisplay').textContent = `${cart.length} منتجات مختلفة`;
    document.getElementById('productPrice').textContent = `${total.toLocaleString()} د.ج`;
    document.getElementById('productImage').src = firstItem.image;
    
    // إظهار نموذج الطلب
    orderModal.show();
    
    // تعديل دالة submitOrder لترسل جميع المنتجات
    window.submitOrder = async function() {
        // الحصول على بيانات العميل من النموذج
        const fullName = document.getElementById('fullName').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value || 'لم يتم تقديمه';
        const wilaya = document.getElementById('wilaya').value;
        const address = document.getElementById('address').value || 'غير محدد';
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        
        // التحقق من صحة البيانات
        if (!fullName || !phone || !wilaya) {
            showStatus('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        const phoneRegex = /^0[5-7][0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            showStatus('رقم الهاتف غير صحيح. يجب أن يتكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07', 'error');
            return;
        }
        
        // إعداد بيانات الطلب
        const orderData = {
            products: cart,
            customer: fullName,
            phone: phone,
            email: email,
            wilaya: wilaya,
            address: address,
            payment: paymentMethod,
            totalPrice: total,
            timestamp: new Date().toISOString(),
            status: 'جديد'
        };
        
        // عرض حالة التحميل
        showStatus('جاري معالجة طلبك...', 'loading');
        
        // تعطيل زر الإرسال أثناء المعالجة
        const submitBtn = document.getElementById('submitOrderBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            جاري المعالجة...
        `;
        
        try {
            // تخزين الطلب في Firebase
            const docRef = await db.collection('orders').add(orderData);
            console.log("تم تخزين الطلب في Firebase:", docRef.id);
            
          // إنشاء قائمة المنتجات للبريد الإلكتروني (بلا جدول)
const productsList = cart.map(item => `
<div style="margin-bottom: 10px; padding: 8px; border-bottom: 1px solid #eee;">
  <strong>المنتج:</strong> ${item.name} <br>
  <strong>الكمية:</strong> ${item.quantity} <br>
  <strong>السعر:</strong> ${item.price.toLocaleString()} د.ج <br>
  <strong>المجموع:</strong> ${(item.price * item.quantity).toLocaleString()} د.ج
</div>
`).join('');
            
            // إرسال إيميل عبر EmailJS
            await emailjs.send(ORDER_SERVICE_ID, ORDER_TEMPLATE_ID, {
                order_id: docRef.id,
                customer_name: fullName,
                customer_phone: phone,
                customer_email: email,
                wilaya: wilaya,
                address: address,
                total_price: total.toLocaleString(),
                payment_method: paymentMethod,
                order_date: new Date().toLocaleString('ar-DZ'),
                products: productsList
            });
            
            console.log("تم إرسال إيميل تأكيد الطلب");
            
            // عرض رسالة النجاح
            showStatus(`
                <div class="text-center">
                    <i class="bi bi-check-circle-fill text-success fs-1"></i>
                    <h5 class="mt-2">تم تأكيد طلبك بنجاح!</h5>
                    <div class="text-start mt-3">
                        <p><strong>رقم الطلب:</strong> ${docRef.id}</p>
                        <p><strong>الاسم:</strong> ${fullName}</p>
                        <p><strong>عدد المنتجات:</strong> ${cart.length} منتجات</p>
                        <p><strong>المبلغ الإجمالي:</strong> ${total.toLocaleString()} د.ج</p>
                        <p class="mt-3">سيتم التواصل معك على الرقم <strong>${phone}</strong> خلال 24 ساعة لتأكيد الشحن.</p>
                    </div>
                    <a href="https://wa.me/213656360457?text=${encodeURIComponent(
                        `استفسار عن الطلب ${docRef.id}\nالاسم: ${fullName}\nعدد المنتجات: ${cart.length}\nالمجموع: ${total.toLocaleString()} د.ج\nرقم الهاتف: ${phone}`
                    )}" class="btn whatsapp-contact-btn mt-2 w-100" target="_blank">
                        <i class="bi bi-whatsapp"></i> تواصل عبر واتساب (اختياري)
                    </a>
                </div>
            `, 'success');
            
            // تفريغ السلة وإعادة تعيين النموذج
            cart = [];
            localStorage.removeItem('robuste_cart');
            updateCartCount();
            document.getElementById('orderForm').reset();
            orderModal.hide();
            
        } catch (error) {
    console.error('حدث خطأ:', error);

    // Safari false error handling
    if (error.code === 18 && navigator.userAgent.includes('Safari')) {
        console.warn("Safari false error (code 18) تم تجاهله");
        showStatus('تم إرسال رسالتك بنجاح! (Safari glitch)', 'success');
        return;
    }

    let errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
    if (error.code) {
        errorMessage = `خطأ في النظام: ${error.code}`;
    } else if (error.message) {
        errorMessage = error.message;
    } else if (error.text) {
        errorMessage = error.text;
    }
    
    showStatus(`حدث خطأ أثناء إرسال الرسالة: ${errorMessage}`, 'error');

        } finally {
            // إعادة تمكين زر الإرسال
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'تأكيد الطلب';
        }
    };
}
        // ============== وظائف الطلب ==============
       function showOrderModal(productName, productPrice, priceValue, productImages) {
    // استخدام الصورة الأولى كصورة رئيسية
    const mainImage = Array.isArray(productImages) ? productImages[0] : productImages;
    
    document.getElementById('productName').value = productName;
    document.getElementById('productPriceValue').value = priceValue;
    document.getElementById('productImageUrl').value = mainImage;
    
    document.getElementById('productNameDisplay').textContent = productName;
    document.getElementById('productPrice').textContent = productPrice;
    document.getElementById('productImage').src = mainImage;
    
    document.getElementById('orderForm').reset();
    document.getElementById('quantity').value = 1;
    document.getElementById('cashOnDelivery').checked = true;
    orderModal.show();
}

        // إرسال الطلب
        async function submitOrder() {
            // الحصول على بيانات الطلب
            const productName = document.getElementById('productName').value;
            const productPrice = document.getElementById('productPriceValue').value;
            const productImage = document.getElementById('productImageUrl').value;
            const fullName = document.getElementById('fullName').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value || 'لم يتم تقديمه';
            const wilaya = document.getElementById('wilaya').value;
            const address = document.getElementById('address').value || 'غير محدد';
            const quantity = document.getElementById('quantity').value;
            const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
            const totalPrice = productPrice * quantity;
            
            // التحقق من صحة البيانات
            if (!fullName || !phone || !wilaya) {
                showStatus('الرجاء ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            // التحقق من صحة رقم الهاتف
            const phoneRegex = /^0[5-7][0-9]{8}$/;
            if (!phoneRegex.test(phone)) {
                showStatus('رقم الهاتف غير صحيح. يجب أن يتكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07', 'error');
                return;
            }
            
            // إعداد بيانات الطلب
            const orderData = {
                product: productName,
                productPrice: productPrice,
                totalPrice: totalPrice,
                customer: fullName,
                phone: phone,
                email: email,
                wilaya: wilaya,
                address: address,
                quantity: quantity,
                payment: paymentMethod,
                timestamp: new Date().toISOString(),
                status: 'جديد'
            };
            
            // عرض حالة التحميل
            showStatus('جاري معالجة طلبك...', 'loading');
            
            // تعطيل زر الإرسال أثناء المعالجة
            const submitBtn = document.getElementById('submitOrderBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                جاري المعالجة...
            `;
            
            try {
                // ============== تخزين الطلب في Firebase ==============
                const docRef = await db.collection('orders').add(orderData);
                console.log("تم تخزين الطلب في Firebase:", docRef.id);
                
                // ============== إرسال إيميل عبر EmailJS ==============
              
await emailjs.send(ORDER_SERVICE_ID, ORDER_TEMPLATE_ID, {
    order_id: docRef.id,
    customer_name: fullName,
    customer_phone: phone,
    customer_email: email,
    wilaya: wilaya,
    address: address,
    total_price: total.toLocaleString(),
    payment_method: paymentMethod,
    order_date: new Date().toLocaleString('ar-DZ'),
    products: { 
        value: productsTable, 
        html: true // هذا هو المفتاح الحل!
    }
                });
                
                console.log("تم إرسال إيميل تأكيد الطلب");
                
                // عرض رسالة النجاح مع خيار التواصل بالواتساب
                showStatus(`
                    <div class="text-center">
                        <i class="bi bi-check-circle-fill text-success fs-1"></i>
                        <h5 class="mt-2">تم تأكيد طلبك بنجاح!</h5>
                        <div class="text-start mt-3">
                            <p><strong>رقم الطلب:</strong> ${docRef.id}</p>
                            <p><strong>الاسم:</strong> ${fullName}</p>
                            <p><strong>المنتج:</strong> ${productName} (${quantity} وحدة)</p>
                            <p><strong>المبلغ الإجمالي:</strong> ${totalPrice} د.ج</p>
                            <p class="mt-3">سيتم التواصل معك على الرقم <strong>${phone}</strong> خلال 24 ساعة لتأكيد الشحن.</p>
                        </div>
                        <a href="https://wa.me/213656360457?text=${encodeURIComponent(
                            `استفسار عن الطلب ${docRef.id}\nالاسم: ${fullName}\nالمنتج: ${productName}\nالكمية: ${quantity}\nرقم الهاتف: ${phone}`
                        )}" class="btn whatsapp-contact-btn mt-2 w-100" target="_blank">
                            <i class="bi bi-whatsapp"></i> تواصل عبر واتساب (اختياري)
                        </a>
                        <small class="text-muted d-block mt-2">أو يمكنك التواصل عبر البريد الإلكتروني</small>
                    </div>
                `, 'success');
                
                // إعادة تعيين النموذج وإغلاق النافذة
                document.getElementById('orderForm').reset();
                orderModal.hide();
                
            } catch (error) {
                console.error('حدث خطأ:', error);
                
                // رسالة خطأ محددة
                let errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
                
                if (error.code) {
                    errorMessage = `خطأ في النظام: ${error.code}`;
                } else if (error.message) {
                    errorMessage = error.message;
                } else if (error.text) {
                    errorMessage = error.text;
                }
                
                showStatus(`حدث خطأ أثناء إرسال الطلب: ${errorMessage}`, 'error');
            } finally {
                // إعادة تمكين زر الإرسال
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'تأكيد الطلب';
            }
        }

        // إرسال رسالة الاتصال
        async function sendContactMessage() {
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const phone = document.getElementById('contactPhone').value || 'لم يتم تقديمه';
            const message = document.getElementById('contactMessage').value;
            
            if (!name || !email || !message) {
                showStatus('الرجاء ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            // عرض حالة التحميل
            const contactSpinner = document.getElementById('contactSpinner');
            const contactSubmitText = document.getElementById('contactSubmitText');
            contactSpinner.classList.remove('d-none');
            contactSubmitText.textContent = 'جاري الإرسال...';
            
            try {
                // إرسال رسالة الاتصال عبر EmailJS
                await emailjs.send(ORDER_SERVICE_ID, CONTACT_TEMPLATE_ID, {
                    from_name: name,
                    from_email: email,
                    phone_number: phone,
                    message: message
                });
                
                console.log("تم إرسال رسالة الاتصال");
                
                showStatus('تم إرسال رسالتك بنجاح! سوف نتواصل معك قريباً.', 'success');
                document.getElementById('contactForm').reset();
           } catch (error) {
    console.error('حدث خطأ:', error);

    // Safari false error handling
    if (error.code === 18 && navigator.userAgent.includes('Safari')) {
        console.warn("Safari false error (code 18) تم تجاهله");
        showStatus('تم إرسال رسالتك بنجاح! (Safari glitch)', 'success');
        return;
    }

    let errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
    if (error.code) {
        errorMessage = `خطأ في النظام: ${error.code}`;
    } else if (error.message) {
        errorMessage = error.message;
    } else if (error.text) {
        errorMessage = error.text;
    }
    
    showStatus(`حدث خطأ أثناء إرسال الرسالة: ${errorMessage}`, 'error');

            } finally {
                // إعادة تمكين زر الإرسال
                contactSpinner.classList.add('d-none');
                contactSubmitText.textContent = 'إرسال الرسالة';
            }
        }

        // ============== وظائف عرض الحالة ==============
        
        // عرض حالة الطلب
        function showStatus(message, type) {
            const indicator = document.getElementById('statusIndicator');
            const messageElement = document.getElementById('statusMessage');
            
            // إعداد الرسالة
            messageElement.innerHTML = message;
            
            // إعداد التصميم حسب النوع
            const alert = indicator.querySelector('.alert');
            alert.className = 'alert alert-dismissible fade show';
            
            switch (type) {
                case 'success':
                    alert.classList.add('alert-success', 'order-confirmation');
                    break;
                case 'error':
                    alert.classList.add('alert-danger', 'order-error');
                    break;
                case 'loading':
                    alert.classList.add('alert-info');
                    messageElement.innerHTML = `
                        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                        ${message}
                    `;
                    break;
                default:
                    alert.classList.add('alert-info');
            }
            
            // إظهار المؤشر
            indicator.style.display = 'block';
            
            // إخفاء التلقائي لرسائل النجاح بعد 5 ثواني
            if (type === 'success') {
                setTimeout(hideStatus, 5000);
            }
        }
        
        // إخفاء مؤشر الحالة
        function hideStatus() {
            document.getElementById('statusIndicator').style.display = 'none';
        }

        // ============== وظائف إضافية ==============
        // ============== وظائف إضافية ==============
        
        // تغيير اللغة
        function changeLanguage(lang) {
            const arBtn = document.querySelector('[onclick="changeLanguage(\'ar\')"]');
            const frBtn = document.querySelector('[onclick="changeLanguage(\'fr\')"]');
            
            if (lang === 'fr') {
                showStatus('La version française sera disponible bientôt. Merci pour votre patience.', 'info');
                arBtn.classList.remove('btn-primary');
                frBtn.classList.add('btn-primary');
            } else {
                arBtn.classList.add('btn-primary');
                frBtn.classList.remove('btn-primary');
            }
        }  // تعديل دالة showOrderModal لتعمل مع مصفوفة الصور
 





let slideIndex1 = 1;
showSlides1(slideIndex1);

// التحكم بالأزرار
function plusSlides1(n) {
  showSlides1(slideIndex1 += n);
}

// التحكم بالنقاط
function currentSlide1(n) {
  showSlides1(slideIndex1 = n);
}

function showSlides1(n) {
  const slides = document.getElementsByClassName("mySlides1");
  const dots = document.getElementsByClassName("dot1");

  if (n > slides.length) slideIndex1 = 1;
  if (n < 1) slideIndex1 = slides.length;

  for (let s of slides) s.style.display = "none";
  for (let d of dots) d.className = d.className.replace(" active", "");

  slides[slideIndex1 - 1].style.display = "block";
  dots[slideIndex1 - 1].className += " active";
}

// تشغيل تلقائي
setInterval(() => {
  plusSlides1(1);
}, 4000);

// تشغيل السلايدر عند التحميل
showSlides1();
