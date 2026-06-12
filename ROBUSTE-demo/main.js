(function() {
    'use strict';

    // ============== تهيئة Firebase ==============
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
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        try {
            firebase.initializeApp(firebaseConfig);
            var db = firebase.firestore();
        } catch (e) {
            console.error('خطأ في تهيئة Firebase:', e);
        }
    }

    // تهيئة EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init("k77vdaUWPpnLrfTnS");
    }

    // قائمة الولايات الجزائرية
    var wilayas = [
        "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "البليدة",
        "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل",
        "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم",
        "المسيلة", "معسكر", "ورقلة", "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف",
        "تيندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة",
        "عين تموشنت", "غرداية", "غليزان"
    ];

    // ============== المتغيرات العامة ==============
    var orderModal = null;
    var cart = [];
    var isProcessing = false;
    var lastActionTime = 0;
    var lastActionElement = null;

    // ============== نظام المنتجات الديناميكي ==============

    // دالة جلب وعرض المنتجات من JSON
    function loadAndDisplayProducts(category) {
        if (!category) category = 'all';
        
        fetch('products.json')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des produits');
                }
                return response.json();
            })
            .then(function(products) {
                // تصفية المنتجات حسب الفئة
                var filteredProducts;
                if (category === 'all') {
                    filteredProducts = products;
                } else {
                    filteredProducts = products.filter(function(product) {
                        return product.category === category;
                    });
                }
                
                renderProducts(filteredProducts);
            })
            .catch(function(error) {
                console.error('Erreur:', error);
                showStatus('Erreur lors du chargement des produits', 'error');
            });
    }

    // دالة عرض المنتجات
    function renderProducts(products) {
        var container = document.getElementById('productsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">Aucun produit trouvé</div>';
            return;
        }
        
        for (var i = 0; i < products.length; i++) {
            var product = products[i];
            var discountBadge = '';
            var oldPrice = '';
            var productBadge = '';
            
            if (product.old_price && product.old_price > product.price) {
                var discountPercentage = Math.round(((product.old_price - product.price) / product.old_price) * 100);
                discountBadge = '<div class="discount-badge">-' + discountPercentage + '%</div>';
                oldPrice = '<small dir="ltr" class="old-price text-decoration-line-through text-muted">' + product.old_price.toLocaleString() + ' DA</small>';
            }
            
            if (product.badge) {
                productBadge = '<div class="product-badge">' + product.badge + '</div>';
            }

            // حالة المخزون
            var stockStatus = product.stock > 0 ? 'متوفر' : 'غير متوفر';
            var stockBadgeClass = product.stock > 0 ? 'stock-available' : 'stock-unavailable';
            var stockBadge = '<div class="stock-badge ' + stockBadgeClass + '">' + stockStatus + '</div>';
            
            // إنشاء سلايدر للصور
            var carouselIndicators = '';
            var carouselItems = '';
            var carouselControls = '';
            
            for (var j = 0; j < product.images.length; j++) {
                carouselIndicators += '<button type="button" data-bs-target="#carousel-' + product.id + '" data-bs-slide-to="' + j + '" ' + 
                    (j === 0 ? 'class="active" aria-current="true"' : '') + 
                    ' aria-label="صورة ' + (j + 1) + '"></button>';
                
                carouselItems += '<div class="carousel-item ' + (j === 0 ? 'active' : '') + '">' +
                    '<img src="' + product.images[j] + '" class="d-block w-100" alt="' + product.title + '" loading="lazy">' +
                    '</div>';
            }
            
            if (product.images.length > 1) {
                carouselControls = '<button class="carousel-control-prev" type="button" data-bs-target="#carousel-' + product.id + '" data-bs-slide="prev">' +
                    '<span class="carousel-control-prev-icon" aria-hidden="true"></span>' +
                    '<span class="visually-hidden">السابق</span>' +
                    '</button>' +
                    '<button class="carousel-control-next" type="button" data-bs-target="#carousel-' + product.id + '" data-bs-slide="next">' +
                    '<span class="carousel-control-next-icon" aria-hidden="true"></span>' +
                    '<span class="visually-hidden">التالي</span>' +
                    '</button>';
            }
            
            // إضافة التمرير التلقائي
            var carouselAutoPlay = '';
            if (product.images.length > 1) {
                carouselAutoPlay = ' data-bs-ride="carousel" data-bs-interval="3000"';
            }
            
            var productCard = '<div class="col-6 col-md-4 col-lg-3 mb-4">' +
                '<div class="product-card card h-100 position-relative" role="link" tabindex="0" data-pid="' + product.id + '">' +
                productBadge + discountBadge + stockBadge +
                '<div id="carousel-' + product.id + '" class="carousel slide"' + carouselAutoPlay + '>' +
                '<div class="carousel-indicators">' + carouselIndicators + '</div>' +
                '<div class="carousel-inner">' + carouselItems + '</div>' +
                carouselControls +
                '</div>' +
                '<div class="product-info">' +
                '<h5 class="product-title">' + product.title + '</h5>' +
                '<div class="price-section">' +
                oldPrice +
                '<p dir="ltr" class="current-price">' + product.price.toLocaleString() + ' DA</p>' +
                '</div>' +
                '</div>' +
                '<div class="card-footer bg-transparent border-0 mt-auto">' +
                '<button class="btn btn-orange add-to-cart-btn" data-id="' + product.id + '" aria-label="Ajouter ' + product.title + ' au panier"' + (product.stock > 0 ? '' : ' disabled') + '>' +
                '<i class="bi bi-cart-plus"></i> Ajouter' +
                '</button>' +
                '</div>' +
                '</div>' +
                '</div>';
            
            container.innerHTML += productCard;
        }

        // إضافة تحسينات اللمس بعد عرض المنتجات
        addTouchEffects();
        
        // تهيئة الكاروسيلات
        initializeCarousels();
    }

    // دالة تحميل العروض الخاصة
    function loadSpecialOffers() {
        fetch('products.json')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des produits');
                }
                return response.json();
            })
            .then(function(products) {
                var specialOffers = [];
                for (var i = 0; i < products.length; i++) {
                    var product = products[i];
                    if (product.old_price && product.old_price > product.price) {
                        specialOffers.push(product);
                        if (specialOffers.length >= 3) break;
                    }
                }
                renderSpecialOffers(specialOffers);
            })
            .catch(function(error) {
                console.error('Erreur lors du chargement des offres spéciales:', error);
            });
    }

    // دالة عرض العروض الخاصة
    function renderSpecialOffers(offers) {
        var offersContainer = document.getElementById('specialOffersContainer');
        if (!offersContainer) return;
        
        if (offers.length === 0) {
            offersContainer.innerHTML = '<div class="col-12 text-center text-muted">Aucune offre spéciale pour le moment</div>';
            return;
        }
        
        offersContainer.innerHTML = '';
        
        for (var i = 0; i < offers.length; i++) {
            var product = offers[i];
            var discountPercentage = Math.round(((product.old_price - product.price) / product.old_price) * 100);
            
            var carouselIndicators = '';
            var carouselItems = '';
            
            for (var j = 0; j < product.images.length; j++) {
                carouselIndicators += '<button type="button" data-bs-target="#carousel-offer-' + product.id + '" data-bs-slide-to="' + j + '" ' + 
                    (j === 0 ? 'class="active"' : '') + '></button>';
                
                carouselItems += '<div class="carousel-item ' + (j === 0 ? 'active' : '') + '">' +
                    '<img src="' + product.images[j] + '" class="d-block w-100" alt="' + product.title + '" height="300" loading="lazy">' +
                    '</div>';
            }
            
            var productBadge = product.badge ? '<div class="offer-product-badge">' + product.badge + '</div>' : '';
            
            var offerHTML = '<div class="col-md-4">' +
                '<div class="offer-product">' +
                '<div class="offer-product-discount">-' + discountPercentage + '%</div>' +
                productBadge +
                '<div id="carousel-offer-' + product.id + '" class="carousel slide" data-bs-ride="carousel">' +
                '<div class="carousel-indicators">' + carouselIndicators + '</div>' +
                '<div class="carousel-inner">' + carouselItems + '</div>' +
                '<button class="carousel-control-prev" type="button" data-bs-target="#carousel-offer-' + product.id + '" data-bs-slide="prev">' +
                '<span class="carousel-control-prev-icon"></span>' +
                '</button>' +
                '<button class="carousel-control-next" type="button" data-bs-target="#carousel-offer-' + product.id + '" data-bs-slide="next">' +
                '<span class="carousel-control-next-icon"></span>' +
                '</button>' +
                '</div>' +
                '<h4 class="offer-product-title">' + product.title + '</h4>' +
                '<div class="offer-product-price">' + product.price.toLocaleString() + ' DA</div>' +
                '<div class="offer-product-old-price">' + product.old_price.toLocaleString() + ' DA</div>' +
                '<button class="offer-btn add-to-cart-btn" data-id="' + product.id + '">' +
                '<i class="bi bi-cart-plus"></i> Acheter maintenant' +
                '</button>' +
                '</div>' +
                '</div>';
            
            offersContainer.innerHTML += offerHTML;
        }
        initOfferProducts();
    }

    // ============== إعداد نظام الفئات ==============
    function setupCategoryFilters() {
        var categoryBtns = document.querySelectorAll('.category-btn');
        for (var i = 0; i < categoryBtns.length; i++) {
            categoryBtns[i].addEventListener('click', handleCategoryClick);
            categoryBtns[i].addEventListener('touchstart', handleCategoryTouch, { passive: true });
        }
    }

    function handleCategoryClick(e) {
        e.preventDefault();
        
        if (isProcessing) return;
        isProcessing = true;
        
        var now = Date.now();
        if (now - lastActionTime < 500 && this === lastActionElement) {
            isProcessing = false;
            return;
        }
        
        lastActionTime = now;
        lastActionElement = this;
        
        var categoryBtns = document.querySelectorAll('.category-btn');
        for (var i = 0; i < categoryBtns.length; i++) {
            categoryBtns[i].classList.remove('active');
        }
        
        this.classList.add('active');
        
        var category = this.getAttribute('data-category');
        loadAndDisplayProducts(category);
        
        setTimeout(function() {
            isProcessing = false;
        }, 300);
    }

    function handleCategoryTouch(e) {
        e.preventDefault();
        this.classList.add('touch-feedback');
        setTimeout(function(btn) {
            btn.classList.remove('touch-feedback');
        }.bind(null, this), 200);
    }

    // ============== إضافة تأثيرات اللمس ==============
    function addTouchEffects() {
        // تحسين لمس بطاقات المنتجات
        var productCards = document.querySelectorAll('.product-card');
        for (var i = 0; i < productCards.length; i++) {
            var card = productCards[i];

            // رد فعل اللمس
            card.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
                this.style.transition = 'transform 0.1s ease';
            }, { passive: true });

            card.addEventListener('touchend', function() {
                this.style.transform = '';
                this.style.transition = '';
            }, { passive: true });

            card.addEventListener('touchcancel', function() {
                this.style.transform = '';
                this.style.transition = '';
            }, { passive: true });

            // تحسين ביצוע التمرير
            card.style.touchAction = 'pan-y pinch-zoom';

            // منع حالات التأرجح العالقة
            card.addEventListener('touchstart', function(e) {
                // إزالة أي حالة hover قد تكون عالقة
                this.classList.remove('hover');
            }, { passive: true });
        }

        // تحسين لمس عروض المنتجات الخاصة - using CSS :active instead

        // تحسين لمس أزرار الفئات
        var categoryBtns = document.querySelectorAll('.category-btn');
        for (var i = 0; i < categoryBtns.length; i++) {
            var btn = categoryBtns[i];

            btn.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.96)';
            }, { passive: true });

            btn.addEventListener('touchend', function() {
                this.style.transform = '';
            }, { passive: true });

            btn.addEventListener('touchcancel', function() {
                this.style.transform = '';
            }, { passive: true });
        }

        // منع النقر المزدوج العرضي لأزرار الإضافة إلى السلة
        var addToCartBtns = document.querySelectorAll('.add-to-cart-btn, .offer-btn');
        for (var i = 0; i < addToCartBtns.length; i++) {
            addToCartBtns[i].addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.96)';
            }, { passive: true });

            addToCartBtns[i].addEventListener('touchend', function() {
                this.style.transform = '';
            }, { passive: true });

            addToCartBtns[i].addEventListener('click', function(e) {
                if (this.dataset.clicked) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return;
                }
                this.dataset.clicked = true;
                setTimeout(() => delete this.dataset.clicked, 300);
            }, { passive: false });
        }

        // منع النقرات الشبحية العامة
        document.addEventListener('click', function(e) {
            // إذا كان العنصر له بيانات noprocessing، تجاهل النقر
            if (e.target.hasAttribute('data-noprocessing') ||
                e.target.closest('[data-noprocessing]')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        }, true);
    }

    // ============== إعداد أزرار إضافة إلى السلة ==============
    function setupAddToCartButtons() {
        // استخدام event delegation لجميع أزرار إضافة إلى السلة
        document.addEventListener('click', handleAddToCart);
        document.addEventListener('touchstart', handleAddToCartTouch, { passive: true });
    }

    function handleAddToCart(e) {
        var button = null;
        
        // البحث عن زر add-to-cart-btn
        if (e.target.matches('.add-to-cart-btn')) {
            button = e.target;
        } else if (e.target.closest('.add-to-cart-btn')) {
            button = e.target.closest('.add-to-cart-btn');
        }
        
        if (!button) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        if (isProcessing) return;
        isProcessing = true;
        
        var now = Date.now();
        if (now - lastActionTime < 500 && button === lastActionElement) {
            isProcessing = false;
            return;
        }
        
        lastActionTime = now;
        lastActionElement = button;
        
        var productId = button.getAttribute('data-id');
        if (!productId) {
            console.warn('add-to-cart button without data-id', button);
            isProcessing = false;
            return;
        }
        
        fetch('products.json')
            .then(function(response) {
                if (!response.ok) throw new Error('Failed to load products.json');
                return response.json();
            })
            .then(function(products) {
                var product = null;
                for (var i = 0; i < products.length; i++) {
                    if (products[i].id == productId) {
                        product = products[i];
                        break;
                    }
                }
                if (product) {
                    addToCart(
                        product.title,
                        product.price.toLocaleString() + ' DA',
                        product.price,
                        product.images,
                        product.id
                    );
                } else {
                    console.warn('Product not found for id', productId);
                    showStatus('Produit introuvable', 'error');
                }
            })
            .catch(function(error) {
                console.error('Error loading product:', error);
                showStatus('Error loading product details', 'error');
            })
            .finally(function() {
                setTimeout(function() {
                    isProcessing = false;
                }, 300);
            });
    }

    function handleAddToCartTouch(e) {
        var button = null;
        
        if (e.target.matches('.add-to-cart-btn')) {
            button = e.target;
        } else if (e.target.closest('.add-to-cart-btn')) {
            button = e.target.closest('.add-to-cart-btn');
        }
        
        if (button) {
            button.classList.add('touch-feedback');
            setTimeout(function() {
                button.classList.remove('touch-feedback');
            }, 200);
        }
    }

    // ============== إدارة سلة المشتريات ==============

    // تحميل السلة من localStorage
    function loadCart() {
        try {
            var cartData = localStorage.getItem('robuste_cart');
            if (cartData) {
                cart = JSON.parse(cartData);
            }
        } catch (e) {
            console.error('خطأ في تحميل سلة المشتريات:', e);
            cart = [];
        }
    }

    // تحديث عداد السلة
    function updateCartCount() {
        var cartCountFloat = document.getElementById('cartCountFloat');
        var checkoutBtn = document.getElementById('checkoutBtn');
        
        if (!checkoutBtn) return;
        
        var count = 0;
        for (var i = 0; i < cart.length; i++) {
            count += cart[i].quantity || 0;
        }
        if (cartCountFloat) cartCountFloat.textContent = count;
        checkoutBtn.disabled = count === 0;
        
        // إضافة فئة للزر إذا كان فارغاً
        if (count === 0) {
            checkoutBtn.classList.add('disabled');
        } else {
            checkoutBtn.classList.remove('disabled');
        }
    }

    // عرض محتويات السلة
    function renderCart() {
        var cartItems = document.getElementById('cartItems');
        var cartTotal = document.getElementById('cartTotal');

        if (!cartItems || !cartTotal) return;

        // مسح المحتوى الحالي
        while (cartItems.firstChild) {
            cartItems.removeChild(cartItems.firstChild);
        }

        if (cart.length === 0) {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-center py-5';
            emptyDiv.id = 'emptyCartMessage';
            emptyDiv.innerHTML = '<i class="bi bi-cart-x display-4 d-block mb-4" style="font-size: 4rem; opacity: 0.3;"></i>' +
                                '<h4 class="mb-3">سلة التسوق فارغة</h4>' +
                                '<p class="text-muted mb-4">لم تقم بإضافة أي منتجات إلى السلة بعد</p>' +
                                '<a href="#products" class="btn btn-orange btn-lg px-5 py-2" id="emptyCartBtn">' +
                                '<i class="bi bi-cart-plus me-2"></i> استكشف المنتجات' +
                                '</a>';
            cartItems.appendChild(emptyDiv);
            cartTotal.textContent = '0 د.ج';
            return;
        }
        
        var total = 0;
        for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            var itemTotal = (item.price || 0) * (item.quantity || 0);
            total += itemTotal;
            
            var itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.setAttribute('data-id', item.id || '');
            
            itemElement.innerHTML = '<div class="d-flex align-items-center">' +
                '<img src="' + (item.image || '') + '" alt="' + (item.name || 'منتج') + '" class="cart-item-img me-3" loading="lazy">' +
                '<div class="cart-item-details flex-grow-1">' +
                '<div class="cart-item-title mb-1">' + (item.name || 'منتج بدون اسم') + '</div>' +
                '<div class="cart-item-price mb-2">' + (item.price || 0) + ' د.ج</div>' +
                '<div class="quantity-controls d-flex align-items-center">' +
                '<button class="quantity-btn decrease-btn" data-index="' + i + '">-</button>' +
                '<input type="number" class="quantity-input mx-2" value="' + (item.quantity || 1) + '" min="1" data-index="' + i + '" readonly>' +
                '<button class="quantity-btn increase-btn" data-index="' + i + '">+</button>' +
                '</div>' +
                '</div>' +
                '<button class="remove-item-btn ms-2" data-index="' + i + '">' +
                '<i class="bi bi-trash"></i>' +
                '</button>' +
                '</div>';
            
            cartItems.appendChild(itemElement);
        }
        
        cartTotal.textContent = total.toLocaleString('ar-DZ') + ' د.ج';
        
        // إضافة معالجي الأحداث بعد عرض العناصر
        attachCartEventListeners();
    }

    // إضافة معالجي الأحداث لعناصر السلة
    function attachCartEventListeners() {
        var quantityBtns = document.querySelectorAll('.quantity-btn');
        for (var i = 0; i < quantityBtns.length; i++) {
            quantityBtns[i].addEventListener('click', handleQuantityClick);
            quantityBtns[i].addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.9)';
            }, { passive: true });
            quantityBtns[i].addEventListener('touchend', function() {
                this.style.transform = '';
            }, { passive: true });
        }
        
        var removeBtns = document.querySelectorAll('.remove-item-btn');
        for (var k = 0; k < removeBtns.length; k++) {
            removeBtns[k].addEventListener('click', handleRemoveClick);
            removeBtns[k].addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.9)';
            }, { passive: true });
            removeBtns[k].addEventListener('touchend', function() {
                this.style.transform = '';
            }, { passive: true });
        }
    }

    function handleQuantityClick(e) {
        e.preventDefault();
        
        if (isProcessing) return;
        isProcessing = true;
        
        var index = parseInt(this.getAttribute('data-index'), 10);
        if (isNaN(index) || index < 0 || index >= cart.length) {
            isProcessing = false;
            return;
        }
        
        if (this.classList.contains('increase-btn')) {
            updateQuantity(index, cart[index].quantity + 1);
        } else if (this.classList.contains('decrease-btn')) {
            updateQuantity(index, cart[index].quantity - 1);
        }
        
        setTimeout(function() {
            isProcessing = false;
        }, 200);
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
        
        var productName = cart[index].name || 'منتج';
        cart.splice(index, 1);
        
        try {
            localStorage.setItem('robuste_cart', JSON.stringify(cart));
        } catch (e) {
            console.error('خطأ في تحديث السلة:', e);
        }
        
        renderCart();
        updateCartCount();
        showStatus('تمت إزالة "' + productName + '" من السلة', 'success');
    }

    function handleRemoveClick(e) {
        e.preventDefault();
        
        if (isProcessing) return;
        isProcessing = true;
        
        var index = parseInt(this.getAttribute('data-index'), 10);
        if (isNaN(index) || index < 0 || index >= cart.length) {
            isProcessing = false;
            return;
        }
        
        removeFromCart(index);
        
        setTimeout(function() {
            isProcessing = false;
        }, 200);
    }

    // إضافة منتج إلى السلة
    function addToCart(productName, productPrice, priceValue, productImages, productId) {
        var name = typeof productName === 'string' ? productName : 'منتج بدون اسم';
        var price = typeof priceValue === 'number' ? priceValue : 
                   typeof productPrice === 'number' ? productPrice : 0;
        var id = productId || Date.now().toString();
        
        var image = '';
        if (Array.isArray(productImages) && productImages.length > 0) {
            image = productImages[0];
        } else if (typeof productImages === 'string') {
            image = productImages;
        }
        
        var existingItemIndex = -1;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === id) {
                existingItemIndex = i;
                break;
            }
        }
        
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
        
        // حفظ السلة في localStorage
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
        showStatus('تمت إضافة "' + name + '" إلى السلة', 'success');
    }

    // إظهار/إخفاء السلة
    var cartOffcanvasInstance = null;

    function toggleCart(forceOpen) {
        try {
            var cartElement = document.getElementById('cartOffcanvas');
            if (!cartElement) return;
            if (typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
                if (!cartOffcanvasInstance) {
                    cartOffcanvasInstance = new bootstrap.Offcanvas(cartElement);
                    cartElement.addEventListener('hidden.bs.offcanvas', function() {
                        var backdrops = document.querySelectorAll('.offcanvas-backdrop');
                        for (var i = 0; i < backdrops.length; i++) {
                            backdrops[i].remove();
                        }
                        document.body.classList.remove('offcanvas-open', 'modal-open');
                    });
                }
                cartOffcanvasInstance.show();
            } else {
                cartElement.classList.add('show');
                document.body.classList.add('offcanvas-open');
            }
        } catch (e) {
            console.error('خطأ في فتح السلة:', e);
            document.getElementById('cartOffcanvas').classList.add('show');
            document.body.classList.add('offcanvas-open');
        }
    }

    // ============== إتمام عملية الشراء من السلة ==============
    function checkout() {
        if (cart.length === 0) {
            showStatus('سلة المشتريات فارغة', 'error');
            return;
        }
        
        if (isProcessing) return;
        isProcessing = true;
        
        // إخفاء سلة المشتريات
        try {
            var cartElement = document.getElementById('cartOffcanvas');
            if (typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
                var cartOffcanvas = bootstrap.Offcanvas.getInstance(cartElement);
                if (cartOffcanvas) {
                    cartOffcanvas.hide();
                }
            } else {
                cartElement.classList.remove('show');
                document.body.classList.remove('offcanvas-open');
            }
        } catch (e) {}
        
        // إعداد بيانات الطلب
        var firstItem = cart[0];
        var total = 0;
        for (var i = 0; i < cart.length; i++) {
            total += cart[i].price * cart[i].quantity;
        }
        
        // ملء نموذج الطلب
        document.getElementById('productName').value = cart.length + ' منتجات مختلفة';
        document.getElementById('productPriceValue').value = total;
        document.getElementById('productImageUrl').value = firstItem.image;
        
        document.getElementById('productNameDisplay').textContent = cart.length + ' منتجات مختلفة';
        document.getElementById('productPrice').textContent = total.toLocaleString() + ' DA';
        document.getElementById('productImage').src = firstItem.image;
        
        // إعادة تعيين النموذج
        document.getElementById('orderForm').reset();
        document.getElementById('cashOnDelivery').checked = true;
        
        // إظهار نموذج الطلب
        if (orderModal) {
            orderModal.show();
        }
        
        setTimeout(function() {
            isProcessing = false;
        }, 300);
    }

    // ============== وظائف الطلب ==============

    // إرسال الطلب
    var isSubmittingOrder = false;
    function submitOrder() {
        if (isSubmittingOrder) { return; }
        var fullName = document.getElementById('fullName').value;
        var phone = document.getElementById('phone').value;
        var email = document.getElementById('email').value || 'لم يتم تقديمه';
        var wilaya = document.getElementById('wilaya').value;
        var address = document.getElementById('address').value || 'غير محدد';
        
        var paymentMethodElement = document.querySelector('input[name="paymentMethod"]:checked');
        if (!paymentMethodElement) {
            showStatus('يرجى اختيار طريقة الدفع', 'error');
            return;
        }
        var paymentMethod = paymentMethodElement.value;
        
        // التحقق من صحة البيانات
        if (!fullName || !phone || !wilaya) {
            showStatus('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        var phoneRegex = /^0[5-7][0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            showStatus('رقم الهاتف غير صحيح. يجب أن يتكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07', 'error');
            return;
        }
        
        // حساب المجموع الكلي
        var total = 0;
        for (var i = 0; i < cart.length; i++) {
            total += cart[i].price * cart[i].quantity;
        }
        
        // إعداد بيانات الطلب
        var orderData = {
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
        isSubmittingOrder = true;
        var submitBtn = document.getElementById('submitOrderBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>جاري المعالجة...';
        }
        
        try { if (typeof window.sendOrderToTelegram === 'function') { window.sendOrderToTelegram(orderData); } } catch (e) {}
        
        var orderId = 'ORD-' + Date.now();
        
        if (typeof db !== 'undefined') {
            // تخزين الطلب في Firebase
            db.collection('orders').add(orderData)
                .then(function(docRef) {
                    console.log("تم تخزين الطلب في Firebase:", docRef.id);
                    orderId = docRef.id;
                    return sendOrderEmail(orderId, fullName, phone, email, wilaya, address, total, paymentMethod);
                })
                .then(function() {
                    showSuccessMessage(orderId, fullName, phone, total);
                    clearCartAndResetForm();
                })
                .catch(function(error) {
                    handleOrderError(error, submitBtn);
                });
        } else {
            // Fallback إذا لم يكن Firebase متاحاً
            setTimeout(function() {
                try {
                    sendOrderEmail(orderId, fullName, phone, email, wilaya, address, total, paymentMethod)
                        .then(function() {
                            showSuccessMessage(orderId, fullName, phone, total);
                            clearCartAndResetForm();
                        })
                        .catch(function(error) {
                            handleOrderError(error, submitBtn);
                        });
                } catch (error) {
                    handleOrderError(error, submitBtn);
                }
            }, 500);
        }
    }

    function sendOrderEmail(orderId, fullName, phone, email, wilaya, address, total, paymentMethod) {
        // إنشاء قائمة المنتجات للبريد الإلكتروني
        var productsList = '';
        for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            productsList += '<div style="margin-bottom: 10px; padding: 8px; border-bottom: 1px solid #eee;">' +
                '<strong>المنتج:</strong> ' + item.name + ' <br>' +
                '<strong>الكمية:</strong> ' + item.quantity + ' <br>' +
                '<strong>السعر:</strong> ' + item.price.toLocaleString() + ' د.ج <br>' +
                '<strong>المجموع:</strong> ' + (item.price * item.quantity).toLocaleString() + ' د.ج' +
                '</div>';
        }
        
        // إرسال إيميل عبر EmailJS
        if (typeof emailjs !== 'undefined') {
            return emailjs.send("service_lc1q5k8", "template_a15g7yg", {
                order_id: orderId,
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
        } else {
            return Promise.resolve();
        }
    }

    function showSuccessMessage(orderId, fullName, phone, total) {
        var successMessage = '<div class="text-center" style="padding:6px 4px;">' +
            '<div style="font-size:3.2rem;line-height:1;color:#2e7d32;"><i class="bi bi-check-circle-fill"></i></div>' +
            '<h3 style="margin-top:10px;font-weight:800;color:#2e7d32;font-size:clamp(1.4rem,5vw,2rem);">تم تأكيد طلبكم</h3>' +
            '<p style="font-size:clamp(1rem,3vw,1.2rem);font-weight:600;color:#2e7d32;margin:8px 0 2px;">سنتواصل معكم قريباً على رقمكم الخاص</p>' +
            '<p style="font-size:1.05rem;font-weight:700;color:#1b5e20;margin:0 0 4px;direction:ltr;">' + phone + '</p>' +
            '<p style="font-size:1.1rem;font-weight:700;color:#2e7d32;margin:4px 0 12px;">شكراً لثقتكم بنا</p>' +
            '<div style="background:rgba(46,125,50,.08);border-radius:12px;padding:10px 14px;text-align:start;font-size:.92rem;color:#444;display:inline-block;">' +
            '<div><strong>رقم الطلب:</strong> ' + orderId + '</div>' +
            '<div><strong>المبلغ الإجمالي:</strong> ' + total.toLocaleString() + ' د.ج</div>' +
            '</div>' +
            '<a href="https://wa.me/213656360457?text=' + encodeURIComponent(
                'استفسار عن الطلب ' + orderId + '\nالاسم: ' + fullName + '\nعدد المنتجات: ' + cart.length + '\nالمجموع: ' + total.toLocaleString() + ' د.ج\nرقم الهاتف: ' + phone
            ) + '" class="btn whatsapp-contact-btn mt-2 w-100" target="_blank">' +
            '<i class="bi bi-whatsapp"></i> تواصل عبر واتساب (اختياري)' +
            '</a>' +
            '</div>';
        
        showStatus(successMessage, 'success');
        
        // إعادة تعيين زر الإرسال
        isSubmittingOrder = false;
        var submitBtn = document.getElementById('submitOrderBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'تأكيد الطلب';
        }
    }

    function clearCartAndResetForm() {
        cart = [];
        localStorage.removeItem('robuste_cart');
        updateCartCount();
        document.getElementById('orderForm').reset();
        if (orderModal) {
            orderModal.hide();
        }
    }

    function handleOrderError(error, submitBtn) {
        isSubmittingOrder = false;
        console.error('حدث خطأ:', error);
        
        var errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        if (error.code) {
            errorMessage = 'خطأ في النظام: ' + error.code;
        } else if (error.message) {
            errorMessage = error.message;
        } else if (error.text) {
            errorMessage = error.text;
        }
        
        showStatus('حدث خطأ أثناء إرسال الطلب: ' + errorMessage, 'error');
        
        // إعادة تمكين زر الإرسال
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'تأكيد الطلب';
        }
    }

    // ============== وظائف الاتصال ==============

    // إرسال رسالة الاتصال
    function sendContactMessage() {
        var nameEl = document.getElementById('contactName');
        var emailEl = document.getElementById('contactEmail');
        var phoneEl = document.getElementById('contactPhone');
        var messageEl = document.getElementById('contactMessage');
        if (!nameEl || !emailEl || !messageEl) return;
        
        var name = nameEl.value;
        var email = emailEl.value;
        var phone = phoneEl.value || 'لم يتم تقديمه';
        var message = messageEl.value;
        
        if (!name || !email || !message) {
            showStatus('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        if (isProcessing) return;
        isProcessing = true;
        
        // عرض حالة التحميل
        var contactSpinner = document.getElementById('contactSpinner');
        var contactSubmitText = document.getElementById('contactSubmitText');
        if (contactSpinner) contactSpinner.classList.remove('d-none');
        if (contactSubmitText) contactSubmitText.textContent = 'جاري الإرسال...';
        
        if (typeof emailjs !== 'undefined') {
            // إرسال رسالة الاتصال عبر EmailJS
            emailjs.send("service_lc1q5k8", "template_11pkq0k", {
                from_name: name,
                from_email: email,
                phone_number: phone,
                message: message
            })
            .then(function() {
                console.log("تم إرسال رسالة الاتصال");
                showStatus('تم إرسال رسالتك بنجاح! سوف نتواصل معك قريباً.', 'success');
                document.getElementById('contactForm').reset();
            })
            .catch(function(error) {
                console.error('حدث خطأ:', error);
                var errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
                if (error.code) {
                    errorMessage = 'خطأ في النظام: ' + error.code;
                } else if (error.message) {
                    errorMessage = error.message;
                } else if (error.text) {
                    errorMessage = error.text;
                }
                showStatus('حدث خطأ أثناء إرسال الرسالة: ' + errorMessage, 'error');
            })
            .finally(function() {
                if (contactSpinner) contactSpinner.classList.add('d-none');
                if (contactSubmitText) contactSubmitText.textContent = 'إرسال الرسالة';
                isProcessing = false;
            });
        } else {
            showStatus('تعذ���� إرسال الرسالة. يرجى المحاولة لاحقاً.', 'error');
            if (contactSpinner) contactSpinner.classList.add('d-none');
            if (contactSubmitText) contactSubmitText.textContent = 'إرسال الرسالة';
            isProcessing = false;
        }
    }

    // ============== وظائف مساعدة ==============

    // تعبئة قائمة الولايات
    function populateWilayas() {
        var wilayaSelect = document.getElementById('wilaya');
        if (!wilayaSelect) return;
        
        wilayaSelect.innerHTML = '<option value="">اختر الولاية</option>';
        for (var i = 0; i < wilayas.length; i++) {
            var option = document.createElement('option');
            option.value = wilayas[i];
            option.textContent = wilayas[i];
            wilayaSelect.appendChild(option);
        }
    }

    // بدء مؤقت العرض الخاص
    function startOfferTimer() {
        var daysElement = document.getElementById('days');
        var hoursElement = document.getElementById('hours');
        var minutesElement = document.getElementById('minutes');
        var secondsElement = document.getElementById('seconds');
        
        if (!daysElement || !hoursElement || !minutesElement || !secondsElement) return;
        
        // Real recurring deadline: end of every Sunday 23:59:59 Algeria time (UTC+1); renews weekly
        function getNextDeadline() {
            var TZ = 60; // UTC+1 (Algeria, no DST)
            var nowMs = Date.now();
            var alg = new Date(nowMs + TZ * 60000);
            var daysUntilSunday = (7 - alg.getUTCDay()) % 7;
            var dl = Date.UTC(alg.getUTCFullYear(), alg.getUTCMonth(), alg.getUTCDate() + daysUntilSunday, 23, 59, 59) - TZ * 60000;
            if (dl - nowMs <= 0) { dl += 7 * 24 * 60 * 60 * 1000; }
            return dl;
        }
        var deadlineMs = getNextDeadline();
        
        function updateTimer() {
            var difference = deadlineMs - Date.now();
            if (difference <= 0) { deadlineMs = getNextDeadline(); difference = deadlineMs - Date.now(); }
            
            if (difference <= 0) {
                daysElement.textContent = '00';
                hoursElement.textContent = '00';
                minutesElement.textContent = '00';
                secondsElement.textContent = '00';
                return;
            }
            
            var days = Math.floor(difference / (1000 * 60 * 60 * 24));
            var hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            daysElement.textContent = days < 10 ? '0' + days : '' + days;
            hoursElement.textContent = hours < 10 ? '0' + hours : '' + hours;
            minutesElement.textContent = minutes < 10 ? '0' + minutes : '' + minutes;
            secondsElement.textContent = seconds < 10 ? '0' + seconds : '' + seconds;
        }
        
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    // عرض حالة الطلب
    function showStatus(message, type) {
        var indicator = document.getElementById('statusIndicator');
        var messageElement = document.getElementById('statusMessage');
        
        if (!indicator || !messageElement) return;
        
        messageElement.innerHTML = message;
        
        var alert = indicator.querySelector('.alert');
        if (!alert) return;
        
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
                messageElement.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>' + message;
                break;
            case 'info':
                alert.classList.add('alert-info');
                break;
            default:
                alert.classList.add('alert-info');
        }
        
        indicator.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(hideStatus, 9000);
        }
    }

    // إخفاء مؤشر الحالة
    function hideStatus() {
        var indicator = document.getElementById('statusIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // ============== السلايدر العلوي (معدل بالكامل) ==============
    var slideIndex1 = 1;
    var slideshowInterval = null;

    function showSlides1(n) {
        var slides = document.getElementsByClassName("mySlides1");
        var dots = document.getElementsByClassName("dot1");
        
        if (slides.length === 0) return;
        
        if (n > slides.length) slideIndex1 = 1;
        if (n < 1) slideIndex1 = slides.length;
        
        for (var i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
            slides[i].classList.remove('active-slide');
        }
        
        for (var j = 0; j < dots.length; j++) {
            dots[j].className = dots[j].className.replace(" active1", "");
            dots[j].classList.remove('active');
        }
        
        if (slides[slideIndex1 - 1]) {
            slides[slideIndex1 - 1].style.display = "block";
            slides[slideIndex1 - 1].classList.add('active-slide');
        }
        
        if (dots[slideIndex1 - 1]) {
            dots[slideIndex1 - 1].className += " active1";
            dots[slideIndex1 - 1].classList.add('active');
        }
    }

    function plusSlides1(n) {
        slideIndex1 += n;
        showSlides1(slideIndex1);
        resetSlideshowTimer();
    }

    function currentSlide1(n) {
        slideIndex1 = n;
        showSlides1(slideIndex1);
        resetSlideshowTimer();
    }

    function resetSlideshowTimer() {
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
        }
        slideshowInterval = setInterval(function() {
            plusSlides1(1);
        }, 4000);
    }

    function setupSlideshowSwipe() {
        var container = document.querySelector('.slideshow-container1');
        if (!container || container.dataset.swipeBound) return;
        container.dataset.swipeBound = '1';
        var sx = 0, sy = 0, tracking = false;
        container.addEventListener('touchstart', function(e) {
            if (!e.touches || e.touches.length !== 1) { tracking = false; return; }
            sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
        }, { passive: true });
        container.addEventListener('touchend', function(e) {
            if (!tracking) return;
            tracking = false;
            var t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
            if (!t) return;
            var dx = t.clientX - sx, dy = t.clientY - sy;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                if (dx < 0) { plusSlides1(1); } else { plusSlides1(-1); }
            }
        }, { passive: true });
    }

    function fitSlideshowToImage() {
        var c = document.querySelector('.slideshow-container1');
        if (!c) return;
        function apply() {
            var act = c.querySelector('.mySlides1[style*="block"] img') || c.querySelector('.mySlides1 img');
            if (act && act.naturalWidth && act.naturalHeight) {
                c.style.aspectRatio = act.naturalWidth + ' / ' + act.naturalHeight;
                c.style.maxHeight = 'none';
            }
        }
        var imgs = c.querySelectorAll('.mySlides1 img');
        for (var i = 0; i < imgs.length; i++) {
            if (imgs[i].complete) { apply(); }
            imgs[i].addEventListener('load', apply);
        }
    }

    function initSlides() {
        slideIndex1 = 1;
        showSlides1(slideIndex1);
        resetSlideshowTimer();
        setupSlideshowSwipe();
        fitSlideshowToImage();
        
        // التأكد من وجود نقاط كافية
        var slides = document.getElementsByClassName("mySlides1");
        var dotsContainer = document.querySelector('.mySlides1').parentElement.nextElementSibling;
        if (dotsContainer && dotsContainer.tagName === 'DIV') {
            var dots = document.getElementsByClassName("dot1");
            if (dots.length < slides.length) {
                for (var i = dots.length; i < slides.length; i++) {
                    var newDot = document.createElement('span');
                    newDot.className = 'dot1';
                    newDot.setAttribute('onclick', 'currentSlide1(' + (i+1) + ')');
                    newDot.setAttribute('role', 'button');
                    newDot.setAttribute('tabindex', '0');
                    newDot.setAttribute('aria-label', 'Aller à l\'image ' + (i+1));
                    dotsContainer.appendChild(newDot);
                }
            }
        }
    }

    // ============== تفعيل التمرير التلقائي للعروض ==============
    function initOfferProducts() {
        var carousels = document.querySelectorAll('.offer-product .carousel');
        if (!carousels.length || typeof bootstrap === 'undefined' || !bootstrap.Carousel) return;

        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var items = [];

        carousels.forEach(function(carousel, index) {
            // نتحكم بالتوقيت يدوياً، لذا نُلغي التشغيل التلقائي من Bootstrap
            carousel.removeAttribute('data-bs-ride');
            carousel.removeAttribute('data-bs-interval');
            var bs;
            try {
                var existing = bootstrap.Carousel.getInstance(carousel);
                if (existing) existing.dispose();
                bs = new bootstrap.Carousel(carousel, { interval: false, ride: false, wrap: true, pause: 'hover', touch: true });
            } catch (e) { return; }
            // توقيت متدرّج حتى لا تتبدّل كل البطاقات في نفس اللحظة
            var entry = { el: carousel, bs: bs, delay: 5000 + index * 1200, timer: null, visible: false, hovered: false };
            carousel.addEventListener('mouseenter', function(){ entry.hovered = true; });
            carousel.addEventListener('mouseleave', function(){ entry.hovered = false; });
            items.push(entry);
        });

        function start(entry) {
            if (entry.timer || reduceMotion) return;
            entry.timer = setInterval(function() {
                if (entry.visible && !entry.hovered && !document.hidden) {
                    try { entry.bs.next(); } catch (e) {}
                }
            }, entry.delay);
        }
        function stop(entry) {
            if (entry.timer) { clearInterval(entry.timer); entry.timer = null; }
        }

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function(obs) {
                obs.forEach(function(o) {
                    var entry = null;
                    for (var k = 0; k < items.length; k++) { if (items[k].el === o.target) { entry = items[k]; break; } }
                    if (!entry) return;
                    if (o.isIntersecting && o.intersectionRatio >= 0.5) {
                        entry.visible = true; start(entry);
                    } else {
                        entry.visible = false; stop(entry);
                    }
                });
            }, { threshold: [0, 0.5, 1] });
            items.forEach(function(entry) { io.observe(entry.el); });
        } else {
            items.forEach(function(entry) { entry.visible = true; start(entry); });
        }

        document.addEventListener('visibilitychange', function() {
            if (document.hidden) { items.forEach(stop); }
            else { items.forEach(function(entry) { if (entry.visible) start(entry); }); }
        });
    }

    // ============== وظيفة تبديل وضع الظلام ==============
    function toggleDarkMode() {
        if (isProcessing) return;
        isProcessing = true;
        
        var currentTheme = document.documentElement.getAttribute('data-theme');
        var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        
        var themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            if (newTheme === 'dark') {
                themeIcon.className = 'bi bi-sun';
                themeIcon.parentElement.title = 'تفعيل وضع النهار';
            } else {
                themeIcon.className = 'bi bi-moon';
                themeIcon.parentElement.title = 'تفعيل وضع الظلام';
            }
        }
        
        try {
            localStorage.setItem('theme', newTheme);
        } catch (e) {
            console.error('Could not save theme preference:', e);
        }
        
        setTimeout(function() {
            isProcessing = false;
        }, 300);
    }

    function initDarkMode() {
        var savedTheme = 'light';
        try {
            savedTheme = localStorage.getItem('theme') || 'light';
        } catch (e) {
            console.error('Could not load theme preference:', e);
        }
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        var themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            if (savedTheme === 'dark') {
                themeIcon.className = 'bi bi-sun';
                themeIcon.parentElement.title = 'تفعيل وضع النهار';
            } else {
                themeIcon.className = 'bi bi-moon';
                themeIcon.parentElement.title = 'تفعيل وضع الظلام';
            }
        }
    }

    // ============== المنتجات القابلة للنقر ==============
    function setupProductCardClicks() {
        // touch tap-vs-scroll guard
        var touchStartX = 0, touchStartY = 0, touchMoved = false;
        document.addEventListener('touchstart', function(e) {
            if (e.touches && e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchMoved = false;
            }
        }, { passive: true });
        document.addEventListener('touchmove', function(e) {
            if (e.touches && e.touches.length === 1) {
                if (Math.abs(e.touches[0].clientX - touchStartX) > 10 ||
                    Math.abs(e.touches[0].clientY - touchStartY) > 10) {
                    touchMoved = true;
                }
            }
        }, { passive: true });

        document.addEventListener('click', function(e) {
            if (touchMoved) { touchMoved = false; return; }
            if (isProcessing) return;

            // Handle regular product cards
            var card = e.target.closest('.product-card');
            if (card) {
                if (e.target.closest('button, a, input, select, textarea, .carousel-control, .carousel-indicators, .carousel-control-prev, .carousel-control-next')) {
                    return;
                }

                var pid = card.getAttribute('data-pid') || (card.querySelector('.add-to-cart-btn') && card.querySelector('.add-to-cart-btn').getAttribute('data-id'));
                if (pid) {
                    isProcessing = true;
                    window.location.href = 'product.html?pid=' + encodeURIComponent(pid);

                    setTimeout(function() {
                        isProcessing = false;
                    }, 500);
                }
                return;
            }

            // Handle offer product cards
            var offerCard = e.target.closest('.offer-product');
            if (offerCard) {
                // Exclude carousel controls, add-to-cart buttons, and links
                if (e.target.closest('button, a, input, select, textarea, .carousel-control, .carousel-indicators, .carousel-control-prev, .carousel-control-next, .offer-btn, .offer-product-content-link')) {
                    return;
                }

                // Find the product ID from the first image link or add-to-cart button
                var pidElement = offerCard.querySelector('a[href*="product.html?pid="], .offer-btn[data-id], .add-to-cart-btn[data-id]');
                var pid = null;

                if (pidElement) {
                    if (pidElement.hasAttribute('href') && pidElement.href.includes('product.html?pid=')) {
                        // Extract PID from href
                        var match = pidElement.href.match(/pid=(\d+)/);
                        if (match) pid = match[1];
                    } else if (pidElement.hasAttribute('data-id')) {
                        pid = pidElement.getAttribute('data-id');
                    }
                }

                if (pid) {
                    isProcessing = true;
                    window.location.href = 'product.html?pid=' + encodeURIComponent(pid);

                    setTimeout(function() {
                        isProcessing = false;
                    }, 500);
                }
            }
        });

        document.addEventListener('keydown', function(e) {
            if (isProcessing) return;

            var focused = document.activeElement;
            if (!focused) return;

            // Handle regular product cards
            if (focused.classList.contains('product-card')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var pid = focused.getAttribute('data-pid') || (focused.querySelector('.add-to-cart-btn') && focused.querySelector('.add-to-cart-btn').getAttribute('data-id'));
                    if (pid) {
                        isProcessing = true;
                        window.location.href = 'product.html?pid=' + encodeURIComponent(pid);

                        setTimeout(function() {
                            isProcessing = false;
                        }, 500);
                    }
                }
                return;
            }

            // Handle offer product cards
            if (focused.classList.contains('offer-product')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Find the product ID from the first image link or add-to-cart button
                    var pidElement = focused.querySelector('a[href*="product.html?pid="], .offer-btn[data-id], .add-to-cart-btn[data-id]');
                    var pid = null;

                    if (pidElement) {
                        if (pidElement.hasAttribute('href') && pidElement.href.includes('product.html?pid=')) {
                            // Extract PID from href
                            var match = pidElement.href.match(/pid=(\d+)/);
                            if (match) pid = match[1];
                        } else if (pidElement.hasAttribute('data-id')) {
                            pid = pidElement.getAttribute('data-id');
                        }
                    }

                    if (pid) {
                        isProcessing = true;
                        window.location.href = 'product.html?pid=' + encodeURIComponent(pid);

                        setTimeout(function() {
                            isProcessing = false;
                        }, 500);
                    }
                }
            }
        });
    }

    // دالة تهيئة الكاروسيلات
    function initializeCarousels() {
        setTimeout(function() {
            var carousels = document.querySelectorAll('.carousel');
            if (!carousels.length) return;
            
            for (var i = 0; i < carousels.length; i++) {
                var carousel = carousels[i];
                // العروض الخاصة تُدار بشكل منفصل في initOfferProducts (تمرير أبطأ + فقط عند الظهور)
                if (carousel.closest && carousel.closest('.offer-product')) continue;
                var items = carousel.querySelectorAll('.carousel-item');
                
                // إذا كان يحتوي على أكثر من صورة واحدة
                if (items.length > 1) {
                    // تفعيل التمرير التلقائي
                    carousel.setAttribute('data-bs-ride', 'carousel');
                    carousel.setAttribute('data-bs-interval', '3000');
                    
                    // استخدام Bootstrap Carousel API إذا كان متاحاً
                    if (typeof bootstrap !== 'undefined' && bootstrap.Carousel) {
                        try {
                            var bsCarousel = new bootstrap.Carousel(carousel, {
                                interval: 3000,
                                wrap: true,
                                pause: 'hover'
                            });
                        } catch (e) {
                            console.log('Carousel initialization error:', e);
                        }
                    }
                    
                    // بدء التمرير يدوياً إذا لم يكن Bootstrap متاحاً
                    if (typeof bootstrap === 'undefined') {
                        startManualCarousel(carousel);
                    }
                }
            }
            // إعادة حساب الأبعاد بعد تحميل الكاروسيلات
            window.dispatchEvent(new Event('resize'));
        }, 500); // تأخير بسيط لضمان تحميل الصفحة
    }

    // دالة بدء التمرير اليدوي (fallback)
    function startManualCarousel(carousel) {
        var currentIndex = 0;
        var items = carousel.querySelectorAll('.carousel-item');
        var indicators = carousel.querySelectorAll('.carousel-indicators button');
        
        if (items.length <= 1) return;
        
        setInterval(function() {
            // إخفاء الصورة الحالية
            items[currentIndex].classList.remove('active');
            if (indicators[currentIndex]) {
                indicators[currentIndex].classList.remove('active');
            }
            
            // الانتقال للصورة التالية
            currentIndex = (currentIndex + 1) % items.length;
            
            // إظهار الصورة الجديدة
            items[currentIndex].classList.add('active');
            if (indicators[currentIndex]) {
                indicators[currentIndex].classList.add('active');
            }
        }, 3000);
    }

    // ============== تهيئة الصفحة ==============
    function initializePage() {
        try {
            loadCart();
            updateCartCount();
            renderCart();
            
            if (document.getElementById('productsContainer')) {
                loadAndDisplayProducts();
                setupCategoryFilters();
                setupAddToCartButtons();
                setupProductCardClicks();
            }
            
            if (document.getElementById('specialOffersContainer')) {
                loadSpecialOffers();
            }
            
            if (document.getElementById('wilaya')) {
                populateWilayas();
            }
            
            if (document.getElementById('days')) {
                startOfferTimer();
            }
            
            if (document.querySelector('.mySlides1')) {
                initSlides();
            }
            
            initDarkMode();
            setupProductCardClicks();
            initializeCarousels();
            initOfferProducts(); // تفعيل التمرير التلقائي للعروض
            
            var themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    toggleDarkMode();
                });
                themeToggle.addEventListener('touchstart', function() {
                    this.style.transform = 'scale(0.95)';
                }, { passive: true });
                themeToggle.addEventListener('touchend', function() {
                    this.style.transform = '';
                }, { passive: true });
            }
            
            var orderModalElement = document.getElementById('orderModal');
            if (orderModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                orderModal = new bootstrap.Modal(orderModalElement);
            }
            
            var contactForm = document.getElementById('contactForm');
            if (contactForm) {
                contactForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    sendContactMessage();
                });
            }
            
            var cartToggle = document.querySelector('.cart-btn');
            if (cartToggle) {
                cartToggle.addEventListener('touchstart', function() {
                    this.style.transform = 'scale(0.95)';
                }, { passive: true });
                cartToggle.addEventListener('touchend', function() {
                    this.style.transform = '';
                }, { passive: true });
            }
            
            var checkoutBtn = document.getElementById('checkoutBtn');
            if (checkoutBtn) {
                checkoutBtn.addEventListener('touchstart', function() {
                    this.style.transform = 'scale(0.95)';
                }, { passive: true });
                checkoutBtn.addEventListener('touchend', function() {
                    this.style.transform = '';
                }, { passive: true });
            }
            
            var submitOrderBtn = document.getElementById('submitOrderBtn');
            if (submitOrderBtn) {
                submitOrderBtn.addEventListener('touchstart', function() {
                    this.style.transform = 'scale(0.95)';
                }, { passive: true });
                submitOrderBtn.addEventListener('touchend', function() {
                    this.style.transform = '';
                }, { passive: true });
            }
            
            // تحسين تجربة اللمس
            document.documentElement.style.touchAction = 'manipulation';
            document.documentElement.style.webkitTapHighlightColor = 'transparent';
            
            // تحسينات اللمس للأزرار الأخرى
            var buttons = document.querySelectorAll('.btn, .offer-btn, .social-icon, .whatsapp-btn, .carousel-control-prev, .carousel-control-next, .prev1, .next1');
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].addEventListener('touchstart', function() {
                    this.style.transform = 'scale(0.96)';
                }, { passive: true });
                
                buttons[i].addEventListener('touchend', function() {
                    this.style.transform = '';
                }, { passive: true });
            }
            
        } catch (error) {
            console.error('خطأ في تهيئة الصفحة:', error);
        }
    }

    // ============== معالجة الأخطاء العالمية ==============
    window.addEventListener('error', function(event) {
        console.error('خطأ في الصفحة:', event.error);
    });

    if (typeof Promise !== 'undefined') {
        window.addEventListener('unhandledrejection', function(event) {
            console.error('خطأ في الوعد:', event.reason);
        });
    }

    // ============== بدء التطبيق ==============
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }

    // ============== تعريض الوظائف المطلوبة عالمياً ==============
    window.toggleCart = toggleCart;
    window.checkout = checkout;
    window.submitOrder = submitOrder;
    window.toggleDarkMode = toggleDarkMode;
    window.addToCart = addToCart;
    window.updateQuantity = updateQuantity;
    window.removeFromCart = removeFromCart;
    window.plusSlides1 = plusSlides1;
    window.currentSlide1 = currentSlide1;
    window.hideStatus = hideStatus;

    // سلة عائمة قابلة للسحب
    function initFloatingCart() {
        var floatingCartElem = document.getElementById('floatingCart');
        if (!floatingCartElem) return;
        var isDragging = false, dragOccurred = false, startX, startY, startLeft, startBottom, activePointerId = null;
        floatingCartElem.style.touchAction = 'none';
        
        floatingCartElem.addEventListener('pointerdown', function(e) {
            isDragging = true; dragOccurred = false;
            var rect = floatingCartElem.getBoundingClientRect();
            startLeft = rect.left; startBottom = window.innerHeight - rect.bottom;
            startX = e.clientX; startY = e.clientY;
            floatingCartElem.style.transition = 'none';
            activePointerId = e.pointerId;
            try { floatingCartElem.setPointerCapture(e.pointerId); } catch (err) {}
            e.preventDefault();
        });
        
        window.addEventListener('pointermove', function(e) {
            if (!isDragging) return;
            var dx = e.clientX - startX, dy = e.clientY - startY;
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) dragOccurred = true;
            var newLeft = startLeft + dx, newBottom = startBottom - dy;
            newLeft = Math.min(window.innerWidth - 80, Math.max(8, newLeft));
            newBottom = Math.min(window.innerHeight - 40, Math.max(60, newBottom));
            floatingCartElem.style.left = newLeft + 'px';
            floatingCartElem.style.bottom = newBottom + 'px';
            floatingCartElem.style.top = 'auto'; floatingCartElem.style.right = 'auto';
        });
        
        window.addEventListener('pointerup', function() {
            if (!isDragging) return;
            isDragging = false;
            floatingCartElem.style.transition = '';
            if (activePointerId !== null) {
                try { floatingCartElem.releasePointerCapture(activePointerId); } catch (err) {}
                activePointerId = null;
            }
            if (!dragOccurred) toggleCart();
            dragOccurred = false;
        });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFloatingCart);
    } else {
        initFloatingCart();
    }

})();

