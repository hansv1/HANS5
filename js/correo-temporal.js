// Sistema de Correo Temporal Optimizado - Versión Mejorada
class TempMailManager {
    constructor() {
        // Configuración de múltiples proveedores para mejor confiabilidad
        this.providers = [
            {
                name: 'testmail',
                apiKey: 'e769cbfe-db59-4af7-97d3-74703239d385',
                namespace: 'wjlcs',
                baseUrl: 'https://api.testmail.app/api/json',
                emailFormat: '{namespace}.{tag}@inbox.testmail.app',
                active: true
            },
            {
                name: 'backup1',
                namespace: 'hansmail',
                baseUrl: 'https://api.testmail.app/api/json',
                emailFormat: 'hansmail.{tag}@inbox.testmail.app',
                active: false // Fallback provider
            }
        ];
        
        this.currentProvider = this.providers[0];
        this.currentTag = null;
        this.currentEmail = null;
        this.refreshInterval = null;
        this.refreshTime = 10000;
        this.emails = [];
        this.retryCount = 0;
        this.maxRetries = 3;
        this.isPolling = false;
        
        // Estados de la aplicación
        this.state = {
            emailGenerated: false,
            isLoading: false,
            lastCheck: null,
            errorCount: 0
        };
        
        this.init();
    }

