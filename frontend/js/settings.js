/**
 * Cibelle Luxury Platform - Settings Controller
 * Handles user preferences, session management, and account security.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!CibelleAuth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    loadUserSettings();
    setupUXInteractions();
});

let currentUser = null;

/**
 * Load and Apply User Settings from Server
 */
async function loadUserSettings() {
    try {
        const token = CibelleAuth.getToken();
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message);
        
        currentUser = data.user;
        applySettingsToUI(currentUser);
    } catch (err) {
        console.error('Settings Load Error:', err);
        showToast('Unable to synchronize your preferences. Using local cache.');
    }
}

function applySettingsToUI(user) {
    // Notifications
    const push = document.getElementById('push-toggle');
    const email = document.getElementById('email-toggle');
    const offers = document.getElementById('offers-toggle');

    if (push) push.checked = user.push_notifications;
    if (email) email.checked = user.email_concierge;
    if (offers) offers.checked = user.offer_notifications;

    // Language
    const preferredLang = user.preferred_language || 'en';
    const langBtns = document.querySelectorAll('#lang-selector .lang-btn');
    langBtns.forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase() === preferredLang);
    });
}

/**
 * Update Notification Preferences
 */
async function updateNotifyPreference(type, value) {
    try {
        const token = CibelleAuth.getToken();
        const body = {};
        if (type === 'push') body.pushNotifications = value;
        if (type === 'email') body.emailConcierge = value;
        if (type === 'offers') body.offerNotifications = value;

        const response = await fetch('/api/auth/settings', {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Failed to update preference');
        showToast(`Your ${type} notification preference has been updated.`);
    } catch (err) {
        showToast('Identity verification required to update preferences.');
        // Revert UI if failed
        loadUserSettings();
    }
}

/**
 * Update Language Preference
 */
async function updateLangPreference(lang) {
    try {
        const token = CibelleAuth.getToken();
        const response = await fetch('/api/auth/settings', {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ language: lang })
        });

        if (!response.ok) throw new Error('Failed to update language');
        
        // Update UI locally
        const langBtns = document.querySelectorAll('#lang-selector .lang-btn');
        langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.innerText.toLowerCase() === lang);
        });
        
        showToast(`Experience language set to ${lang.toUpperCase()}.`);
    } catch (err) {
        showToast('Unable to update experience language.');
    }
}

/**
 * Session Management Logic
 */
function showSessionsModal() {
    const modal = document.getElementById('sessions-modal');
    modal.classList.add('active');
    fetchAndRenderSessions();
}

function closeSessionsModal() {
    document.getElementById('sessions-modal').classList.remove('active');
}

async function fetchAndRenderSessions() {
    const list = document.getElementById('sessions-list');
    try {
        const token = CibelleAuth.getToken();
        const response = await fetch('/api/auth/sessions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message);

        list.innerHTML = '';
        if (data.sessions.length === 0) {
            list.innerHTML = '<p class="settings-desc">No active sessions detected.</p>';
            return;
        }

        data.sessions.forEach(session => {
            const date = new Date(session.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
            const isCurrent = session.device_info === navigator.userAgent; // Simple check

            const item = document.createElement('div');
            item.className = 'glass-card reveal';
            item.style.padding = '1rem';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.background = 'rgba(255,255,255,0.02)';

            item.innerHTML = `
                <div>
                  <p style="color: var(--gold); font-size: 0.9rem; margin-bottom: 0.2rem;">
                    ${isCurrent ? 'Current Session' : 'Linked Device'}
                  </p>
                  <p style="font-size: 0.8rem; opacity: 0.7;">IP: ${session.ip_address} | Started: ${date}</p>
                  <p style="font-size: 0.7rem; opacity: 0.4; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${session.device_info}
                  </p>
                </div>
                ${!isCurrent ? `
                    <button class="btn-premium-action" style="font-size: 0.7rem; color: #e74c3c;" onclick="revokeSession(${session.id})">Terminate</button>
                ` : ''}
            `;
            list.appendChild(item);
        });
    } catch (err) {
        list.innerHTML = '<p class="settings-desc">An error occurred while compiling sessions.</p>';
    }
}

async function revokeSession(id) {
    try {
        const token = CibelleAuth.getToken();
        const response = await fetch(`/api/auth/sessions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('Session terminated successfully.');
            fetchAndRenderSessions();
        }
    } catch (err) {
        showToast('Security block: Session termination failed.');
    }
}

/**
 * Password & Account Security
 */
function openPasswordModal() {
    document.getElementById('password-modal').classList.add('active');
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.remove('active');
}

async function handlePasswordChange(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;

    if (newPass !== confirmPass) {
        showToast('Credential mismatch: Passwords do not match.');
        return;
    }

    try {
        const token = CibelleAuth.getToken();
        const response = await fetch('/api/auth/settings', {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ password: newPass })
        });

        if (!response.ok) throw new Error('Update failed');
        
        showToast('Account credentials updated successfully.');
        closePasswordModal();
        event.target.reset();
    } catch (err) {
        showToast('Security check failed: Unable to update password.');
    }
}

async function deleteAccount() {
    const confirmation = confirm("This action is irreversible. All your data, favorites, and history will be permanently erased. Proceed with account termination?");
    if (!confirmation) return;

    try {
        const token = CibelleAuth.getToken();
        const response = await fetch('/api/auth/account', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            CibelleAuth.logout();
        } else {
            throw new Error();
        }
    } catch (err) {
        showToast('Termination blocked: Contact concierge for assistance.');
    }
}

function setupUXInteractions() {
    // Add interaction logic if needed
    // The "Sign Credentials" button in settings.html uses onclick="openPasswordModal()" 
}

window.showSessionsModal = showSessionsModal;
window.closeSessionsModal = closeSessionsModal;
window.revokeSession = revokeSession;
window.handlePasswordChange = handlePasswordChange;
window.deleteAccount = deleteAccount;
window.updateNotifyPreference = updateNotifyPreference;
window.updateLangPreference = updateLangPreference;
window.closePasswordModal = closePasswordModal;
window.openPasswordModal = function() {
    document.getElementById('password-modal').classList.add('active');
};
