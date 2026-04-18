document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Protection
    const token  = localStorage.getItem('cibelle_token');
    const isAuth = localStorage.getItem('cibelle_auth') === 'true';

    if (!isAuth || !token) {
        window.location.href = '/login.html';
        return;
    }

    // 2. Verify token is still valid before rendering the page
    try {
        const testRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (testRes.status === 401 || testRes.status === 403) {
            // Token expired or invalid — clear session and send to login
            localStorage.removeItem('cibelle_auth');
            localStorage.removeItem('cibelle_token');
            // Keep cibelle_user in localStorage so profile fields survive re-login
            window.location.href = '/login.html';
            return;
        }
    } catch {
        // Network error — proceed anyway (offline mode)
    }

    // 3. Initial Page Setup
    setupDashboard();

    // 4. Page specific logic — detect by element presence OR path
    const path = window.location.pathname;
    const hasProfileEl = !!document.getElementById('hero-name') || !!document.getElementById('header-user-name');
    if (hasProfileEl || path.includes('/profile'))     loadProfile();
    else if (path.includes('/orders'))                 loadOrders();
    else if (path.includes('/saved'))                  loadSaved();
    else if (path.includes('/membership'))             loadMembership();
    else if (path.includes('/settings'))               loadSettings();
    else if (path.includes('/dashboard'))              loadDashboardOverview();
});

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('cibelle_token');
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    // Auto-handle expired tokens anywhere in the app
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('cibelle_auth');
        localStorage.removeItem('cibelle_token');
        window.location.href = '/login.html';
        throw new Error('Session expired. Please sign in again.');
    }

    return res;
}

function setupDashboard() {
    const user = JSON.parse(localStorage.getItem('cibelle_user') || '{}');
    // Update any common dashboard header elements if they exist
    const userNameEl = document.getElementById('dash-user-name');
    if (userNameEl) {
        const fullName = user.first_name 
            ? `${user.first_name}${user.middle_name ? ' ' + user.middle_name : ''} ${user.last_name || ''}`.trim() 
            : (user.name || 'Member');
        userNameEl.innerText = fullName;
    }

    setupRevealAnimations();
}

function setupRevealAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal, .reveal-item').forEach(el => observer.observe(el));
}

// --- PROFILE ---
async function loadProfile() {
    // Step 1: Immediately show whatever we have in localStorage  
    // (preloadFromCache in profile.html already did this, but dashboard
    //  pages also call this function, so ensure it runs)
    const cachedUser = (() => {
        try { return JSON.parse(localStorage.getItem('cibelle_user') || '{}'); }
        catch { return {}; }
    })();

    try {
        const [profileRes, ordersRes] = await Promise.all([
            fetchWithAuth('/api/auth/me'),
            fetchWithAuth('/api/orders').catch(() => ({ json: async () => [] }))
        ]);

        const { user: apiUser } = await profileRes.json();
        if (!apiUser) return;

        // Step 2: Merge API response WITH localStorage — API wins for non-null values,
        // localStorage wins as a fallback so cached data is never erased by a null column
        const user = {
            ...cachedUser,
            ...Object.fromEntries(
                Object.entries(apiUser).filter(([, v]) => v !== null && v !== undefined && v !== '')
            )
        };

        // Step 3: Write merged user back to localStorage so future loads are correct
        localStorage.setItem('cibelle_user', JSON.stringify(user));

        // ── Hero ──
        const fullName = user.first_name 
            ? `${user.first_name}${user.middle_name ? ' ' + user.middle_name : ''} ${user.last_name || ''}`.trim() 
            : (user.name || 'Member');

        const initial = fullName.charAt(0).toUpperCase();
        _setText('hero-avatar',    initial);
        _setText('hero-name',      fullName);
        _setText('hero-email',     user.email || '');
        _setText('dash-user-name', fullName);

        // Member since
        const joined = user.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
        _setText('member-since-label', `Cibelle Member Since ${joined}`);

        // Tier badge
        const tier = localStorage.getItem('cibelle_tier') || 'silver';
        const tierMap = { silver: ['🩶', 'Cibelle Silver'], gold: ['✦', 'Cibelle Gold'], elite: ['♛', 'Cibelle Elite'] };
        _setText('hero-tier-icon',  tierMap[tier][0]);
        _setText('hero-tier-label', tierMap[tier][1]);

        // ── Personal detail fields ──
        _setText('disp-first-name',  user.first_name || '—');
        _setText('disp-middle-name', user.middle_name || 'None');
        _setText('disp-last-name',   user.last_name || '—');
        _setText('disp-name',        fullName); // Fallback for pages using single name display
        _setText('disp-email',       user.email || '—');
        _setText('disp-phone',       user.phone || 'Not set');

        _val('inp-first-name',  user.first_name  || '');
        _val('inp-middle-name', user.middle_name || '');
        _val('inp-last-name',   user.last_name   || '');
        _val('inp-name',        fullName);
        _val('inp-email',       user.email       || '');
        _val('inp-phone',       user.phone       || '');

        // ── Address ──
        if (user.address) _setText('primary-address-text', user.address);

        // ── Stats ──
        try {
            const orders = await ordersRes.json();
            _setText('stat-orders', orders.length > 0 ? String(orders.length) : '0');

            if (orders.length > 0) {
                const tally = {};
                orders.forEach(o => {
                    const key = o.restaurant_name || 'Various';
                    tally[key] = (tally[key] || 0) + 1;
                });
                const fav = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
                _setText('stat-cuisine', fav.split(' ')[0]);
            } else {
                _setText('stat-cuisine', 'Exploring');
            }

            const total = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
            _setText('stat-spent', total > 0 ? `₹${(total / 1000).toFixed(1)}k` : '₹0');
        } catch { /* orders API unavailable */ }

    } catch (err) {
        console.error('Profile load error:', err);
        // API failed — display fields should still show localStorage values
        // (already populated by preloadFromCache in profile.html)
    }
}

