/**
 * Cibelle — Luxury Fullscreen Checkout Controller
 * Manages: open/close, step navigation, experience selection,
 *          address loading, order review, payment execution.
 */

const CibelleCheckout = (() => {
    const API = '/api';

    // ── State ────────────────────────────────────────────────────────────────
    let state = {
        step:          1,      // 1=Experience, 2=Details, 3=Review, 4=Payment
        experience:    null,   // 'delivery' | 'dining'
        selectedAddrId: null,
        addresses:     [],
        cart:          null,
    };

    const STEP_PROGRESS = { 1: '25%', 2: '50%', 3: '75%', 4: '100%' };

    // ── Utilities ────────────────────────────────────────────────────────────
    function token() { return localStorage.getItem('cibelle_token'); }
    function esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function toINR(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

    // ── Open / Close ─────────────────────────────────────────────────────────
    async function open() {
        if (!token()) {
            sessionStorage.setItem('cibelle_redirect_target', window.location.href);
            showCartError('Membership verification required. Redirecting...');
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            return;
        }

        // Load cart first
        try {
            const res  = await fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token()}` } });
            state.cart = await res.json();
        } catch { state.cart = { items: [], total: 0, subtotal: 0, deliveryFee: 0 }; }

        if (!state.cart.items || state.cart.items.length === 0) {
            showCartError('Your gallery is empty. Please add items first.');
            return;
        }

        // Reset state
        state.step = 1;
        state.experience = null;
        state.selectedAddrId = null;

        // Reset experience card selection
        document.querySelectorAll('.co-exp-card').forEach(c => {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
        });
        document.getElementById('co-btn-exp-next').disabled = true;

        // Populate sticky summary
        populateSummary();

        // Show overlay
        document.getElementById('cibelle-checkout').classList.add('co-overlay--open');
        document.body.style.overflow = 'hidden';

        // Navigate to step 1
        renderStep(1);
    }

    function close() {
        document.getElementById('cibelle-checkout').classList.remove('co-overlay--open');
        document.body.style.overflow = '';
    }

    // ── Step Navigation ───────────────────────────────────────────────────────
    function goToStep(n) {
        if (n === 2 && !state.experience) return; // must pick experience first

        state.step = n;
        renderStep(n);
    }

    function renderStep(n) {
        // Update progress bar
        document.getElementById('co-progress-fill').style.width = STEP_PROGRESS[n];

        // Update crumbs
        document.querySelectorAll('.co-step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove('active', 'done');
            if (s === n) el.classList.add('active');
            if (s < n)  el.classList.add('done');
        });

        // Hide all screens
        document.querySelectorAll('.co-screen').forEach(s => s.style.display = 'none');

        // Show correct screen
        if (n === 1) {
            show('co-screen-1');
        } else if (n === 2) {
            if (state.experience === 'delivery') {
                show('co-screen-2-delivery');
                loadAddresses();
            } else {
                show('co-screen-2-dining');
            }
        } else if (n === 3) {
            show('co-screen-3');
            populateReview();
        } else if (n === 4) {
            show('co-screen-4');
            populatePayment();
        }

        // Scroll to top
        document.getElementById('co-main').scrollTop = 0;
    }

    function show(id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'block';
            // Re-trigger animation
            el.classList.remove('co-screen');
            void el.offsetWidth;
            el.classList.add('co-screen');
        }
    }

    // ── Experience Selection ──────────────────────────────────────────────────
    function selectExperience(type) {
        state.experience = type;
        state.selectedAddrId = null;

        // Update cards
        document.querySelectorAll('.co-exp-card').forEach(card => {
            card.classList.remove('selected');
            card.setAttribute('aria-pressed', 'false');
        });
        const target = document.getElementById(`co-exp-${type}`);
        if (target) {
            target.classList.add('selected');
            target.setAttribute('aria-pressed', 'true');
        }

        document.getElementById('co-btn-exp-next').disabled = false;
    }

    // ── Address Loading ───────────────────────────────────────────────────────
    async function loadAddresses() {
        const list       = document.getElementById('co-addr-list');
        const nextBtn    = document.getElementById('co-btn-addr-next');
        list.innerHTML   = '<div class="co-addr-loading">Loading your sanctuaries...</div>';
        if (nextBtn) nextBtn.disabled = true;
        state.addresses       = [];
        state.selectedAddrId  = null;

        try {
            const res  = await fetch(`${API}/addresses`, { headers: { Authorization: `Bearer ${token()}` } });
            const data = await res.json();
            state.addresses = data.success ? data.addresses : [];
        } catch { state.addresses = []; }

        if (state.addresses.length === 0) {
            list.innerHTML = `
                <div class="co-addr-loading" style="padding:2.5rem 1rem">
                    <div style="font-size:2rem;margin-bottom:.7rem">🗺️</div>
                    No saved addresses yet.<br>Add one below to continue.
                </div>`;
            return;
        }

        list.innerHTML = '';
        const TYPE_EMOJI = { home:'🏡', villa:'🏰', office:'🏢', event:'✨' };

        state.addresses.forEach(addr => {
            const emoji = TYPE_EMOJI[addr.address_type] || '📍';
            const item  = document.createElement('div');
            item.className = `co-addr-item${addr.is_default ? ' selected' : ''}`;
            item.dataset.id = addr.id;
            item.innerHTML  = `
                <div class="co-addr-radio"></div>
                <div class="co-addr-info">
                    <div class="co-addr-label">
                        ${emoji} ${esc(addr.label || addr.address_type)}
                        ${addr.is_default ? '<span class="co-addr-primary-badge">✦ Primary</span>' : ''}
                    </div>
                    <div class="co-addr-text">${esc(addr.full_address)}</div>
                    ${addr.city ? `<div class="co-addr-city">${esc(addr.city)}${addr.postal_code ? ' — ' + esc(addr.postal_code) : ''}</div>` : ''}
                </div>
            `;
            item.onclick = () => selectAddress(addr.id);
            list.appendChild(item);

            if (addr.is_default) {
                state.selectedAddrId = addr.id;
                if (nextBtn) nextBtn.disabled = false;
            }
        });
    }

    function selectAddress(id) {
        state.selectedAddrId = id;
        document.querySelectorAll('.co-addr-item').forEach(el => {
            el.classList.toggle('selected', parseInt(el.dataset.id) === id);
        });
        const nextBtn = document.getElementById('co-btn-addr-next');
        if (nextBtn) nextBtn.disabled = false;
    }

    // ── Add Address (from checkout) ───────────────────────────────────────────
    function openAddAddressModal() {
        if (typeof AddressManager === 'undefined') return;

        const orig = AddressManager.submitForm.bind(AddressManager);
        AddressManager.submitForm = async function() {
            await orig();
            AddressManager.submitForm = orig;
            await loadAddresses();
        };
        AddressManager.openModal();
    }

    // ── Review Population ─────────────────────────────────────────────────────
    function populateReview() {
        const cart = state.cart;

        // Experience
        document.getElementById('co-review-experience').textContent =
            state.experience === 'delivery' ? '🏡  Home Delivery — Concierge Ambassador' : '🕯️  Private Dining';

        // Address
        const addrSection = document.getElementById('co-review-addr-section');
        if (state.experience === 'delivery') {
            const addr = state.addresses.find(a => a.id === state.selectedAddrId);
            document.getElementById('co-review-address').textContent =
                addr ? [addr.full_address, addr.city, addr.postal_code].filter(Boolean).join(', ') : '—';
            addrSection.style.display = '';
        } else {
            addrSection.style.display = 'none';
        }

        // Items
        const itemsEl = document.getElementById('co-review-items');
        itemsEl.innerHTML = (cart.items || []).map(item => `
            <div class="co-review-item">
                ${item.image ? `<img class="co-review-item-img" src="${esc(item.image)}" alt="">` : '<div class="co-review-item-img"></div>'}
                <div style="flex:1;min-width:0">
                    <div class="co-review-item-name">${esc(item.name)}</div>
                    <div class="co-review-item-qty">× ${item.quantity}</div>
                </div>
                <div class="co-review-item-price">${toINR(item.itemTotal)}</div>
            </div>
        `).join('');

        // Totals
        document.getElementById('co-review-subtotal').textContent = toINR(cart.subtotal || 0);
        document.getElementById('co-review-delivery').textContent  = toINR(cart.deliveryFee || 0);
        document.getElementById('co-review-total').textContent     = toINR(cart.total || 0);
    }

    // ── Payment Screen ────────────────────────────────────────────────────────
    function populatePayment() {
        const cart = state.cart;
        document.getElementById('co-pay-total').textContent = toINR(cart.total || 0);

        let addrStr = '—';
        if (state.experience === 'delivery') {
            const addr = state.addresses.find(a => a.id === state.selectedAddrId);
            if (addr) addrStr = [addr.full_address, addr.city].filter(Boolean).join(', ');
        } else {
            addrStr = 'Private Dining Reservation';
        }
        document.getElementById('co-pay-addr').textContent = addrStr;
    }

    // ── Summary Panel ─────────────────────────────────────────────────────────
    function populateSummary() {
        const cart = state.cart;
        if (!cart) return;

        // Restaurant name from page
        const hero = document.getElementById('restaurant-hero');
        const titleEl = hero ? hero.querySelector('.rh-title') : null;
        document.getElementById('co-summary-restaurant').textContent =
            titleEl ? titleEl.textContent : 'Cibelle Establishment';

        // Items
        const sumItems = document.getElementById('co-summary-items');
        sumItems.innerHTML = (cart.items || []).map(item => `
            <div class="co-sum-item">
                ${item.image ? `<img class="co-sum-item-img" src="${esc(item.image)}" alt="">` : '<div class="co-sum-item-img"></div>'}
                <div class="co-sum-item-info">
                    <div class="co-sum-item-name">${esc(item.name)}</div>
                    <div class="co-sum-item-qty">× ${item.quantity}</div>
                </div>
                <div class="co-sum-item-price">${toINR(item.itemTotal)}</div>
            </div>
        `).join('');

        document.getElementById('co-sum-subtotal').textContent = toINR(cart.subtotal || 0);
        document.getElementById('co-sum-delivery').textContent  = toINR(cart.deliveryFee || 0);
        document.getElementById('co-sum-total').textContent     = toINR(cart.total || 0);
    }

    // ── Execute Payment ───────────────────────────────────────────────────────
    async function executePayment() {
        const cart   = state.cart;
        const payBtn = document.getElementById('co-btn-pay');

        let deliveryAddress = 'Cibelle Private Dining';
        if (state.experience === 'delivery') {
            const addr = state.addresses.find(a => a.id === state.selectedAddrId);
            deliveryAddress = addr
                ? [addr.full_address, addr.landmark, addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')
                : 'Selected Location';
        }

        if (payBtn) { payBtn.disabled = true; payBtn.textContent = '⏳  AWAITING PAYMENT…'; }

        try {
            const paymentResult = await Payments.payForOrder(
                cart.items,
                cart.total,
                getRestaurantId(),
                deliveryAddress
            );

            if (!paymentResult.success) {
                if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Pay Now'; }
                if (paymentResult.message && !paymentResult.message.toLowerCase().includes('cancel')) {
                    showCheckoutToast(paymentResult.message, 'error');
                }
                return;
            }

            // Finalise order
            if (payBtn) payBtn.textContent = '✦  FINALIZING…';

            const orderRes = await fetch(`${API}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify({
                    restaurant_id: getRestaurantId(),
                    items:         cart.items,
                    total_amount:  cart.total,
                    address:       deliveryAddress,
                    payment_id:    paymentResult.payment.id
                })
            });

            if (orderRes.ok) {
                await fetch(`${API}/cart/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });

                // Update cart badge
                const badge = document.getElementById('nav-cart-count');
                if (badge) badge.textContent = '0';

                showSuccess();
            } else {
                showCheckoutToast('Order sync error. Our concierge will follow up.', 'error');
                if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'Pay Now'; }
            }

        } catch (err) {
            console.error('Payment error:', err);
            showCheckoutToast('Connection error. Please try again.', 'error');
            if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'Pay Now'; }
        }
    }

    // ── Private Dining Redirect ───────────────────────────────────────────────
    function proceedToDining() {
        close();
        redirectToPrivateDining();
    }

    // ── Success Screen ────────────────────────────────────────────────────────
    function showSuccess() {
        const main = document.getElementById('co-main');
        const summary = document.getElementById('co-summary');
        if (summary) summary.style.display = 'none';
        document.getElementById('co-steps').style.display = 'none';

        main.innerHTML = `
            <div class="co-success">
                <div class="co-success-icon">✨</div>
                <div class="co-success-title">Order Secured</div>
                <p class="co-success-sub">
                    Your selection is being prepared by our master chefs.<br>
                    An ambassador will arrive at your sanctuary shortly.
                </p>
                <div style="margin-top:2.5rem;width:50px;height:1px;background:rgba(212,175,55,0.25);"></div>
                <p style="font-size:0.62rem;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.2);margin-top:1.5rem;">Redirecting to your orders...</p>
            </div>
        `;

        setTimeout(() => {
            close();
            window.location.href = 'orders.html';
        }, 4000);
    }

    // ── Toast ─────────────────────────────────────────────────────────────────
    function showCheckoutToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:2.5rem;left:50%;transform:translateX(-50%) translateY(10px);
            background:rgba(10,8,5,0.96);border:1px solid ${type === 'error' ? 'rgba(224,85,85,0.4)' : 'rgba(212,175,55,0.3)'};
            color:${type === 'error' ? '#e05555' : 'var(--gold)'};padding:.9rem 2rem;border-radius:8px;
            font-size:.72rem;letter-spacing:1px;z-index:99999;backdrop-filter:blur(20px);
            opacity:0;transition:opacity .35s,transform .35s cubic-bezier(.16,1,.3,1);white-space:nowrap;pointer-events:none;`;
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => {
            t.style.opacity = '1';
            t.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 400);
        }, 4000);
    }

    function showCartError(msg) {
        // Falls back to cart-level toast
        showCheckoutToast(msg, 'error');
    }

    // ── Close on backdrop click ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('cibelle-checkout');
        if (overlay) {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) close();
            });
        }
    });

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        open,
        close,
        goToStep,
        selectExperience,
        selectAddress,
        openAddAddressModal,
        executePayment,
        proceedToDining,
        _reloadAddresses: loadAddresses,
    };
})();
