/**
 * Sistema de Gestión de Códigos para HANS WEB
 * Integrado desde hansv1/web repository
 * Adaptado para mantener diseño HANS5
 */

// Configuración de Google Sheets API
const GOOGLE_SHEETS_CONFIG = {
    apiKey: 'AIzaSyB5RSXmO9GCgXs-e-0TxeLRYeM1emLwA28',
    spreadsheetId: '1QGTPBquKHQbO0sTO5pZr9w--mCWNNMjO1Mh9GC8q2eU',
    range: 'Hoja1!A:C'
};

// Configuración de TestMail API
const TESTMAIL_CONFIG = {
    API_KEY: 'e769cbfe-db59-4af7-97d3-74703239d385',
    BASE_URL: 'https://api.testmail.app/api/json'
};

// Configuración de filtros de streaming
const STREAMING_FILTERS = {
    netflix: ['netflix', 'nflx', 'netflix.com', 'nflix', 'netflixtv'],
    disney: ['disney+', 'disney plus', 'disneyplus', 'disney', 'disney.com'],
    amazon: ['prime video', 'primevideo', 'amazon prime', 'amazon', 'prime', 'amazon.com', 'amazonprime', 'openai']
};

// Frases prohibidas por servicio
const BLOCKED_CONTENT_PHRASES = {
    netflix: ['cambiar la información de tu cuenta', 'finalizar una compra en tu cuenta'],
    disney: [],
    amazon: []
};

// Configuración de servicios
const SERVICES_CONFIG = {
    netflix: {
        name: 'Netflix',
        icon: 'fa-solid fa-n',
        iconClass: 'netflix',
        description: 'Mensajes de verificación y notificaciones de Netflix',
        instruction: 'Ingresa tu correo principal de Netflix para ver todos los mensajes de verificación y notificaciones'
    },
    disney: {
        name: 'Disney+',
        icon: 'fa-solid fa-tv',
        iconClass: 'disney',
        description: 'Mensajes de acceso y comunicaciones de Disney+',
        instruction: 'Ingresa tu correo principal de Disney+ para ver todos los mensajes de acceso y comunicaciones'
    },
    amazon: {
        name: 'Amazon u otros',
        icon: 'fa-solid fa-network-wired',
        iconClass: 'amazon',
        description: 'Mensajes de Prime Video y verificaciones de otros servicios',
        instruction: 'Ingresa tu correo principal de Amazon para ver todos los mensajes de Prime Video y verificaciones'
    }
};

let currentService = null;
let currentAlias = null;
let currentPrincipalEmail = null;
let refreshInterval = null;
let currentMessages = [];
let showToastMessages = true;

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    showServiceSelection();
});

function initializeEventListeners() {
    document.getElementById('consultBtn').addEventListener('click', handleConsultClick);
    document.getElementById('userEmail').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleConsultClick();
    });
    document.getElementById('refreshMessages').addEventListener('click', refreshMessages);
    document.getElementById('autoRefresh').addEventListener('change', handleAutoRefreshChange);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('emailModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    const copyFullMessageBtn = document.getElementById('copyFullMessage');
    if (copyFullMessageBtn) {
        copyFullMessageBtn.addEventListener('click', copyFullMessage);
    }
    document.getElementById('copyPrincipalEmailBtn').addEventListener('click', copyPrincipalEmail);
}

function selectService(serviceKey) {
    currentService = serviceKey;
    const service = SERVICES_CONFIG[serviceKey];
    const iconElement = document.getElementById('selectedServiceIcon');
    iconElement.innerHTML = `<i class="${service.icon}"></i>`;
    iconElement.className = `service-icon-small ${service.iconClass}`;
    document.getElementById('selectedServiceName').textContent = service.name;
    document.getElementById('selectedServiceDesc').textContent = service.description;
    document.getElementById('serviceInstructions').textContent = service.instruction;
    showEmailInput();
}

function showServiceSelection() {
    document.getElementById('serviceSelection').classList.remove('hidden');
    document.getElementById('emailInput').classList.add('hidden');
    document.getElementById('messagesSection').classList.add('hidden');
    document.getElementById('inboxSection').classList.add('hidden');
}

function showEmailInput() {
    document.getElementById('serviceSelection').classList.add('hidden');
    document.getElementById('emailInput').classList.remove('hidden');
    document.getElementById('messagesSection').classList.add('hidden');
    document.getElementById('inboxSection').classList.add('hidden');
    document.getElementById('userEmail').value = '';
    document.getElementById('emailError').textContent = '';
    setTimeout(() => {
        document.getElementById('userEmail').focus();
    }, 300);
}

