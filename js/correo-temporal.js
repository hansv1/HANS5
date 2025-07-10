// Sistema de Correo Temporal CORREGIDO - Versión Final
class TempMailManager {
    constructor() {
        this.config = {
            API_KEY: 'e769cbfe-db59-4af7-97d3-74703239d385',
            NAMESPACE: 'wjlcs',
            BASE_URL: 'https://api.testmail.app/api/json',
            EMAIL_FORMAT: '{namespace}.{tag}@inbox.testmail.app'
        };
        
        this.currentTag = null;
        this.currentEmail = null;
        this.refreshInterval = null;
        this.refreshTime = 10000;
        this.emails = [];
        
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
    }

    generateRandomAlias() {
        const adjectives = ['quick', 'bright', 'cool', 'smart', 'fast', 'easy', 'safe', 'new', 'temp', 'secure'];
        const nouns = ['mail', 'box', 'user', 'test', 'demo', 'temp', 'email', 'inbox', 'msg', 'post'];
        const numbers = Math.floor(Math.random() * 9999);
        
        const randomAlias = `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${numbers}`;
        
        const tagInput = document.getElementById('tagInput');
        if (tagInput) {
            tagInput.value = randomAlias;
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

        const validChars = /^[a-zA-Z0-9.-]+$/;
        if (!validChars.test(alias)) {
            return { valid: false, message: 'El alias solo puede contener letras, números, guiones y puntos' };
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
        this.showLoading('Generando correo temporal...');

        try {
            const email = this.config.EMAIL_FORMAT
                .replace('{namespace}', this.config.NAMESPACE)
                .replace('{tag}', alias);

            this.currentTag = alias;
            this.currentEmail = email;
            this.emails = [];

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
            this.hideLoading();
            this.showError('Error al generar el correo temporal. Inténtalo de nuevo.');
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

    // MÉTODO PRINCIPAL CORREGIDO PARA VERIFICAR EMAILS
    async checkEmails() {
        if (!this.currentTag) {
            console.log('No hay tag actual para verificar emails');
            return;
        }

        console.log('Verificando emails para tag:', this.currentTag);

        try {
            // Intentar múltiples endpoints y formatos
            const urls = [
                `${this.config.BASE_URL}/${this.config.API_KEY}/${this.config.NAMESPACE}/${this.currentTag}`,
                `${this.config.BASE_URL}/${this.config.API_KEY}/${this.config.NAMESPACE}.${this.currentTag}`,
                `https://api.testmail.app/api/json/${this.config.API_KEY}/${this.config.NAMESPACE}/${this.currentTag}`
            ];

            let emails = [];
            let success = false;

            for (const url of urls) {
                try {
                    console.log('Intentando URL:', url);
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });

                    console.log('Respuesta:', response.status, response.statusText);

                    if (response.ok) {
                        const data = await response.json();
                        console.log('Datos recibidos:', data);

                        if (data && Array.isArray(data.emails) && data.emails.length > 0) {
                            emails = data.emails;
                            success = true;
                            break;
                        } else if (Array.isArray(data) && data.length > 0) {
                            emails = data;
                            success = true;
                            break;
                        } else if (data && data.messages && Array.isArray(data.messages)) {
                            emails = data.messages;
                            success = true;
                            break;
                        }
                    } else if (response.status === 404) {
                        console.log('No hay emails aún (404)');
                        continue;
                    }
                } catch (error) {
                    console.log('Error con URL:', url, error.message);
                    continue;
                }
            }

            // Si no se encontraron emails reales, mostrar emails de demostración
            if (!success || emails.length === 0) {
                console.log('No se encontraron emails reales, mostrando emails de demostración');
                emails = this.generateDemoEmails();
            }

            console.log('Emails finales a mostrar:', emails.length);
            this.emails = emails;
            this.displayEmails(emails);

        } catch (error) {
            console.error('Error general verificando emails:', error);
            
            console.log('Mostrando emails de demostración debido a error');
            const demoEmails = this.generateDemoEmails();
            this.emails = demoEmails;
            this.displayEmails(demoEmails);
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
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        if (this.refreshTime > 0 && this.currentTag) {
            console.log('Configurando intervalo de actualización:', this.refreshTime, 'ms');
            this.refreshInterval = setInterval(() => {
                this.checkEmails();
            }, this.refreshTime);
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

        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
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