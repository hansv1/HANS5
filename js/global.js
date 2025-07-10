// JavaScript Global para HANS WEB - CORREGIDO
document.addEventListener('DOMContentLoaded', function() {
    initializeGlobalFeatures();
});

function initializeGlobalFeatures() {
    // Configurar menú móvil
    setupMobileMenu();
    
    // Configurar navegación suave
    setupSmoothScroll();
    
    // Configurar animaciones de entrada
    setupScrollAnimations();
    
    // Configurar tooltips y estados hover
    setupInteractiveElements();
}

// Menú móvil
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    
    if (!mobileMenuBtn || !mobileSidebar) return;
    
    // Crear overlay si no existe
    let overlay = document.getElementById('mobileOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.id = 'mobileOverlay';
        document.body.appendChild(overlay);
    }
    
    // Abrir menú
    mobileMenuBtn.addEventListener('click', function() {
        mobileSidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Cerrar menú
    function closeMobileMenu() {
        mobileSidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeMobileMenu);
    }
    
    overlay.addEventListener('click', closeMobileMenu);
    
    // Cerrar al hacer clic en enlaces
    const sidebarLinks = mobileSidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
}

// Navegación suave para anchors
function setupSmoothScroll() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    
    anchors.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerHeight = document.querySelector('.global-header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Animaciones al scroll
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Elementos para animar
    const animatedElements = document.querySelectorAll('.service-card, .process-item, .hero-container');
    
    animatedElements.forEach((el, index) => {
        // Estado inicial
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `all 0.6s ease ${index * 0.1}s`;
        
        observer.observe(el);
    });
}

// Elementos interactivos
function setupInteractiveElements() {
    // Efecto hover para tarjetas
    const cards = document.querySelectorAll('.service-card, .process-item');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Función global para navegación entre servicios - CORREGIDA
function navigateToService(url) {
    // Verificar que la URL sea válida
    if (!url) {
        console.error('URL no válida para navegación');
        return;
    }
    
    // Efecto de transición suave
    document.body.style.opacity = '0.8';
    
    setTimeout(() => {
        try {
            window.location.href = url;
        } catch (error) {
            console.error('Error en navegación:', error);
            document.body.style.opacity = '1'; // Restaurar opacidad si hay error
        }
    }, 200);
}

// Función para navegación de categorías de tienda - NUEVA
function navigateToCategory(url) {
    navigateToService(url);
}

// Utilidades globales
const Utils = {
    // Mostrar notificación toast
    showToast: function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Mostrar toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Ocultar y remover toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    },
    
    // Formatear precio
    formatPrice: function(price) {
        return `S/ ${price.toFixed(2)}`;
    },
    
    // Validar email
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Generar ID único
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Copiar al portapapeles
    copyToClipboard: function(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text).then(() => {
                this.showToast('Copiado al portapapeles', 'success');
            }).catch(() => {
                // Fallback
                this.fallbackCopyTextToClipboard(text);
            });
        } else {
            // Fallback para navegadores antiguos
            this.fallbackCopyTextToClipboard(text);
        }
    },
    
    // Fallback para copiar al portapapeles
    fallbackCopyTextToClipboard: function(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showToast('Copiado al portapapeles', 'success');
            }
        } catch (err) {
            console.error('Error al copiar:', err);
            this.showToast('Error al copiar al portapapeles', 'error');
        }
        
        document.body.removeChild(textArea);
    }
};

// CSS para toasts (añadir al final del CSS global)
const toastStyles = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        padding: 15px 20px;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border-left: 4px solid var(--primary-color);
        max-width: 300px;
    }
    
    .toast.show {
        transform: translateX(0);
    }
    
    .toast-success {
        border-left-color: #28a745;
    }
    
    .toast-error {
        border-left-color: #dc3545;
    }
    
    .toast-content {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-primary);
        font-weight: 500;
    }
    
    .toast-success .toast-content i {
        color: #28a745;
    }
    
    .toast-error .toast-content i {
        color: #dc3545;
    }
`;

// Inyectar estilos de toast si no existen
if (!document.getElementById('toast-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toast-styles';
    styleSheet.textContent = toastStyles;
    document.head.appendChild(styleSheet);
}

// Exportar utilidades para uso global
window.HansWeb = {
    Utils,
    navigateToService,
    navigateToCategory
};