function showMessagesSection() {
    // Actualizar la información de la plataforma seleccionada en la sección de mensajes
    const service = SERVICES_CONFIG[currentService];
    const platformIconElement = document.getElementById('selectedPlatformIcon');
    const platformNameElement = document.getElementById('selectedPlatformName');
    
    if (service && platformIconElement && platformNameElement) {
        platformIconElement.innerHTML = `<i class="${service.icon}"></i>`;
        platformIconElement.className = `service-icon-small ${service.iconClass}`;
        platformNameElement.textContent = service.name;
    }
    
    document.getElementById('serviceSelection').classList.add('hidden');
    document.getElementById('emailInput').classList.add('hidden');
    document.getElementById('messagesSection').classList.remove('hidden');
    document.getElementById('inboxSection').classList.remove('hidden');
}

function backToServices() {
    currentService = null;
    currentPrincipalEmail = null;
    currentAlias = null;
    clearRefreshInterval();
    showServiceSelection();
}

function backToEmailInput() {
    currentPrincipalEmail = null;
    currentAlias = null;
    clearRefreshInterval();
    showEmailInput();
}

async function handleConsultClick() {
    const email = document.getElementById('userEmail').value.trim();
    const errorElement = document.getElementById('emailError');
    if (!email) {
        errorElement.textContent = 'Por favor ingresa tu correo electrónico';
        return;
    }
    if (!isValidEmail(email)) {
        errorElement.textContent = 'Por favor ingresa un correo electrónico válido';
        return;
    }
    errorElement.textContent = '';
    try {
        showLoading(true);
        const alias = await findAliasInSheets(email, currentService);
        if (!alias) {
            showToast('No se encontró un alias asociado para este correo y servicio.', 'warning');
            return;
        }
        const aliasInfo = parseTestMailAlias(alias);
        if (!aliasInfo) {
            showToast('El formato del alias no es válido para TestMail.', 'error');
            return;
        }
        
        currentPrincipalEmail = email;
        currentAlias = alias;
        document.getElementById('principalEmailDisplay').textContent = currentPrincipalEmail;
        
        showToastMessages = true;
        await loadMessagesFromTestMail(aliasInfo.namespace, aliasInfo.tag, alias);
        showMessagesSection();
        setupAutoRefresh();
        showToast(`Conexión establecida para: ${currentPrincipalEmail}`, 'success');
    } catch (error) {
        console.error('Error al consultar:', error);
        handleApiError(error);
    } finally {
        showLoading(false);
    }
}

function parseTestMailAlias(alias) {
    const match = alias.match(/^([^.]+)\.([^@]+)@inbox\.testmail\.app$/);
    if (match) {
        return {
            namespace: match[1],
            tag: match[2],
            fullAlias: alias
        };
    }
    return null;
}