// ============== وظائف التنقل في قسم العروض ==============
function scrollOffers(direction) {
    var offersContainer = document.querySelector('.offer-products');
    if (!offersContainer) return;
    
    var scrollAmount = 380; // مقدار التمرير
    var currentScroll = offersContainer.scrollLeft;
    
    offersContainer.scrollTo({
        left: currentScroll + (scrollAmount * direction),
        behavior: 'smooth'
    });
}
// أضفه داخل علامة <script> في نهاية الملف أو في main.js
window.addEventListener('scroll', function() {
    var navbar = document.querySelector('.glass-navbar');
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    // عند التمرير: أعد القوائم المفتوحة إلى وضعها الطبيعي
    var sw = document.getElementById('i18nSwitcher');
    if (sw && sw.classList.contains('open')) {
        sw.classList.remove('open');
        var i18nBtn = document.getElementById('i18nBtn');
        if (i18nBtn) i18nBtn.setAttribute('aria-expanded', 'false');
    }
    var navCollapse = document.getElementById('navbarNav');
    if (navCollapse && navCollapse.classList.contains('show')) {
        if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
            try { bootstrap.Collapse.getOrCreateInstance(navCollapse, { toggle: false }).hide(); } catch (e) { navCollapse.classList.remove('show'); }
        } else {
            navCollapse.classList.remove('show');
        }
    }
});