function _setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function _val(id, val)     { const el = document.getElementById(id); if (el) el.value = val; }


async function handleProfileUpdate(e) {
    e.preventDefault();
    const btn = e.submitter;
    btn.innerText = 'SAVING CHANGES...';
    
    const firstNameEl = document.getElementById('inp-first-name') || document.getElementById('firstName');
    const middleNameEl = document.getElementById('inp-middle-name') || document.getElementById('middleName');
    const lastNameEl = document.getElementById('inp-last-name') || document.getElementById('lastName');
    const phoneEl = document.getElementById('inp-phone') || document.getElementById('phone');
    
    const body = {
        firstName: firstNameEl ? firstNameEl.value : '',
        middleName: middleNameEl ? middleNameEl.value : '',
        lastName: lastNameEl ? lastNameEl.value : '',
        phone: phoneEl ? phoneEl.value : ''
    };

    try {
        const res = await fetchWithAuth('/api/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Portfolio updated successfully.');
            localStorage.setItem('cibelle_user', JSON.stringify(data.user));
            // Re-hydrate the header and address card
            loadProfile(); 
        } else {
            showToast(data.message);
        }
    } catch (err) { showToast('Failed to update portfolio.'); }
    finally { btn.innerText = 'UPDATE PROFILE'; }
}