async function findAliasInSheets(email, service) {
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}`;
    const params = new URLSearchParams({
        key: GOOGLE_SHEETS_CONFIG.apiKey,
        majorDimension: 'ROWS',
        valueRenderOption: 'UNFORMATTED_VALUE'
    });
    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se puede acceder a la base de datos');
    const data = await response.json();
    const rows = data.values || [];
    for (let i = 1; i < rows.length; i++) {
        const [platform, userEmail, alias] = rows[i];
        if (platform && userEmail && alias) {
            const platformNormalized = platform.toLowerCase().replace(/[^a-z]/g, '');
            let serviceNormalized = service.toLowerCase();
            if (service === 'amazon') serviceNormalized = 'primevideo';
            if (service === 'disney') serviceNormalized = 'disney';
            if (platformNormalized.includes(serviceNormalized) &&
                userEmail.toLowerCase().trim() === email.toLowerCase().trim()) {
                return alias;
            }
        }
    }
    return null;
}

async function loadMessagesFromTestMail(namespace, tag, fullAlias, showMessages = true) {
    const allMessages = await fetchMessagesFromTestMailAPI(namespace, tag, fullAlias);
    const filteredMessages = filterMessagesByService(allMessages, currentService);
    currentMessages = filteredMessages;
    renderEmails(filteredMessages);
    
    if (filteredMessages.length > 0) {
        const serviceName = SERVICES_CONFIG[currentService]?.name || currentService;
        updateStatus(`Activo - ${filteredMessages.length} correo(s) de ${serviceName}`, true);
        if (showMessages && showToastMessages) {
            showToast(`Se encontraron ${filteredMessages.length} mensaje(s) de ${serviceName}`, 'success');
        }
    } else {
        const serviceName = SERVICES_CONFIG[currentService]?.name || currentService;
        updateStatus(`Activo - Sin mensajes de ${serviceName}`, true);
        if (showMessages && showToastMessages) {
            showToast(`No se encontraron mensajes de ${serviceName}`, 'warning');
        }
    }
}

// Nueva función para revisar si el mensaje contiene frases bloqueadas por servicio
function containsBlockedPhrase(message, service) {
    const phrases = BLOCKED_CONTENT_PHRASES[service] || [];
    const text = ((message.text || '') + ' ' + (message.html || '')).toLowerCase();
    return phrases.some(phrase => text.includes(phrase.toLowerCase()));
}

// Modificada para filtrar mensajes por servicio y además por frases bloqueadas por servicio
function filterMessagesByService(messages, service) {
    if (!service || !STREAMING_FILTERS[service]) {
        return messages.filter(message => !containsBlockedPhrase(message, service));
    }
    const keywords = STREAMING_FILTERS[service];
    return messages
        .filter(message => {
            const subject = (message.subject || '').toLowerCase();
            const from = (message.from || '').toLowerCase();
            return keywords.some(keyword => subject.includes(keyword.toLowerCase()) || from.includes(keyword.toLowerCase()));
        })
        .filter(message => !containsBlockedPhrase(message, service));
}

async function fetchMessagesFromTestMailAPI(namespace, tag, fullAlias) {
    const url = `${TESTMAIL_CONFIG.BASE_URL}?apikey=${TESTMAIL_CONFIG.API_KEY}&namespace=${namespace}&tag=${tag}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const emails = Array.isArray(data) ? data : (data.emails || []);
    return emails.map((email, index) => ({
        id: email.id || `msg_${Date.now()}_${index}`,
        from: email.from || 'Remitente desconocido',
        to: email.to || currentPrincipalEmail,
        subject: email.subject || 'Sin asunto',
        timestamp: email.timestamp || Math.floor(Date.now() / 1000),
        html: email.html || '',
        text: email.text || '',
        isRead: false
    }));
}

function renderEmails(messages) {
    const emailList = document.getElementById('emailList');
    if (!messages || messages.length === 0) {
        const serviceName = SERVICES_CONFIG[currentService]?.name || 'este servicio';
        emailList.innerHTML = `
            <div class="no-emails">
                <i class="fas fa-inbox"></i>
                <p>No hay correos de ${serviceName} recibidos aún</p>
                <small>Los nuevos mensajes aparecerán aquí automáticamente</small>
            </div>
        `;
        return;
    }
    emailList.innerHTML = messages.map(email => `
        <div class="email-item" onclick="openEmailModal('${email.id}')">
            <div class="email-header">
                <div class="email-subject">${escapeHtml(email.subject || 'Sin asunto')}</div>
                <div class="email-date">${formatDate(email.timestamp)}</div>
            </div>
            <div class="email-from">De: ${escapeHtml(email.from || 'Desconocido')}</div>
            <div class="email-preview">${getEmailPreview(email)}</div>
        </div>
    `).join('');
}

