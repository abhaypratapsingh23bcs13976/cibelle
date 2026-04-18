if (typeof window.CibelleAuth === 'undefined') {
    window.CibelleAuth = (() => {
    // ─── Storage Keys ─────────────────────────────────────────────────────────
    const KEYS = {
        auth:  'cibelle_auth',
        token: 'cibelle_token',
        user:  'cibelle_user'
    };
    // ─── Read / Write ─────────────────────────────────────────────────────────
    function isLoggedIn() {
        return localStorage.getItem(KEYS.auth) === 'true' &&
               !!localStorage.getItem(KEYS.token);
    }
    function getUser() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.user) || '{}');
        } catch {
            return {};
        }
    }
    function getToken() {
        return localStorage.getItem(KEYS.token) || null;
    }
    function saveSession(token, user) {
        localStorage.setItem(KEYS.auth,  'true');
        localStorage.setItem(KEYS.token, token);
        localStorage.setItem(KEYS.user,  JSON.stringify(user));
    }
    function clearSession() {
        localStorage.removeItem(KEYS.auth);
        localStorage.removeItem(KEYS.token);
        localStorage.removeItem(KEYS.user);
    }
    // ─── Navbar Renderer ──────────────────────────────────────────────────────
    /**
     * Finds the navbar right section (works whether it's .navbar-right or 
     * a custom right container) and renders the correct auth state.
     * Must be safe to call multiple times — will replace, not duplicate.
     */
    function renderNavbar() {
        // Support multiple right-section selectors used across pages
        const container = document.querySelector('.navbar-right') ||
                          document.querySelector('.nav-actions');
        if (!container) return;
        // 1. Remove legacy/static Sign In button if present (the one hardcoded in HTML)
        // We do this first so it doesn't conflict with our dynamic slot
        const legacyButtons = container.querySelectorAll('#nav-auth-btn, .btn-signin-outline');
        legacyButtons.forEach(btn => {
            if (!btn.closest('#auth-slot')) btn.remove();
        });
        const user = getUser();
        // 2. Find or create the auth slot
        let authSlot = container.querySelector('#auth-slot');
        if (!authSlot) {
            authSlot = document.createElement('div');
            authSlot.id = 'auth-slot';
            authSlot.style.display = 'flex';
            authSlot.style.alignItems = 'center';
            authSlot.style.gap = '1rem';
            container.appendChild(authSlot);
        }
        if (isLoggedIn()) {
            // Robustly determine the user's initial and display name
            const firstName = user.first_name || (user.name ? user.name.split(' ')[0] : 'Member');
            const initial = (firstName.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase();
            const tier = user.membership_tier || localStorage.getItem('cibelle_tier') || 'silver';
            const tierLabel = { silver: 'SILVER', gold: 'GOLD', elite: 'ELITE' }[tier];
            const tierEmoji = { silver: '🩶', gold: '✦', elite: '♛' }[tier];
            authSlot.innerHTML = `
                <div class="profile-wrapper" id="auth-profile-wrapper">
                    <div class="profile-trigger" onclick="CibelleAuth.toggleDropdown()">
                        <div class="avatar">${initial}</div>
                    </div>
                    <div class="profile-dropdown" id="auth-profile-dropdown">
                        <div class="dropdown-header">
                            <p class="user-greeting">Welcome back, <br><span class="user-first-name">${firstName}</span></p>
                            <p class="user-email">${user.email || ''}</p>
                            <span class="membership-tag">${tierEmoji} CIBELLE ${tierLabel}</span>
                        </div>
                        <div class="dropdown-divider-gold"></div>
                        <ul class="dropdown-menu">
                            <li><a href="/profile">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                My Profile
                            </a></li>
                            <li><a href="/orders">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                                My Orders
                            </a></li>
                            <li><a href="/saved">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                                Saved Places
                            </a></li>
                            <li><a href="/membership">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                Membership
                            </a></li>
                            <li><a href="/settings">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.65a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                Settings
                            </a></li>
                        </ul>
                        <div class="dropdown-divider-gold"></div>
                        <a href="#" class="logout-link" onclick="CibelleAuth.logout(); return false;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Sign Out
                        </a>
                    </div>
                </div>
            `;
        } else {
            // Not logged in — show Sign In button
            authSlot.innerHTML = `
                <a href="login.html" class="btn-signin-outline" id="nav-auth-btn-dynamic">Sign In</a>
            `;
        }
        // Close dropdown when clicking outside
        _attachDropdownDismiss();
    }
    // ─── Dropdown Toggle ──────────────────────────────────────────────────────
    function toggleDropdown() {
        const dd = document.getElementById('auth-profile-dropdown');
        if (dd) dd.classList.toggle('active');
    }
    function _attachDropdownDismiss() {
        // Prevent duplicate listeners
        if (window.__cibelleDropdownListenerAttached) return;
        window.__cibelleDropdownListenerAttached = true;
        window.addEventListener('click', (e) => {
            const wrapper = document.getElementById('auth-profile-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                const dd = document.getElementById('auth-profile-dropdown');
                if (dd) dd.classList.remove('active');
            }
        });
    }
    // ─── Auth Actions ─────────────────────────────────────────────────────────
    async function login(email, password) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Login failed');
        saveSession(data.token, data.user);
        return data;
    }
    async function signup(firstName, middleName, lastName, email, password, role) {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, middleName, lastName, email, password, role })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Signup failed');
        saveSession(data.token, data.user);
        return data;
    }
    function logout() {
        clearSession();
        localStorage.removeItem('cibelle_tier');
        // Smooth fade-out before redirect
        document.body.style.transition = 'opacity 0.4s';
        document.body.style.opacity = '0';
        setTimeout(() => { window.location.href = '/'; }, 400);
    }
    function requireAuth() {
        if (!isLoggedIn()) {
            sessionStorage.setItem('cibelle_redirect_target', window.location.href);
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
    // ─── Init ─────────────────────────────────────────────────────────────────
    async function validateSession() {
        if (!isLoggedIn()) return;
        try {
            const token = getToken();
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403 || res.status === 404) {
                console.warn('CibelleAuth: Session invalid, expired, or account not found. Clearing state.');
                clearSession();
                // Optionally keep user in localStorage for fields but clear auth
                window.location.href = 'login.html?expired=true';
            }
        } catch (err) {
            console.error('CibelleAuth: Session validation failed (Network error).');
        }
    }
    async function init() {
        renderNavbar();
        await validateSession();
    }
    // ─── Public API ───────────────────────────────────────────────────────────
    return {
        init,
        isLoggedIn,
        getUser,
        getToken,
        saveSession,
        clearSession,
        login,
        signup,
        logout,
        requireAuth,
        renderNavbar,
        toggleDropdown
    };
})();
// Auto-run on every page as soon as DOM is ready
document.addEventListener('DOMContentLoaded', () => CibelleAuth.init());
    // Also expose logout globally for legacy onclick handlers
    window.logout = function() { window.CibelleAuth.logout(); };
}

/**
 * Global Password Toggle Utility
 */
function togglePasswordVisibility(id) {
    const el = document.getElementById(id);
    if(!el) return;
    const type = el.type === 'password' ? 'text' : 'password';
    el.type = type;
    const icon = el.parentElement.querySelector('.pass-toggle');
    if(icon) {
        icon.style.color = type === 'text' ? 'var(--gold)' : 'rgba(255,255,255,0.3)';
        icon.innerHTML = type === 'text' 
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}