// --- ORDERS ---
async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    try {
        const res = await fetchWithAuth('/api/orders');
        const orders = await res.json();
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state-luxury">
                    <h3>Your journey begins here</h3>
                    <p>Discover curated dining experiences and start your legendary culinary history.</p>
                    <a href="/index.html" class="btn-luxury-cta">Explore Restaurants</a>
                </div>`;
            return;
        }

        container.innerHTML = orders.map(o => `
            <div class="order-card reveal">
                <div class="order-img-wrapper">
                    <img src="${o.restaurant_image || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800'}" alt="${o.restaurant_name}">
                </div>
                <div class="order-content-luxury">
                    <div class="order-header-luxury">
                        <div>
                            <h3 class="order-restaurant-name">${o.restaurant_name || 'Cibelle Selection'}</h3>
                            <div class="order-meta">
                                <span>${new Date(o.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span>•</span>
                                <span>Order #${String(o.id).padStart(6, '0').slice(-6)}</span>
                            </div>
                        </div>
                        <span class="status-badge ${o.status.toLowerCase()}">${o.status}</span>
                    </div>
                    
                    <div class="order-items-list">
                        ${o.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                    </div>
                    
                    <div class="order-footer-luxury">
                        <span class="order-price-luxury">₹${o.total_price}</span>
                        <div class="order-actions-luxury">
                            <button class="btn-text" style="font-size: 0.7rem; letter-spacing: 1px;" onclick="alert('Viewing full details for ${o.id}...')">DETAILS</button>
                            <button class="btn-gold-sm" onclick="reorder('${o.id}')">REORDER</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        setupRevealAnimations();
    } catch (err) { container.innerHTML = '<p>Failed to load orders.</p>'; }
}

async function reorder(id) {
    alert("Adding items to your selection for review...");
    // Ideally this would fetch order details and call addToCart for each
    // For this prototype, we confirm the action.
}

// --- SAVED ---
async function loadSaved() {
    const container = document.getElementById('saved-grid');
    if (!container) return;

    try {
        const res = await fetchWithAuth('/api/favorites');
        const favorites = await res.json();

        if (favorites.length === 0) {
            container.innerHTML = `
                <div class="wishlist-empty-state">
                    <div class="empty-state-text">Your curated list awaits refinement.</div>
                    <a href="/index.html#restaurants" class="btn-discover-luxury">Discover Restaurants</a>
                </div>
            `;
            return;
        }

        container.innerHTML = favorites.map(f => `
            <div class="wishlist-card reveal" onclick="window.location.href='/restaurant.html?id=${f.restaurant_id}'">
                <div class="wishlist-heart">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <div class="wishlist-remove-overlay">
                    <button class="btn-remove-wishlist" onclick="event.stopPropagation(); removeFavorite('${f.restaurant_id}')">Remove from saved</button>
                </div>
                <div class="wishlist-card-img-wrapper">
                    <img src="${f.restaurant_image}" alt="${f.restaurant_name}" class="wishlist-card-img">
                </div>
                <div class="wishlist-card-content">
                    <div>
                        <span class="wishlist-card-tagline">${f.restaurant_cuisine}</span>
                        <h3 class="wishlist-card-title">${f.restaurant_name}</h3>
                    </div>
                    <div class="wishlist-card-footer">
                        <div class="wishlist-rating">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                            <span>${f.restaurant_rating || '4.9'}</span>
                        </div>
                        <span style="font-size: 0.65rem; color: var(--gold); letter-spacing: 2px; font-weight: 600;">PORTFOLIO</span>
                    </div>
                </div>
            </div>
        `).join('');

        setupRevealAnimations();
    } catch (err) { container.innerHTML = '<p>Failed to load saved restaurants.</p>'; }
}

async function loadMembership() {
    const user = JSON.parse(localStorage.getItem('cibelle_user') || '{}');
    const fullName = user.first_name 
        ? `${user.first_name}${user.middle_name ? ' ' + user.middle_name : ''} ${user.last_name || ''}`.trim() 
        : (user.name || 'Member');
    
    _setText('dash-user-name', fullName);
    _setText('card-user-name', fullName.toUpperCase());
    _setText('card-membership-id', `ID: CB-${String(user.id || '9921').padStart(4, '0')}-VIP`);
    
    if (typeof MembershipSystem !== 'undefined') {
        // MembershipSystem.init() handles tier-specific UI
        // but we can force a sync here too
        const tier = user.membership_tier || localStorage.getItem('cibelle_tier') || 'silver';
        _setText('card-tier-badge', tier.toUpperCase());
    }
}

async function removeFavorite(id) {
    try {
        const res = await fetchWithAuth(`/api/favorites/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Atmosphere removed from selection.');
            loadSaved();
        }
    } catch (err) { showToast('Failed to remove.'); }
}

// --- SETTINGS ---
async function loadSettings() {

    // Handle Toggles
    document.querySelectorAll('.premium-toggle input').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const label = e.target.closest('.settings-row').querySelector('.settings-label').innerText;
            const state = e.target.checked ? 'activated' : 'deactivated';
            showToast(`${label} ${state} in your secure preferences.`);
        });
    });

    // Handle Language Buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showToast(`Experience language set to ${btn.innerText}.`);
        });
    });
}

function showPasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) modal.classList.add('active');
}

function closePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) modal.classList.remove('active');
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const btn = e.submitter;
    const password = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;

    if (password !== confirm) {
        showToast("Access credentials do not match.");
        return;
    }

    btn.innerText = 'SECURING ACCOUNT...';
    try {
        const res = await fetchWithAuth('/api/auth/settings', {
            method: 'PATCH',
            body: JSON.stringify({ password })
        });
        if (res.ok) {
            showToast('Security credentials updated successfully.');
            closePasswordModal();
        } else {
            const data = await res.json();
            showToast(data.message || 'Verification failed.');
        }
    } catch (err) { 
        showToast('Communication with security vault failed.'); 
    } finally {
        btn.innerText = 'Update Password';
    }
}

async function deleteAccount() {
    if (!confirm("Are you certain? This will permanently revoke your Cibelle membership and all history.")) return;
    try {
        await fetchWithAuth('/api/auth/account', { method: 'DELETE' });
        localStorage.clear();
        showToast('Membership revoked. Farewell.');
        setTimeout(() => window.location.href = '/index.html', 1500);
    } catch (err) { showToast('Revocation protocol failed.'); }
}

// --- OVERVIEW ---
async function loadDashboardOverview() {
    const ordersEl = document.getElementById('stat-orders');
    const savedEl = document.getElementById('stat-saved');
    const activityContainer = document.getElementById('recent-activity-container');
    const suggestionsContainer = document.getElementById('handpicked-suggestions');

    try {
        // Fetch all necessary data in parallel
        const [ordersRes, favoritesRes, restaurantsRes] = await Promise.all([
            fetchWithAuth('/api/orders'),
            fetchWithAuth('/api/favorites'),
            fetch('/api/restaurants').then(r => r.json())
        ]);

        const orders = await ordersRes.json();
        const favorites = await favoritesRes.json();
        // Fallback for restaurants since they are public
        const restaurants = Array.isArray(restaurantsRes) ? restaurantsRes : [];

        // 1. Update Stats Mosaic
        if (ordersEl) ordersEl.innerText = orders.length;
        if (savedEl) savedEl.innerText = favorites.length;

        // 2. Populate Recent Activity (Pulse)
        if (activityContainer) {
            if (orders.length === 0) {
                activityContainer.innerHTML = '<p class="loader-gold" style="opacity: 0.5;">No recent activity in your log.</p>';
            } else {
                const latest = orders[0];
                activityContainer.innerHTML = `
                    <div class="pulse-item reveal">
                        <div class="pulse-info">
                            <h4>${latest.restaurant_name}</h4>
                            <p>Refined selection from ${new Date(latest.date).toLocaleDateString()}</p>
                        </div>
                        <div class="pulse-status">
                            <span class="pulse-dot"></span>
                            ${latest.status.toUpperCase()}
                        </div>
                    </div>
                    <div class="pulse-item reveal" style="opacity: 0.6; transform: scale(0.95);">
                         <div class="pulse-info">
                            <h4>Executive Concierge</h4>
                            <p>Standing by for your next selection</p>
                        </div>
                    </div>
                `;
            }
        }

        // 3. Populate Chef's Suggestions
        if (suggestionsContainer) {
            // Pick 3 random restaurants or just the first 3
            const picks = restaurants.sort(() => 0.5 - Math.random()).slice(0, 3);
            suggestionsContainer.innerHTML = picks.map(r => `
                <div class="mini-restaurant-card reveal" onclick="window.location.href='/restaurant.html?id=${r.id}'">
                    <img src="${r.image}" alt="${r.name}" class="mini-img">
                    <div class="mini-info">
                        <h4>${r.name}</h4>
                        <p>${r.cuisine} • ${r.location || 'Luxury District'}</p>
                        <div class="mini-meta">
                            <span>★ ${r.rating || '4.9'}</span>
                            <span style="font-size: 0.5rem; letter-spacing: 1px;">DISCOVER</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error('Error loading Command Center:', err);
        if (activityContainer) activityContainer.innerHTML = '<p>Offline mode activated.</p>';
    }
}