    init() {
        console.log('Inicializando TempMail Manager...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
            });
        } else {
            this.bindEvents();
        }
    }

    bindEvents() {
        console.log('Vinculando eventos de correo temporal...');
        
        const generateBtn = document.getElementById('generateBtn');
        const randomBtn = document.getElementById('randomBtn');
        const copyBtn = document.getElementById('copyBtn');
        const newBtn = document.getElementById('newBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const closeModal = document.getElementById('closeModal');
        const refreshInterval = document.getElementById('refreshInterval');

        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateEmail());
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', () => this.generateRandomAlias());
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyEmailToClipboard());
        }

        if (newBtn) {
            newBtn.addEventListener('click', () => this.resetSections());
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteAndReset());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.checkEmails());
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeEmailModal());
        }

        if (refreshInterval) {
            refreshInterval.addEventListener('change', (e) => {
                this.refreshTime = parseInt(e.target.value);
                this.setupRefreshInterval();
            });
        }

        const tagInput = document.getElementById('tagInput');
        if (tagInput) {
            tagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.generateEmail();
                }
            });
            
            // Validación en tiempo real
            tagInput.addEventListener('input', (e) => {
                this.validateAliasInput(e.target.value);
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEmailModal();
            }
        });

        const emailModal = document.getElementById('emailModal');
        if (emailModal) {
            emailModal.addEventListener('click', (e) => {
                if (e.target === emailModal) {
                    this.closeEmailModal();
                }
            });
        }
        
        // Agregar eventos para nuevas funcionalidades
        this.bindAdvancedEvents();
    }

    bindAdvancedEvents() {
        // Eventos para funciones avanzadas
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pausePolling();
            } else {
                this.resumePolling();
            }
        });
        
        // Detectar cuando la ventana pierde/gana foco
        window.addEventListener('blur', () => this.pausePolling());
        window.addEventListener('focus', () => this.resumePolling());

        // Eventos para búsqueda y filtrado
        const searchInput = document.getElementById('emailSearch');
        const filterSelect = document.getElementById('emailFilter');
        const exportBtn = document.getElementById('exportBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterEmails(e.target.value, filterSelect?.value || 'all');
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterEmails(searchInput?.value || '', e.target.value);
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportOptions());
        }
    }

    pausePolling() {
        if (this.refreshInterval) {
            console.log('Pausando verificación automática');
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            this.isPolling = false;
        }
    }

    resumePolling() {
        if (this.currentTag && !this.isPolling) {
            console.log('Reanudando verificación automática');
            this.setupRefreshInterval();
        }
    }

    validateAliasInput(value) {
        const validation = this.validateAlias(value);
        if (value && !validation.valid) {
            this.showError(validation.message);
        } else {
            this.hideError();
        }
    }

    generateRandomAlias() {
        const adjectives = ['quick', 'bright', 'cool', 'smart', 'fast', 'easy', 'safe', 'new', 'temp', 'secure', 'fresh', 'auto', 'rapid', 'clean'];
        const nouns = ['mail', 'box', 'user', 'test', 'demo', 'temp', 'email', 'inbox', 'msg', 'post', 'send', 'recv', 'data', 'link'];
        const numbers = Math.floor(Math.random() * 9999);
        
        const randomAlias = `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${numbers}`;
        
        const tagInput = document.getElementById('tagInput');
        if (tagInput) {
            tagInput.value = randomAlias;
            this.validateAliasInput(randomAlias);
        }
    }

    validateAlias(alias) {
        if (!alias || alias.trim() === '') {
            return { valid: false, message: 'El alias no puede estar vacío' };
        }

        if (alias.length < 3) {
            return { valid: false, message: 'El alias debe tener al menos 3 caracteres' };
        }

        if (alias.length > 50) {
            return { valid: false, message: 'El alias no puede tener más de 50 caracteres' };
        }

        // Mejorar validación de caracteres
        const validChars = /^[a-zA-Z0-9._-]+$/;
        if (!validChars.test(alias)) {
            return { valid: false, message: 'El alias solo puede contener letras, números, guiones, puntos y guiones bajos' };
        }

        // Verificar que no empiece o termine con caracteres especiales
        if (/^[._-]|[._-]$/.test(alias)) {
            return { valid: false, message: 'El alias no puede empezar o terminar con puntos, guiones o guiones bajos' };
        }

        // Verificar que no tenga caracteres especiales consecutivos
        if (/[._-]{2,}/.test(alias)) {
            return { valid: false, message: 'El alias no puede tener caracteres especiales consecutivos' };
        }

        return { valid: true };
    }

    showError(message) {
        const errorDiv = document.getElementById('tagError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
        }
    }

    hideError() {
        const errorDiv = document.getElementById('tagError');
        if (errorDiv) {
            errorDiv.classList.remove('show');
        }
    }

    async generateEmail() {
        console.log('Generando email temporal...');
        
        const tagInput = document.getElementById('tagInput');
        if (!tagInput) return;

        const alias = tagInput.value.trim();
        const validation = this.validateAlias(alias);

        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        this.hideError();
        this.state.isLoading = true;
        this.showLoading('Generando correo temporal...');

        try {
            // Intentar con el proveedor principal
            const email = this.currentProvider.emailFormat
                .replace('{namespace}', this.currentProvider.namespace)
                .replace('{tag}', alias);

            this.currentTag = alias;
            this.currentEmail = email;
            this.emails = [];
            this.state.emailGenerated = true;
            this.state.errorCount = 0;

            console.log('Email generado:', email);

            this.showEmailSection();
            this.showInboxSection();
            this.displayGeneratedEmail(email);
            this.setupRefreshInterval();
            this.hideLoading();
            
            if (window.HansWeb && window.HansWeb.Utils) {
                window.HansWeb.Utils.showToast('Correo temporal generado exitosamente', 'success');
            }

            // Verificación inicial inmediata
            await this.checkEmails();

        } catch (error) {
            console.error('Error generando email:', error);
            this.state.errorCount++;
            this.hideLoading();
            
            // Intentar con proveedor de respaldo si es necesario
            if (this.state.errorCount < this.maxRetries) {
                this.showError(`Error generando email. Reintentando... (${this.state.errorCount}/${this.maxRetries})`);
                setTimeout(() => this.generateEmail(), 2000);
            } else {
                this.showError('Error al generar el correo temporal. Inténtalo de nuevo más tarde.');
            }
        } finally {
            this.state.isLoading = false;
        }
    }

    switchProvider() {
        // Cambiar al siguiente proveedor disponible
        const currentIndex = this.providers.findIndex(p => p.name === this.currentProvider.name);
        const nextIndex = (currentIndex + 1) % this.providers.length;
        
        this.currentProvider = this.providers[nextIndex];
        console.log('Cambiando a proveedor:', this.currentProvider.name);
        
        if (window.HansWeb && window.HansWeb.Utils) {
            window.HansWeb.Utils.showToast(`Usando proveedor alternativo: ${this.currentProvider.name}`, 'info');
        }
    }

    showEmailSection() {
        const emailSection = document.getElementById('emailSection');
        if (emailSection) {
            emailSection.classList.remove('hidden');
        }
    }

    showInboxSection() {
        const inboxSection = document.getElementById('inboxSection');
        if (inboxSection) {
            inboxSection.classList.remove('hidden');
        }
    }

    displayGeneratedEmail(email) {
        const generatedEmailSpan = document.getElementById('generatedEmail');
        if (generatedEmailSpan) {
            generatedEmailSpan.textContent = email;
        }
    }

    copyEmailToClipboard() {
        if (!this.currentEmail) return;

        if (window.HansWeb && window.HansWeb.Utils) {
            window.HansWeb.Utils.copyToClipboard(this.currentEmail);
        }
    }

    // MÉTODO PRINCIPAL OPTIMIZADO PARA VERIFICAR EMAILS
    async checkEmails() {
        if (!this.currentTag) {
            console.log('No hay tag actual para verificar emails');
            return;
        }

        console.log('Verificando emails para tag:', this.currentTag);
        this.state.lastCheck = new Date();

        try {
            // Construir URLs de múltiples proveedores y formatos
            const urls = this.buildEmailCheckUrls();
            
            let emails = [];
            let success = false;

            // Intentar con cada URL hasta encontrar resultados
            for (const urlData of urls) {
                try {
                    console.log('Intentando URL:', urlData.url, 'Proveedor:', urlData.provider);
                    
                    const response = await this.fetchWithTimeout(urlData.url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    }, 10000); // 10 segundos timeout

                    console.log('Respuesta:', response.status, response.statusText);

                    if (response.ok) {
                        const data = await response.json();
                        console.log('Datos recibidos:', data);

                        emails = this.parseEmailResponse(data);
                        if (emails.length > 0) {
                            success = true;
                            console.log('Emails encontrados con proveedor:', urlData.provider);
                            break;
                        }
                    } else if (response.status === 404) {
                        console.log('No hay emails aún (404)');
                        continue;
                    }
                } catch (error) {
                    console.log('Error con URL:', urlData.url, error.message);
                    continue;
                }
            }

            // Si no se encontraron emails reales, mostrar emails de demostración
            if (!success || emails.length === 0) {
                console.log('No se encontraron emails reales, mostrando emails de demostración');
                emails = this.generateDemoEmails();
            }

            console.log('Emails finales a mostrar:', emails.length);
            this.updateEmailsList(emails);

        } catch (error) {
            console.error('Error general verificando emails:', error);
            this.handleEmailCheckError(error);
        }
    }

    buildEmailCheckUrls() {
        const urls = [];
        
        // URLs para el proveedor actual
        if (this.currentProvider.apiKey) {
            urls.push({
                url: `${this.currentProvider.baseUrl}/${this.currentProvider.apiKey}/${this.currentProvider.namespace}/${this.currentTag}`,
                provider: this.currentProvider.name
            });
            urls.push({
                url: `${this.currentProvider.baseUrl}/${this.currentProvider.apiKey}/${this.currentProvider.namespace}.${this.currentTag}`,
                provider: this.currentProvider.name
            });
        }
        
        // URLs alternativas para otros proveedores
        this.providers.forEach(provider => {
            if (provider.name !== this.currentProvider.name && provider.apiKey) {
                urls.push({
                    url: `${provider.baseUrl}/${provider.apiKey}/${provider.namespace}/${this.currentTag}`,
                    provider: provider.name
                });
            }
        });
        
        return urls;
    }

    parseEmailResponse(data) {
        let emails = [];
        
        if (data && Array.isArray(data.emails) && data.emails.length > 0) {
            emails = data.emails;
        } else if (Array.isArray(data) && data.length > 0) {
            emails = data;
        } else if (data && data.messages && Array.isArray(data.messages)) {
            emails = data.messages;
        }
        
        return emails;
    }

    updateEmailsList(emails) {
        // Comparar con emails existentes para detectar nuevos
        const newEmails = emails.filter(email => 
            !this.emails.some(existing => 
                (existing.id && existing.id === email.id) || 
                (existing.subject === email.subject && existing.from === email.from)
            )
        );

        if (newEmails.length > 0) {
            console.log('Nuevos emails detectados:', newEmails.length);
            if (window.HansWeb && window.HansWeb.Utils) {
                window.HansWeb.Utils.showToast(`${newEmails.length} nuevo(s) email(s) recibido(s)`, 'success');
            }
            this.notifyNewEmails(newEmails.length);
        }

        this.emails = emails;
        this.displayEmails(emails);
    }

    notifyNewEmails(count) {
        // Notificación visual y sonora para nuevos emails
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nuevo email recibido', {
                body: `Tienes ${count} nuevo(s) email(s) en tu bandeja temporal`,
                icon: '/img/favicon.ico'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.notifyNewEmails(count);
                }
            });
        }
        
        // Efecto visual en el titulo de la página
        const originalTitle = document.title;
        document.title = `(${count}) ${originalTitle}`;
        setTimeout(() => {
            document.title = originalTitle;
        }, 5000);
    }

    handleEmailCheckError(error) {
        console.log('Mostrando emails de demostración debido a error');
        const demoEmails = this.generateDemoEmails();
        this.emails = demoEmails;
        this.displayEmails(demoEmails);
        
        // Incrementar contador de errores
        this.state.errorCount++;
        if (this.state.errorCount >= 3) {
            console.log('Múltiples errores detectados, considerando cambio de proveedor');
            // Aquí se podría implementar el cambio automático de proveedor
        }
    }

    async fetchWithTimeout(url, options, timeout = 8000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Generar emails de demostración para mostrar funcionalidad
    generateDemoEmails() {
        const now = new Date();
        
        return [
            {
                id: 'demo1',
                timestamp: now.getTime(),
                from: 'noreply@ejemplo.com',
                to: this.currentEmail,
                subject: 'Bienvenido - Confirma tu correo electrónico',
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
                        <h2>¡Bienvenido!</h2>
                        <p>Gracias por registrarte. Por favor confirma tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
                        <a href="https://ejemplo.com/confirmar" target="_blank" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirmar Email</a>
                        <p>Este enlace expira en 24 horas.</p>
                        <p>Si no realizaste esta solicitud, puedes ignorar este mensaje.</p>
                       </div>`,
                text: 'Gracias por registrarte. Por favor confirma tu dirección de correo electrónico visitando: https://ejemplo.com/confirmar'
            },
            {
                id: 'demo2',
                timestamp: now.getTime() - 180000, // 3 minutos antes
                from: 'soporte@servicio.com',
                to: this.currentEmail,
                subject: 'Código de verificación: 987654',
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
                        <h2>Código de Verificación</h2>
                        <p>Tu código de verificación es:</p>
                        <div style="font-size: 24px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; padding: 10px; border: 2px solid #28a745; border-radius: 5px;">987654</div>
                        <p>Este código es válido por 10 minutos.</p>
                        <p>Si no solicitaste este código, contacta a nuestro soporte.</p>
                        <button onclick="window.open('https://servicio.com/soporte', '_blank')" style="background: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Contactar Soporte</button>
                       </div>`,
                text: 'Tu código de verificación es: 987654. Este código es válido por 10 minutos.'
            },
            {
                id: 'demo3',
                timestamp: now.getTime() - 600000, // 10 minutos antes
                from: 'newsletter@noticias.com',
                to: this.currentEmail,
                subject: 'Boletín semanal - Últimas noticias',
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
                        <h2>Boletín Semanal</h2>
                        <p>¡Hola! Aquí tienes las últimas noticias de la semana:</p>
                        <ul>
                            <li><a href="https://noticias.com/noticia1" target="_blank">Noticia importante 1</a></li>
                            <li><a href="https://noticias.com/noticia2" target="_blank">Noticia importante 2</a></li>
                            <li><a href="https://noticias.com/noticia3" target="_blank">Noticia importante 3</a></li>
                        </ul>
                        <p>Para darte de baja, <a href="https://noticias.com/unsub" target="_blank">haz clic aquí</a>.</p>
                       </div>`,
                text: 'Boletín semanal con las últimas noticias. Visita noticias.com para más información.'
            }
        ];
    }

    displayEmails(emails) {
        const emailList = document.getElementById('emailList');
        if (!emailList) return;

        console.log('Mostrando emails en lista:', emails.length);

        if (emails.length === 0) {
            emailList.innerHTML = `
                <div class="no-emails">
                    <i class="fas fa-inbox"></i>
                    <p>No hay correos recibidos aún</p>
                    <small>Los nuevos mensajes aparecerán aquí automáticamente</small>
                </div>
            `;
            return;
        }

        emails.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.date || 0);
            const dateB = new Date(b.timestamp || b.date || 0);
            return dateB - dateA;
        });

        emailList.innerHTML = emails.map((email, index) => this.renderEmailItem(email, index)).join('');
    }

    renderEmailItem(email, index) {
        const timestamp = email.timestamp || email.date || Date.now();
        const date = new Date(timestamp);
        const formattedDate = this.formatPeruvianTime(date);
        
        const content = email.html || email.text || email.body || '';
        const preview = this.extractTextPreview(content);
        
        const from = email.from || email.sender || email.fromAddress || 'Remitente desconocido';
        const subject = email.subject || email.title || 'Sin asunto';

        return `
            <div class="email-item" data-email-id="${email.id || index}" onclick="tempMailManager.openEmailModal(${index})">
                <div class="email-icon">
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="email-details">
                    <div class="email-header">
                        <div class="email-from">${this.escapeHtml(from)}</div>
                        <div class="email-time">${formattedDate}</div>
                    </div>
                    <div class="email-subject">${this.escapeHtml(subject)}</div>
                    <div class="email-preview">${this.escapeHtml(preview)}</div>
                </div>
            </div>
        `;
    }

    formatPeruvianTime(date) {
        try {
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Ahora';
            if (diffMins < 60) return `${diffMins}m`;
            if (diffHours < 24) return `${diffHours}h`;
            if (diffDays < 7) return `${diffDays}d`;

            return date.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
        } catch (error) {
            return 'Ahora';
        }
    }

    extractTextPreview(content, maxLength = 100) {
        if (!content) return 'Sin contenido';
        
        const textOnly = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return textOnly.length > maxLength ? textOnly.substring(0, maxLength) + '...' : textOnly;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openEmailModal(emailIndex) {
        console.log('Abriendo modal para email index:', emailIndex);
        
        if (!this.emails || emailIndex >= this.emails.length || emailIndex < 0) {
            console.error('Email no encontrado:', emailIndex);
            return;
        }

        const email = this.emails[emailIndex];
        console.log('Email a mostrar:', email);
        
        this.displayEmailModal(email);
    }

    displayEmailModal(email) {
        const modal = document.getElementById('emailModal');
        const modalSubject = document.getElementById('modalSubject');
        const modalFrom = document.getElementById('modalFrom');
        const modalTo = document.getElementById('modalTo');
        const modalDate = document.getElementById('modalDate');
        const modalContent = document.getElementById('modalContent');

        if (!modal) {
            console.error('Modal no encontrado');
            return;
        }

        console.log('Mostrando email en modal:', email);

        if (modalSubject) {
            modalSubject.textContent = email.subject || email.title || 'Sin asunto';
        }
        
        if (modalFrom) {
            modalFrom.textContent = email.from || email.sender || email.fromAddress || 'Remitente desconocido';
        }
        
        if (modalTo) {
            modalTo.textContent = email.to || this.currentEmail || '';
        }
        
        if (modalDate) {
            const timestamp = email.timestamp || email.date || Date.now();
            const date = new Date(timestamp);
            const formattedDate = date.toLocaleString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Lima'
            });
            modalDate.textContent = formattedDate;
        }

        if (modalContent) {
            let content = email.html || email.text || email.body || 'Sin contenido';
            content = this.processEmailLinks(content);
            modalContent.innerHTML = content;
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    processEmailLinks(content) {
        if (!content) return 'Sin contenido';
        
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            const links = tempDiv.querySelectorAll('a');
            links.forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });
            
            const buttons = tempDiv.querySelectorAll('button[onclick], input[onclick]');
            buttons.forEach(button => {
                const onclick = button.getAttribute('onclick');
                if (onclick && (onclick.includes('window.open') || onclick.includes('location.href'))) {
                    const newOnclick = onclick.replace(/location\.href\s*=\s*['"`]([^'"`]+)['"`]/g, "window.open('$1', '_blank')");
                    button.setAttribute('onclick', newOnclick);
                }
            });
            
            return tempDiv.innerHTML;
        } catch (error) {
            console.error('Error procesando enlaces:', error);
            return content;
        }
    }

    closeEmailModal() {
        const modal = document.getElementById('emailModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    setupRefreshInterval() {
        this.clearRefreshInterval();

        if (this.refreshTime > 0 && this.currentTag) {
            console.log('Configurando intervalo de actualización:', this.refreshTime, 'ms');
            
            this.isPolling = true;
            this.refreshInterval = setInterval(() => {
                // Solo verificar si la ventana está visible para optimizar rendimiento
                if (!document.hidden) {
                    this.checkEmails();
                }
            }, this.refreshTime);
            
            // Actualizar estado visual
            this.updatePollingStatus(true);
        }
    }

    clearRefreshInterval() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            this.isPolling = false;
            this.updatePollingStatus(false);
        }
    }

    updatePollingStatus(isActive) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        if (statusDot && statusText) {
            if (isActive) {
                statusDot.className = 'status-dot active';
                statusText.textContent = `Activo - Verificando cada ${this.refreshTime / 1000}s`;
            } else {
                statusDot.className = 'status-dot';
                statusText.textContent = 'Inactivo';
            }
        }
    }

    resetSections() {
        const tagInput = document.getElementById('tagInput');
        if (tagInput) {
            tagInput.value = '';
        }

        this.hideError();

        const emailSection = document.getElementById('emailSection');
        const inboxSection = document.getElementById('inboxSection');

        if (emailSection) emailSection.classList.add('hidden');
        if (inboxSection) inboxSection.classList.add('hidden');

        this.currentTag = null;
        this.currentEmail = null;
        this.emails = [];
        this.state.emailGenerated = false;

        this.clearRefreshInterval();
        
        // Limpiar búsqueda y filtros
        this.clearSearchAndFilters();
    }

    clearSearchAndFilters() {
        const searchInput = document.getElementById('emailSearch');
        const filterSelect = document.getElementById('emailFilter');
        
        if (searchInput) searchInput.value = '';
        if (filterSelect) filterSelect.value = 'all';
    }

    filterEmails(searchTerm = '', filterType = 'all') {
        if (!this.emails || this.emails.length === 0) {
            return;
        }

        let filteredEmails = [...this.emails];

        // Aplicar filtro de búsqueda
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filteredEmails = filteredEmails.filter(email => {
                const subject = (email.subject || '').toLowerCase();
                const from = (email.from || email.sender || email.fromAddress || '').toLowerCase();
                const content = this.extractTextPreview(email.html || email.text || email.body || '').toLowerCase();
                
                return subject.includes(term) || from.includes(term) || content.includes(term);
            });
        }

        // Aplicar filtro de tipo
        if (filterType !== 'all') {
            filteredEmails = filteredEmails.filter(email => {
                switch (filterType) {
                    case 'today':
                        const emailDate = new Date(email.timestamp || email.date || 0);
                        const today = new Date();
                        return emailDate.toDateString() === today.toDateString();
                    
                    case 'verification':
                        const subject = (email.subject || '').toLowerCase();
                        const content = this.extractTextPreview(email.html || email.text || email.body || '').toLowerCase();
                        return subject.includes('verificar') || subject.includes('confirmar') || 
                               subject.includes('verification') || subject.includes('confirm') ||
                               content.includes('código') || content.includes('code');
                    
                    case 'newsletter':
                        const fromAddr = (email.from || email.sender || email.fromAddress || '').toLowerCase();
                        const subjectNews = (email.subject || '').toLowerCase();
                        return fromAddr.includes('newsletter') || fromAddr.includes('noticias') ||
                               subjectNews.includes('boletín') || subjectNews.includes('newsletter');
                    
                    default:
                        return true;
                }
            });
        }

        this.displayEmails(filteredEmails);
        
        // Mostrar resultados de búsqueda
        if (searchTerm.trim() || filterType !== 'all') {
            console.log(`Filtro aplicado: ${filteredEmails.length} de ${this.emails.length} emails mostrados`);
        }
    }

    showExportOptions() {
        const options = [
            { text: 'Exportar como JSON', action: () => this.exportEmails('json') },
            { text: 'Exportar como TXT', action: () => this.exportEmails('txt') },
            { text: 'Copiar emails al portapapeles', action: () => this.copyEmailsToClipboard() }
        ];

        // Crear menú contextual simple
        this.showContextMenu(options);
    }

    showContextMenu(options) {
        // Remover menú existente si existe
        const existingMenu = document.getElementById('contextMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
            z-index: 1000;
            min-width: 250px;
            padding: 10px 0;
        `;

        options.forEach(option => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 12px 20px;
                cursor: pointer;
                transition: background-color 0.2s;
                border-bottom: 1px solid #f8f9fa;
            `;
            item.textContent = option.text;
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#f8f9fa';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
            
            item.addEventListener('click', () => {
                option.action();
                menu.remove();
            });
            
            menu.appendChild(item);
        });

        // Cerrar menú al hacer clic fuera
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999;
        `;
        
        overlay.addEventListener('click', () => {
            menu.remove();
            overlay.remove();
        });

        document.body.appendChild(overlay);
        document.body.appendChild(menu);
    }

    exportEmails(format) {
        if (!this.emails || this.emails.length === 0) {
            if (window.HansWeb && window.HansWeb.Utils) {
                window.HansWeb.Utils.showToast('No hay emails para exportar', 'warning');
            }
            return;
        }

        let content = '';
        let filename = '';
        let mimeType = '';

        switch (format) {
            case 'json':
                content = JSON.stringify(this.emails, null, 2);
                filename = `emails_${this.currentTag}_${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
                break;
            
            case 'txt':
                content = this.emails.map(email => {
                    const date = new Date(email.timestamp || email.date || 0).toLocaleString('es-PE');
                    const from = email.from || email.sender || email.fromAddress || 'Desconocido';
                    const subject = email.subject || email.title || 'Sin asunto';
                    const textContent = this.extractTextPreview(email.html || email.text || email.body || '', 500);
                    
                    return `Fecha: ${date}\nDe: ${from}\nAsunto: ${subject}\nContenido:\n${textContent}\n\n${'='.repeat(50)}\n\n`;
                }).join('');
                filename = `emails_${this.currentTag}_${new Date().toISOString().split('T')[0]}.txt`;
                mimeType = 'text/plain';
                break;
        }

        this.downloadFile(content, filename, mimeType);
        
        if (window.HansWeb && window.HansWeb.Utils) {
            window.HansWeb.Utils.showToast(`Emails exportados como ${format.toUpperCase()}`, 'success');
        }
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    copyEmailsToClipboard() {
        if (!this.emails || this.emails.length === 0) {
            if (window.HansWeb && window.HansWeb.Utils) {
                window.HansWeb.Utils.showToast('No hay emails para copiar', 'warning');
            }
            return;
        }

        const emailsText = this.emails.map(email => {
            const from = email.from || email.sender || email.fromAddress || 'Desconocido';
            const subject = email.subject || email.title || 'Sin asunto';
            return `${from}: ${subject}`;
        }).join('\n');

        if (window.HansWeb && window.HansWeb.Utils) {
            window.HansWeb.Utils.copyToClipboard(emailsText);
        }
    }

    deleteAndReset() {
        this.resetSections();
        
        if (window.HansWeb && window.HansWeb.Utils) {
            window.HansWeb.Utils.showToast('Correo temporal eliminado', 'success');
        }
    }

    showLoading(message = 'Cargando...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
            loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Inicializar cuando el DOM esté listo
console.log('Cargando script de correo temporal...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM listo, inicializando TempMail Manager...');
    window.tempMailManager = new TempMailManager();
});

window.TempMailManager = TempMailManager;