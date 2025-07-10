// Sistema de Carrito de Compras para HANS WEB - CORREGIDO
class ShoppingCart {
    constructor() {
        this.items = [];
        this.isOpen = false;
        
        // Esperar a que el DOM esté completamente cargado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    init() {
        console.log('Inicializando carrito de compras...');
        this.loadFromStorage();
        this.bindEvents();
        this.updateCartDisplay();
    }

    bindEvents() {
        // Eventos del carrito
        const cartBtn = document.getElementById('cartBtn');
        const cartClose = document.getElementById('cartClose');
        const cartOverlay = document.getElementById('cartOverlay');
        const checkoutBtn = document.getElementById('checkoutBtn');

        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCart();
            });
            console.log('Botón carrito vinculado');
        } else {
            console.warn('Botón carrito no encontrado');
        }

        if (cartClose) {
            cartClose.addEventListener('click', () => this.closeCart());
        }

        if (cartOverlay) {
            cartOverlay.addEventListener('click', () => this.closeCart());
        }

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }

        // Eventos para botones "Agregar al Carrito" usando delegación de eventos
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.add-to-cart-btn, .btn-add-to-cart-main');
            if (button) {
                e.preventDefault();
                console.log('Botón agregar al carrito clickeado');
                this.addProductFromButton(button);
            }
        });

        // Cerrar carrito con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeCart();
            }
        });
    }

    // Agregar producto desde botón
    addProductFromButton(button) {
        console.log('Agregando producto desde botón:', button);
        
        let productCard = button.closest('.product-card');
        let product;

        if (productCard) {
            // Producto desde lista
            product = {
                id: productCard.dataset.productId || this.generateProductId(),
                name: productCard.querySelector('.product-title')?.textContent?.trim() || 'Producto',
                price: this.extractPrice(productCard.querySelector('.product-price')?.textContent || '0'),
                image: productCard.querySelector('.product-image img')?.src || '../img/placeholder.jpg',
                category: productCard.dataset.category || 'general'
            };
        } else {
            // Producto desde página individual
            const productData = button.dataset;
            if (productData.productId) {
                product = {
                    id: productData.productId,
                    name: document.querySelector('.product-name, h1')?.textContent?.trim() || 'Producto',
                    price: parseFloat(productData.price) || this.extractPrice(document.querySelector('.product-price-main')?.textContent || '0'),
                    image: document.querySelector('.product-image-main img')?.src || '../img/placeholder.jpg',
                    category: productData.category || 'general'
                };
            } else {
                console.error('No se pudo extraer información del producto');
                return;
            }
        }

        console.log('Producto a agregar:', product);
        this.addItem(product);
        this.showAddedToCartFeedback(button);
    }

    // Extraer precio del texto
    extractPrice(priceText) {
        if (!priceText) return 0;
        const match = priceText.toString().match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : 0;
    }

    // Generar ID único para producto
    generateProductId() {
        return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Feedback visual al agregar producto
    showAddedToCartFeedback(button) {
        const originalText = button.innerHTML;
        const originalBackground = button.style.background;
        
        button.innerHTML = '<i class="fas fa-check"></i> Agregado';
        button.disabled = true;
        button.style.background = '#28a745';

        // Efecto de pulso en el botón del carrito
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.classList.add('pulse');
            setTimeout(() => cartBtn.classList.remove('pulse'), 600);
        }

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
            button.style.background = originalBackground;
        }, 1500);

        // Mostrar notificación
        if (window.HansWeb && window.HansWeb.Utils) {
            window.HansWeb.Utils.showToast('Producto agregado al carrito', 'success');
        }
    }

    // Agregar item al carrito
    addItem(product, quantity = 1) {
        console.log('Agregando item al carrito:', product);
        
        const existingItem = this.items.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += quantity;
            console.log('Cantidad actualizada para producto existente');
        } else {
            this.items.push({
                ...product,
                quantity: quantity
            });
            console.log('Nuevo producto agregado al carrito');
        }

        this.saveToStorage();
        this.updateCartDisplay();
    }

    // Remover item del carrito
    removeItem(productId) {
        console.log('Removiendo item:', productId);
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
        this.updateCartDisplay();
    }

    // Actualizar cantidad
    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeItem(productId);
            return;
        }

        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            this.saveToStorage();
            this.updateCartDisplay();
        }
    }

    // Limpiar carrito
    clearCart() {
        this.items = [];
        this.saveToStorage();
        this.updateCartDisplay();
    }

    // Obtener total
    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Obtener cantidad total de items
    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Actualizar visualización del carrito
    updateCartDisplay() {
        this.updateCartCount();
        this.updateCartContent();
        this.updateCartFooter();
    }

    // Actualizar contador del carrito
    updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        const totalItems = this.getTotalItems();

        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.classList.toggle('hidden', totalItems === 0);
        }
    }

    // Actualizar contenido del carrito
    updateCartContent() {
        const cartContent = document.getElementById('cartContent');
        if (!cartContent) return;

        if (this.items.length === 0) {
            cartContent.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Tu carrito está vacío</p>
                    <small>Añade productos para comenzar tu compra</small>
                </div>
            `;
        } else {
            cartContent.innerHTML = this.items.map(item => this.renderCartItem(item)).join('');
            this.bindCartItemEvents();
        }
    }

    // Renderizar item del carrito
    renderCartItem(item) {
        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='../img/placeholder.jpg'">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                    <div class="cart-item-price">S/ ${item.price.toFixed(2)}</div>
                    <div class="cart-item-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn decrease-btn" data-product-id="${item.id}">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn increase-btn" data-product-id="${item.id}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="remove-item-btn" data-product-id="${item.id}" title="Eliminar producto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="cart-item-subtotal">Subtotal: S/ ${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            </div>
        `;
    }

    // Escapar HTML para seguridad
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Bind eventos de items del carrito
    bindCartItemEvents() {
        // Botones de cantidad
        document.querySelectorAll('.increase-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.increase-btn').dataset.productId;
                const item = this.items.find(item => item.id === productId);
                if (item) {
                    this.updateQuantity(productId, item.quantity + 1);
                }
            });
        });

        document.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.decrease-btn').dataset.productId;
                const item = this.items.find(item => item.id === productId);
                if (item && item.quantity > 1) {
                    this.updateQuantity(productId, item.quantity - 1);
                }
            });
        });

        // Botones de eliminar
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.remove-item-btn').dataset.productId;
                this.removeItem(productId);
                
                // Feedback visual
                if (window.HansWeb && window.HansWeb.Utils) {
                    window.HansWeb.Utils.showToast('Producto eliminado del carrito', 'success');
                }
            });
        });
    }

    // Actualizar footer del carrito
    updateCartFooter() {
        const cartFooter = document.getElementById('cartFooter');
        const cartSubtotal = document.getElementById('cartSubtotal');
        const cartTotal = document.getElementById('cartTotal');
        const checkoutBtn = document.getElementById('checkoutBtn');

        if (!cartFooter) return;

        const total = this.getTotal();
        const hasItems = this.items.length > 0;

        // Mostrar/ocultar footer
        cartFooter.style.display = hasItems ? 'block' : 'none';

        if (hasItems) {
            if (cartSubtotal) cartSubtotal.textContent = `S/ ${total.toFixed(2)}`;
            if (cartTotal) cartTotal.textContent = `S/ ${total.toFixed(2)}`;
            if (checkoutBtn) checkoutBtn.disabled = false;
        } else {
            if (checkoutBtn) checkoutBtn.disabled = true;
        }
    }

    // Abrir/cerrar carrito
    toggleCart() {
        console.log('Toggle carrito, estado actual:', this.isOpen);
        if (this.isOpen) {
            this.closeCart();
        } else {
            this.openCart();
        }
    }

    openCart() {
        console.log('Abriendo carrito');
        const cartSidebar = document.getElementById('cartSidebar');
        const cartOverlay = document.getElementById('cartOverlay');

        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.isOpen = true;
            console.log('Carrito abierto exitosamente');
        } else {
            console.error('Elementos del carrito no encontrados');
        }
    }

    closeCart() {
        console.log('Cerrando carrito');
        const cartSidebar = document.getElementById('cartSidebar');
        const cartOverlay = document.getElementById('cartOverlay');

        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
            this.isOpen = false;
        }
    }

    // Proceso de checkout (WhatsApp)
    checkout() {
        if (this.items.length === 0) return;

        const message = this.generateWhatsAppMessage();
        const whatsappUrl = `https://wa.me/51965485348?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
    }

    // Generar mensaje para WhatsApp
    generateWhatsAppMessage() {
        let message = '¡Hola! Quiero realizar una compra desde HANS WEB:\n\n';
        
        this.items.forEach(item => {
            message += `- ${item.name}: S/ ${(item.price * item.quantity).toFixed(2)}`;
            if (item.quantity > 1) {
                message += ` (${item.quantity} unidades)`;
            }
            message += '\n';
        });
        
        message += `\nTotal: S/ ${this.getTotal().toFixed(2)}\n\n¡Gracias!`;
        
        return message;
    }

    // Guardar en localStorage
    saveToStorage() {
        try {
            localStorage.setItem('hansWebCart', JSON.stringify(this.items));
            console.log('Carrito guardado en localStorage');
        } catch (error) {
            console.error('Error guardando carrito:', error);
        }
    }

    // Cargar desde localStorage
    loadFromStorage() {
        try {
            const savedCart = localStorage.getItem('hansWebCart');
            if (savedCart) {
                this.items = JSON.parse(savedCart);
                console.log('Carrito cargado desde localStorage:', this.items);
            }
        } catch (error) {
            console.error('Error cargando carrito:', error);
            this.items = [];
        }
    }

    // Método para compra directa (botón "Comprar Ahora")
    buyNow(product) {
        const message = this.generateBuyNowMessage(product);
        const whatsappUrl = `https://wa.me/51965485348?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    generateBuyNowMessage(product) {
        return `¡Hola! Quiero comprar este producto desde HANS WEB:\n\n- ${product.name}: S/ ${product.price.toFixed(2)}\n\n¡Gracias!`;
    }
}

// Funciones globales para productos
function addToCart(productData) {
    if (window.hansWebCart) {
        window.hansWebCart.addItem(productData);
    }
}

function buyNow(productData) {
    if (window.hansWebCart) {
        window.hansWebCart.buyNow(productData);
    }
}

// Inicializar carrito cuando el script se carga
console.log('Inicializando sistema de carrito...');
window.hansWebCart = new ShoppingCart();

// Exportar para uso en otras páginas
window.ShoppingCart = ShoppingCart;