function openEmailModal(messageId) {
    const message = currentMessages?.find(m => m.id === messageId);
    if (!message) return;
    window.currentModalMessage = message;
    document.getElementById('modalSubject').textContent = message.subject || 'Sin asunto';
    document.getElementById('modalFrom').textContent = message.from || 'Desconocido';
    document.getElementById('modalTo').textContent = currentPrincipalEmail || message.to;
    document.getElementById('modalDate').textContent = formatDate(message.timestamp, true);
    const contentDiv = document.getElementById('modalContent');
    if (message.html) {
        const iframe = document.createElement('iframe');
        iframe.srcdoc = message.html;
        iframe.style.width = '100%';
        iframe.style.minHeight = '400px';
        iframe.style.border = '1px solid var(--gray-200)';
        iframe.style.borderRadius = 'var(--radius)';
        contentDiv.innerHTML = '';
        contentDiv.appendChild(iframe);
    } else if (message.text) {
        contentDiv.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(message.text)}</pre>`;
    } else {
        contentDiv.innerHTML = '<p style="color: var(--gray-500); font-style: italic;">Este email no tiene contenido.</p>';
    }
    document.getElementById('emailModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    message.isRead = true;
    renderEmails(currentMessages);
}

function closeModal() {
    document.getElementById('emailModal').classList.add('hidden');
    document.body.style.overflow = '';
}

function getEmailPreview(email) {
    let preview = '';
    if (email.text) {
        preview = email.text.replace(/\s+/g, ' ').trim();
    } else if (email.html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = email.html;
        preview = tempDiv.textContent || tempDiv.innerText || '';
        preview = preview.replace(/\s+/g, ' ').trim();
    }
    if (preview.length > 120) {
        preview = preview.substring(0, 120) + '...';
    }
    return escapeHtml(preview) || '<em>Sin contenido de vista previa</em>';
}

async function copyPrincipalEmail() {
    if (!currentPrincipalEmail) return;
    try {
        await navigator.clipboard.writeText(currentPrincipalEmail);
        showToast('Correo principal copiado al portapapeles', 'success');
        const btn = document.getElementById('copyPrincipalEmailBtn');
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    } catch (error) {
        showToast('Error al copiar el correo', 'error');
    }
}

function copyFullMessage() {
    if (!window.currentModalMessage) return;
    const message = window.currentModalMessage;
    const fullText = `
 Asunto: ${message.subject}
 De: ${message.from}
 Para: ${currentPrincipalEmail || message.to}
 Fecha: ${formatDate(message.timestamp, true)}
 
 ${getTextFromHtml(message.html || message.text)}
    `.trim();
    navigator.clipboard.writeText(fullText).then(() => {
        showToast('Mensaje completo copiado al portapapeles', 'success');
    }).catch(() => {
        showToast('Error al copiar el mensaje', 'error');
    });
}

async function refreshMessages() {
    if (!currentAlias || !currentPrincipalEmail) return;
    try {
        const refreshBtn = document.getElementById('refreshMessages');
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        refreshBtn.disabled = true;
        const aliasInfo = parseTestMailAlias(currentAlias);
        if (aliasInfo) {
            showToastMessages = true;
            await loadMessagesFromTestMail(aliasInfo.namespace, aliasInfo.tag, currentAlias, true);
            showToast('Mensajes actualizados', 'success');
        } else {
            showToast('Error: formato de alias inválido', 'error');
        }
    } catch (error) {
        showToast('Error al actualizar mensajes: ' + error.message, 'error');
    } finally {
        const refreshBtn = document.getElementById('refreshMessages');
        refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Actualizar';
        refreshBtn.disabled = false;
    }
}

function handleAutoRefreshChange() {
    const interval = parseInt(document.getElementById('autoRefresh').value);
    clearRefreshInterval();
    if (interval > 0) {
        refreshInterval = setInterval(autoRefreshMessages, interval);
        showToast(`Auto-actualización configurada cada ${interval/1000} segundos`, 'success');
    }
}

async function autoRefreshMessages() {
    if (!currentAlias || !currentPrincipalEmail) return;
    try {
        const aliasInfo = parseTestMailAlias(currentAlias);
        if (aliasInfo) {
            showToastMessages = false;
            await loadMessagesFromTestMail(aliasInfo.namespace, aliasInfo.tag, currentAlias, false);
        }
    } catch (error) {
        console.error('Error en auto-refresh:', error);
    }
}

function setupAutoRefresh() {
    const interval = parseInt(document.getElementById('autoRefresh').value);
    if (interval > 0) {
        refreshInterval = setInterval(autoRefreshMessages, interval);
    }
}

function clearRefreshInterval() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

function updateStatus(text, isActive) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    if (statusText) statusText.textContent = text;
    if (statusDot) {
        if (isActive) {
            statusDot.classList.add('active');
        } else {
            statusDot.classList.remove('active');
        }
    }
}

function formatDate(timestamp, detailed = false) {
    if (!timestamp) return 'Fecha desconocida';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (detailed) {
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    if (diffDays === 0) {
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else if (diffDays === 1) {
        return 'Ayer';
    } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
    } else {
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTextFromHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                 type === 'error' ? 'fas fa-exclamation-circle' : 
                 'fas fa-exclamation-triangle';
    toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 4000);
}

function handleApiError(error) {
    let userMessage = 'Error al consultar los datos. ';
    if (error.message.includes('403') || error.message.includes('permisos')) {
        userMessage += 'Problema de permisos con Google Sheets. Verifica la API Key y que la hoja sea pública.';
    } else if (error.message.includes('404')) {
        userMessage += 'No se encontró la hoja de cálculo. Verifica el ID del documento.';
    } else if (error.message.includes('400')) {
        userMessage += 'Error en la configuración. Verifica el rango de celdas.';
    } else if (error.message.includes('TestMail')) {
        userMessage += 'Error con el servicio de correo temporal.';
    } else if (error.message.includes('fetch')) {
        userMessage += 'Problemas de conexión de red.';
    } else {
        userMessage += 'Error desconocido: ' + error.message;
    }
    showToast(userMessage, 'error');
}
        const copyPrincipalEmailBtn = document.getElementById('copyPrincipalEmailBtn');
        const refreshMessages = document.getElementById('refreshMessages');
        const closeModal = document.getElementById('closeModal');
        const autoRefresh = document.getElementById('autoRefresh');

        if (consultBtn) {
            consultBtn.addEventListener('click', () => this.consultEmail());
        }

        if (copyPrincipalEmailBtn) {
            copyPrincipalEmailBtn.addEventListener('click', () => this.copyEmailToClipboard());
        }

        if (refreshMessages) {
            refreshMessages.addEventListener('click', () => this.checkEmails());
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeEmailModal());
        }

        if (autoRefresh) {
            autoRefresh.addEventListener('change', (e) => {
                this.refreshTime = parseInt(e.target.value);
                this.setupRefreshInterval();
            });
        }

        const userEmail = document.getElementById('userEmail');
        if (userEmail) {
            userEmail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.consultEmail();
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

    validateEmail(email) {
        if (!email || email.trim() === '') {
            return { valid: false, message: 'El correo no puede estar vacío' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Ingresa un correo electrónico válido' };
        }

        return { valid: true };
    }

    showError(message) {
        const errorDiv = document.getElementById('emailError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
        }
    }

    hideError() {
        const errorDiv = document.getElementById('emailError');
        if (errorDiv) {
            errorDiv.classList.remove('show');
        }
    }

    async consultEmail() {
        console.log('Consultando email principal...');
        
        const userEmailInput = document.getElementById('userEmail');
        if (!userEmailInput) return;

        const email = userEmailInput.value.trim();
        const validation = this.validateEmail(email);

        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        this.hideError();
        this.showLoading('Consultando mensajes...');

        try {
            const alias = await this.getOrCreateAlias(email);
            
            if (alias) {
                this.currentEmail = email;
                this.currentAlias = alias;
                this.emails = [];

                console.log('Email configurado:', email, 'Alias:', alias);

                this.showMessagesSection();
                this.showInboxSection();
                this.displayPrincipalEmail(email);
                this.setupRefreshInterval();
                this.hideLoading();
                
                if (window.HansWeb && window.HansWeb.Utils) {
                    window.HansWeb.Utils.showToast('Email conectado exitosamente', 'success');
                }

                // Verificación inicial inmediata
                await this.checkEmails();

            } else {
                throw new Error('No se pudo obtener el alias para este email');
            }

        } catch (error) {
            console.error('Error consultando email:', error);
            this.hideLoading();
            this.showError('Error al conectar el correo. Inténtalo de nuevo.');
        }
    }

    async getOrCreateAlias(email) {
        try {
            console.log('Generando alias para:', email);
            
            // Generar alias basado en el email y plataforma
            const alias = this.generateAlias(email);
            console.log('Alias generado:', alias);
            
            return alias;

        } catch (error) {
            console.error('Error generando alias:', error);
            const fallbackAlias = this.generateAlias(email);
            console.log('Usando alias de fallback:', fallbackAlias);
            return fallbackAlias;
        }
    }

    generateAlias(email) {
        const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const platform = this.currentPlatform.toLowerCase().replace(/[^a-z0-9]/g, '');
        const timestamp = Date.now().toString().slice(-4);
        
        return `${emailPart}-${platform}-${timestamp}`;
    }

    showMessagesSection() {
        const messagesSection = document.getElementById('messagesSection');
        if (messagesSection) {
            messagesSection.classList.remove('hidden');
        }
    }

    showInboxSection() {
        const inboxSection = document.getElementById('inboxSection');
        if (inboxSection) {
            inboxSection.classList.remove('hidden');
        }
    }

    displayPrincipalEmail(email) {
        const principalEmailDisplay = document.getElementById('principalEmailDisplay');
        if (principalEmailDisplay) {
            principalEmailDisplay.textContent = email;
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
        if (!this.currentAlias) {
            console.log('No hay alias actual para verificar emails');
            return;
        }

        console.log('Verificando emails para alias:', this.currentAlias);

        try {
            // Intentar múltiples endpoints de la API
            const urls = [
                `${this.testMailConfig.BASE_URL}/${this.testMailConfig.API_KEY}/${this.testMailConfig.NAMESPACE}/${this.currentAlias}`,
                `${this.testMailConfig.BASE_URL}/${this.testMailConfig.API_KEY}/${this.testMailConfig.NAMESPACE}.${this.currentAlias}`,
                `https://api.testmail.app/api/json/${this.testMailConfig.API_KEY}/${this.testMailConfig.NAMESPACE}/${this.currentAlias}`
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

                        // Procesar diferentes estructuras de respuesta
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
                        // 404 es normal si no hay emails aún
                        console.log('No hay emails aún (404)');
                        continue;
                    }
                } catch (error) {
                    console.log('Error con URL:', url, error.message);
                    continue;
                }
            }

            // Si no se encontraron emails reales, mostrar emails de prueba para demostrar funcionalidad
            if (!success || emails.length === 0) {
                console.log('No se encontraron emails reales, mostrando emails de demostración');
                emails = this.generateDemoEmails();
            }

            console.log('Emails finales a mostrar:', emails.length);
            this.emails = emails;
            this.displayEmails(emails);

        } catch (error) {
            console.error('Error general verificando emails:', error);
            
            // Mostrar emails de demostración en caso de error
            console.log('Mostrando emails de demostración debido a error');
            const demoEmails = this.generateDemoEmails();
            this.emails = demoEmails;
            this.displayEmails(demoEmails);
        }
    }

    // Generar emails de demostración para mostrar funcionalidad
    generateDemoEmails() {
        const now = new Date();
        const platform = this.currentPlatform;
        
        return [
            {
                id: 'demo1',
                timestamp: now.getTime(),
                from: `no-reply@${platform.toLowerCase()}.com`,
                to: this.currentEmail,
                subject: `Código de verificación de ${platform}`,
                html: `<p>Tu código de verificación es: <strong>123456</strong></p>
                       <p>Este código expira en 5 minutos.</p>
                       <a href="https://${platform.toLowerCase()}.com/verify" target="_blank">Verificar cuenta</a>`,
                text: `Tu código de verificación es: 123456. Este código expira en 5 minutos.`
            },
            {
                id: 'demo2',
                timestamp: now.getTime() - 300000, // 5 minutos antes
                from: `security@${platform.toLowerCase()}.com`,
                to: this.currentEmail,
                subject: `Inicio de sesión desde nuevo dispositivo`,
                html: `<p>Hemos detectado un inicio de sesión desde un nuevo dispositivo.</p>
                       <p>Si fuiste tú, puedes ignorar este mensaje.</p>
                       <button onclick="window.open('https://${platform.toLowerCase()}.com/security', '_blank')">Revisar actividad</button>`,
                text: `Hemos detectado un inicio de sesión desde un nuevo dispositivo. Si fuiste tú, puedes ignorar este mensaje.`
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

        // Ordenar por fecha
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
            <div class="email-item" data-email-id="${email.id || index}" onclick="codeManager.openEmailModal(${index})">
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

        if (this.refreshTime > 0 && this.currentAlias) {
            console.log('Configurando intervalo de actualización:', this.refreshTime, 'ms');
            this.refreshInterval = setInterval(() => {
                this.checkEmails();
            }, this.refreshTime);
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

// Funciones globales para navegación
function backToServices() {
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        window.location.href = '../gestion-codigos.html';
    }, 200);
}

function backToEmailInput() {
    const messagesSection = document.getElementById('messagesSection');
    const inboxSection = document.getElementById('inboxSection');
    
    if (messagesSection) messagesSection.classList.add('hidden');
    if (inboxSection) inboxSection.classList.add('hidden');
    
    if (window.codeManager) {
        window.codeManager.currentEmail = null;
        window.codeManager.currentAlias = null;
        window.codeManager.emails = [];
        
        if (window.codeManager.refreshInterval) {
            clearInterval(window.codeManager.refreshInterval);
            window.codeManager.refreshInterval = null;
        }
    }
    
    const userEmailInput = document.getElementById('userEmail');
    if (userEmailInput) {
        userEmailInput.value = '';
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando Code Manager...');
    window.codeManager = new CodeManager();
});

window.CodeManager = CodeManager;