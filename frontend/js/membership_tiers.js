/**
 * Cibelle — Membership Tier System
 * Handles: tier reads/writes from localStorage, badge injection,
 * locked card rendering, and the upgrade ceremony.
 */
const MembershipSystem = (() => {

    // ─── Tier configuration ──────────────────────────────────────────────────
    const TIERS = {
        silver: {
            id: 'silver',
            label: 'SILVER',
            emoji: '🩶',
            tagline: 'Your journey begins.',
            price: 0,
            minRestaurantTier: 0,   // access all non-elite restaurants
            features: [
                { text: 'Access to all standard establishments', locked: false },
                { text: 'Standard delivery priority', locked: false },
                { text: 'Digital menu access', locked: false },
                { text: 'Priority reservations', locked: true },
                { text: 'Access to premium establishments', locked: true },
                { text: 'Exclusive menus & private dining', locked: true },
            ]
        },
        gold: {
            id: 'gold',
            label: 'GOLD',
            emoji: '✦',
            tagline: 'Elevated access. Refined taste.',
            price: 1999,
            minRestaurantTier: 0,
            features: [
                { text: 'Access to all standard & premium establishments', locked: false },
                { text: 'Priority reservations & preferred time slots', locked: false },
                { text: 'Dedicated concierge line', locked: false },
                { text: 'Seasonal & chef special menus', locked: false },
                { text: 'Elite-exclusive establishments', locked: true },
                { text: 'Private chef experiences', locked: true },
            ]
        },
        elite: {
            id: 'elite',
            label: 'ELITE',
            emoji: '♛',
            tagline: 'No table left unexplored.',
            price: 4999,
            minRestaurantTier: 0,
            features: [
                { text: 'Unlimited access to all establishments', locked: false },
                { text: 'Priority plus reservations — guaranteed', locked: false },
                { text: 'Personal dining concierge (24/7)', locked: false },
                { text: 'Exclusive member-only menus', locked: false },
                { text: 'Private chef home dining experiences', locked: false },
                { text: 'Invitation-only seasonal events', locked: false },
            ]
        }
    };

    // Restaurants that require Elite tier (by ID or isPremium flag)
    // For simplicity we mark restaurants with IDs 3, 5, 8 as Elite-only
    const ELITE_ONLY_RESTAURANT_IDS = ['3', '5', '8', '10'];

    // ─── State ───────────────────────────────────────────────────────────────
    function getCurrentTier() {
        const userStr = localStorage.getItem('cibelle_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.membership_tier) return user.membership_tier;
            } catch(e) {}
        }
        return localStorage.getItem('cibelle_tier') || 'silver';
    }

    function setTier(tier) {
        localStorage.setItem('cibelle_tier', tier);
    }

    function canAccess(restaurantId) {
        const tier = getCurrentTier();
        if (ELITE_ONLY_RESTAURANT_IDS.includes(String(restaurantId))) {
            return tier === 'elite';
        }
        return true; // silver & gold can access everything else
    }

    // ─── Navbar Badge ─────────────────────────────────────────────────────────
    function injectNavBadge() {
        // Only show badge if logged in
        if (typeof CibelleAuth !== 'undefined' && !CibelleAuth.isLoggedIn()) {
            return;
        }

        // Remove any existing badge
        const existing = document.querySelector('.tier-badge-nav');
        if (existing) existing.remove();

        const tier = getCurrentTier();
        const config = TIERS[tier];
        if (!config) return;

        const badge = document.createElement('span');
        badge.className = `tier-badge-nav ${tier}`;
        badge.innerHTML = `${config.emoji} ${config.label}`;
        badge.title = `Your membership: ${config.label}`;

        // Insert into navbar — after cart icon
        const cartWrapper = document.querySelector('.cart-wrapper');
        if (cartWrapper) {
            cartWrapper.insertAdjacentElement('afterend', badge);
        }

        // Also update dropdown
        const dropdownTag = document.querySelector('.membership-tag');
        if (dropdownTag) {
            dropdownTag.textContent = `CIBELLE ${config.label}`;
            dropdownTag.className = `membership-tag tier-${tier}`;
        }
    }

    // ─── Lock Cards on Home Grid ──────────────────────────────────────────────
    function applyLockOverlays() {
        const cards = document.querySelectorAll('.card[onclick]');
        cards.forEach(card => {
            // Extract restaurant id from onclick attr
            const match = card.getAttribute('onclick')?.match(/'(\d+)'/);
            if (!match) return;
            const id = match[1];
            if (!canAccess(id)) {
                // Remove click behaviour
                card.removeAttribute('onclick');
                card.removeAttribute('onkeydown');
                card.style.cursor = 'default';

                // Inject overlay
                const overlay = document.createElement('div');
                overlay.className = 'card-locked-overlay';
                overlay.innerHTML = `
                    <div class="lock-icon">🔒</div>
                    <div class="lock-label">Exclusive to Elite Members</div>
                    <div class="lock-tier-hint">Upgrade to unlock this establishment</div>
                    <button class="btn-unlock" onclick="event.stopPropagation(); MembershipSystem.showUpgradeModal()">
                        Upgrade Access
                    </button>
                `;
                card.style.position = 'relative';
                card.appendChild(overlay);
            }
        });
    }

    // ─── Upgrade Banner ───────────────────────────────────────────────────────
    function injectUpgradeBanner() {
        const tier = getCurrentTier();
        if (tier === 'elite') return; // no banner for elite

        const grid = document.getElementById('restaurant-grid');
        if (!grid) return;

        // Don't insert if already there
        if (document.querySelector('.upgrade-banner')) return;

        const msg = tier === 'silver'
            ? { next: 'Gold', text: 'Unlock priority reservations and access to premium establishments.' }
            : { next: 'Elite', text: 'Unlock every exclusive establishment and private dining access.' };

        const banner = document.createElement('div');
        banner.className = 'upgrade-banner';
        banner.innerHTML = `
            <div class="upgrade-banner-text">
                <span class="upgrade-banner-eyebrow">Your Next Level Awaits</span>
                <div class="upgrade-banner-title">Upgrade to Cibelle ${msg.next}</div>
                <div class="upgrade-banner-sub">${msg.text}</div>
            </div>
            <button class="btn-upgrade-banner" onclick="MembershipSystem.showUpgradeModal()">
                Upgrade Now
            </button>
        `;
        // Insert after 3rd card
        const cards = grid.querySelectorAll('.card');
        if (cards.length >= 3) {
            cards[2].insertAdjacentElement('afterend', banner);
        } else {
            grid.appendChild(banner);
        }
    }

    // ─── Upgrade Ceremony ────────────────────────────────────────────────────
    function showCeremony(newTier) {
        const config = TIERS[newTier];
        let overlay = document.getElementById('upgrade-ceremony');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'upgrade-ceremony';
            overlay.className = 'upgrade-ceremony';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
            <div class="ceremony-glow">${config.emoji}</div>
            <div class="ceremony-title">Welcome to Cibelle ${config.label}</div>
            <div class="ceremony-sub">${config.tagline}<br>Your world of exclusivity has expanded.</div>
        `;
        overlay.classList.add('show');
        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 500);
        }, 3500);
    }

    // ─── Upgrade Modal (redirect to membership page) ──────────────────────────
    function showUpgradeModal() {
        window.location.href = 'membership.html';
    }

    // ─── Tier Selection (called from membership.html buttons) ─────────────────
    async function selectTier(newTier) {
        const current = getCurrentTier();
        if (newTier === current) return;

        const tierOrder = ['silver', 'gold', 'elite'];
        const isUpgrade = tierOrder.indexOf(newTier) > tierOrder.indexOf(current);

        // Find and disable the button to prevent multiple clicks
        const btn = document.querySelector(`.tier-card.${newTier} .btn-tier-select`);
        const originalText = btn ? btn.innerText : '';
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'Initializing...';
        }

        if (isUpgrade) {
            const tierConfig = TIERS[newTier];
            if (typeof Payments !== 'undefined') {
                if (btn) btn.innerText = 'Awaiting Payment...';
                const paymentResult = await Payments.upgradeMembership(newTier, tierConfig.price);
                if (!paymentResult.success) {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerText = originalText;
                    }
                    return;
                }
            }
        }

        // Sync local state (fetch fresh profile)
        const token = localStorage.getItem('cibelle_token');
        if (token) {
            if (btn) btn.innerText = 'Syncing Profile...';
            try {
                const res = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('cibelle_user', JSON.stringify(data.user));
                    localStorage.setItem('cibelle_tier', data.user.membership_tier);
                }
            } catch (err) {
                console.error('Tier sync error:', err);
            }
        }

        if (isUpgrade) {
            showCeremony(newTier);
            setTimeout(() => {
                renderTierPage();
                renderMembershipCard();
            }, 500);
        } else {
            renderTierPage();
            renderMembershipCard();
        }
        
        if (typeof CibelleAuth !== 'undefined') CibelleAuth.renderNavbar();
    }

    // ─── Membership Page Renderer ─────────────────────────────────────────────
    function renderTierPage() {
        const container = document.getElementById('tier-cards-container');
        if (!container) return;

        const current = getCurrentTier();

        container.innerHTML = Object.values(TIERS).map(t => {
            const isCurrent = t.id === current;
            const isUpgrade = ['silver','gold','elite'].indexOf(t.id) > ['silver','gold','elite'].indexOf(current);
            const isElite = t.id === 'elite';

            return `
                <div class="tier-card ${t.id}">
                    ${isElite ? '<div class="tier-card-recommended">MOST EXCLUSIVE</div>' : ''}
                    <div class="tier-card-name">${t.label}</div>
                    <div class="tier-card-tagline">${t.tagline}</div>
                    <ul class="tier-features">
                        ${t.features.map(f => `
                            <li>
                                <div class="feat-check">${f.locked ? '✕' : '✓'}</div>
                                <span class="${f.locked ? 'feat-locked' : ''}">${f.text}</span>
                            </li>
                        `).join('')}
                    </ul>
                    <div class="tier-card-divider"></div>
                    <div class="tier-price">₹${t.price.toLocaleString('en-IN')} <span>/ Year</span></div>
                    <button class="btn-tier-select ${isCurrent ? 'current' : ''}"
                            onclick="MembershipSystem.selectTier('${t.id}')">
                        ${isCurrent ? '✓ Current Plan' : isUpgrade ? `Upgrade to ${t.label}` : `Switch to ${t.label}`}
                    </button>
                </div>
            `;
        }).join('');
    }

    // ─── Current Membership Card (for the dashboard card in membership.html) ─
    function renderMembershipCard() {
        const tier = getCurrentTier();
        const config = TIERS[tier];
        const tierBadgeEl = document.getElementById('card-tier-badge');
        if (tierBadgeEl) tierBadgeEl.textContent = config.label;
    }

    // ─── Init ─────────────────────────────────────────────────────────────────
    function init() {
        injectNavBadge();

        // Homepage — lock overlays + upgrade banner
        const isHome = window.location.pathname.includes('index') || window.location.pathname === '/';
        if (isHome || document.getElementById('restaurant-grid')) {
            // Run after grid is rendered (slight delay)
            setTimeout(() => {
                applyLockOverlays();
                injectUpgradeBanner();
            }, 600);
        }

        // Membership page — render tier cards
        if (document.getElementById('tier-cards-container')) {
            renderTierPage();
            renderMembershipCard();
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────
    return { init, selectTier, showUpgradeModal, getCurrentTier, canAccess, injectNavBadge, applyLockOverlays };

})();
