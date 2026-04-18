document.addEventListener('DOMContentLoaded', () => {
    setupCartUI();
    loadRestaurantData();
    refreshCart();
});

const API_URL = '/api';

// --- INITIALIZATION ---
function getRestaurantId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadRestaurantData() {
    const id = getRestaurantId();
    if (!id) {
        document.getElementById('restaurant-hero').innerHTML = `<h2 style="color:var(--gold);text-align:center;width:100%;">Establishment not found.</h2>`;
        return;
    }

    try {
        // Fetch Restaurant Header
        const resRes = await fetch(`${API_URL}/restaurants/${id}`);
        if (!resRes.ok) throw new Error('Restaurant not found');
        const restaurant = await resRes.json();
        
        // Render Hero
        const hero = document.getElementById('restaurant-hero');
        hero.style.backgroundImage = `url(${restaurant.image})`;
        hero.innerHTML = `
            <div class="rh-content">
                <div class="rh-cuisine">${restaurant.cuisine}  •  ${restaurant.isPremium ? 'PREMIUM' : 'CLASSIC'}</div>
                <h1 class="rh-title">${restaurant.name}</h1>
                <div class="rh-meta">
                    <span class="rating">★ ${restaurant.rating}</span>
                    <span>₹${restaurant.priceForOne} FOR ONE</span>
                    <span>${restaurant.time}</span>
                </div>
            </div>
        `;

        // Fetch Menu
        const menuRes = await fetch(`${API_URL}/restaurants/${id}/menu`);
        const categories = await menuRes.json();
        renderMenu(categories);

        // Reservation logic moved to dedicated page
        /* 
        if (typeof Reservation !== 'undefined') {
            Reservation.init(id, restaurant.name);
        }
        */

    } catch (err) {
        console.error(err);
        document.getElementById('restaurant-hero').innerHTML = `<h2 style="color:red;text-align:center;width:100%;">Failed to load establishment.</h2>`;
    }
}

function renderMenu(categories) {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    
    if (Object.keys(categories).length === 0) {
        container.innerHTML = '<p class="loader" style="font-weight:200;">Our chef is preparing a new seasonal selection.</p>';
        return;
    }

    let itemIndex = 0;
    for (const [categoryName, items] of Object.entries(categories)) {
        if (!items || items.length === 0) continue;
        
        const section = document.createElement('div');
        section.className = 'menu-category-section reveal visible';
        
        let itemsHtml = items.map(item => {
            itemIndex++;
            const isChefRec = itemIndex % 5 === 0;
            const isLimited = Number(item.price) > 3000;
            
            return `
                <div class="food-card" style="animation-delay: ${itemIndex * 0.1}s">
                    ${isChefRec ? '<div class="badge-premium">CHEF’S SIGNATURE</div>' : ''}
                    <div class="food-card-info">
                        <div class="food-card-header">
                            <div class="food-card-veg ${item.isVeg ? '' : 'food-card-non-veg'}"></div>
                        </div>
                        <h3 class="food-card-title">${item.name}</h3>
                        <p class="food-card-desc">${item.description}</p>
                        ${isLimited ? '<div class="badge-limited">Estimated availability: 3 servings remaining</div>' : ''}
                        <div class="food-card-footer">
                            <span class="food-card-price">₹${Number(item.price).toLocaleString('en-IN')}</span>
                            <button class="btn-add" onclick="addToCart('${item.id}', 1, event)">Add</button>
                        </div>
                    </div>
                    ${item.image ? `<img src="${item.image}" alt="${item.name}" class="food-card-img">` : ''}
                </div>
            `;
        }).join('');

        section.innerHTML = `
            <h2 class="menu-category-title">${categoryName}</h2>
            <div class="food-grid">
                ${itemsHtml}
            </div>
        `;
        container.appendChild(section);
        
        // Trigger reveal for cards in this section
        setTimeout(() => {
            section.querySelectorAll('.food-card').forEach(card => card.classList.add('reveal-ready'));
        }, 100);
    }
}

// --- CART SYSTEM ---

function setupCartUI() {
    const toggleBtn = document.getElementById('cart-toggle-btn');
    const closeBtn = document.getElementById('cart-close-btn');
    const overlay = document.getElementById('cart-overlay');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openCart();
        });
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);
}

function openCart() {
    document.getElementById('cart-drawer').classList.add('active');
    document.getElementById('cart-overlay').classList.add('active');
    // Add blur to main container if it exists
    const main = document.querySelector('main');
    if (main) main.style.filter = 'blur(10px)';
    refreshCart();
}

function closeCart() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.getElementById('cart-overlay').classList.remove('active');
    const main = document.querySelector('main');
    if (main) main.style.filter = 'none';
}

async function refreshCart() {
    try {
        const res = await fetch(`${API_URL}/cart`);
        const cartData = await res.json();
        renderCart(cartData);
    } catch (err) {
        console.error("Cart error:", err);
    }
}

async function addToCart(itemId, quantity = 1, event = null) {
    try {
        const res = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, quantity })
        });
        
        if (res.ok) {
            refreshCart();
            
            // Premium Feedback instead of opening drawer
            if (event && event.target) {
                const btn = event.target;
                const originalText = btn.innerText;
                btn.classList.add('added');
                btn.innerText = '✓ ADDED';
                
                // Floating indicator
                showFloatingPlus(event.clientX, event.clientY);
                
                // Cart icon pulse
                const cartIcon = document.getElementById('cart-toggle-btn');
                if (cartIcon) {
                    cartIcon.classList.add('cart-bump');
                    setTimeout(() => cartIcon.classList.remove('cart-bump'), 400);
                }

                setTimeout(() => {
                    btn.classList.remove('added');
                    btn.innerText = originalText;
                }, 2000);
            }
        } else {
            alert('Authentication required for exclusive access.');
        }
    } catch (err) {
        console.error("Add to cart error:", err);
    }
}

function showFloatingPlus(x, y) {
    const plus = document.createElement('div');
    plus.className = 'floating-plus';
    plus.innerText = '+1';
    plus.style.left = `${x}px`;
    plus.style.top = `${y}px`;
    document.body.appendChild(plus);
    setTimeout(() => plus.remove(), 800);
}

async function removeFromCart(itemId, removeAll = false) {
    try {
        const res = await fetch(`${API_URL}/cart/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, removeAll })
        });
        
        if (res.ok) {
            refreshCart();
        }
    } catch (err) {
        console.error("Remove from cart error:", err);
    }
}

function renderCart(cartData) {
    // Update badge
    const totalItems = cartData.items ? cartData.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const countBadge = document.getElementById('nav-cart-count');
    if (countBadge) countBadge.innerText = totalItems;

    const container = document.getElementById('cart-items-container');

    if (!cartData.items || cartData.items.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-state">
                <div class="cart-empty-icon">🍽️</div>
                <div class="cart-empty-title">Your Gallery Awaits</div>
                <div class="cart-empty-sub">Begin curating your exclusive selection from our chef's offerings</div>
            </div>`;
        document.getElementById('cart-subtotal').innerText = '₹0';
        document.getElementById('cart-delivery').innerText = '₹0';
        document.getElementById('cart-total').innerText = '₹0';
        return;
    }

    // ── Category buckets ──────────────────────────────────────────────────
    const CATEGORY_ORDER = ['Chef\'s Signatures', 'House Specials', 'Accompaniments'];
    const groups = {};
    CATEGORY_ORDER.forEach(c => { groups[c] = []; });

    cartData.items.forEach((item, idx) => {
        // Heuristic bucketing based on price tier & index
        const price = Number(item.itemTotal / item.quantity);
        let cat;
        if (price >= 2500 || idx % 7 === 0) cat = 'Chef\'s Signatures';
        else if (price >= 1000 || idx % 3 === 0) cat = 'House Specials';
        else cat = 'Accompaniments';
        groups[cat].push(item);
    });

    // Build HTML
    let html = '';
    const TAGS = [
        { label: 'Chef Recommended' },
        { label: 'Signature Dish' },
        { label: 'Seasonal Special' },
        { label: 'Sommelier\'s Choice' }
    ];

    let globalIdx = 0;
    CATEGORY_ORDER.forEach(cat => {
        const items = groups[cat];
        if (items.length === 0) return;

        html += `<div class="cart-category-group">
            <div class="cart-category-label">${cat}</div>`;

        items.forEach(item => {
            const tag = TAGS[globalIdx % TAGS.length];
            const imgHtml = item.image
                ? `<img src="${item.image}" alt="${item.name}" class="cart-item-img">`
                : `<div class="cart-item-img-placeholder">🍴</div>`;

            html += `
            <div class="cart-item">
                ${imgHtml}
                <div class="cart-item-details">
                    <div class="cart-item-tag">${tag.label}</div>
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-desc">${item.description || 'A masterpiece of culinary tradition.'}</p>
                    <div class="cart-item-controls">
                        <div class="qty-control">
                            <button class="qty-btn-premium" onclick="removeFromCart('${item.itemId}')" aria-label="Decrease quantity">−</button>
                            <span class="qty-val" id="qty-${item.itemId}">${item.quantity}</span>
                            <button class="qty-btn-premium" onclick="addToCart('${item.itemId}', 1)" aria-label="Increase quantity">+</button>
                        </div>
                        <div class="cart-item-remove" onclick="removeFromCart('${item.itemId}', true)" title="Remove from selection">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </div>
                    </div>
                </div>
                <div class="cart-item-price">₹${item.itemTotal.toLocaleString('en-IN')}</div>
            </div>`;
            globalIdx++;
        });

        html += `</div>`; // close group
    });

    // Smart suggestion
    html += `
    <div class="cart-suggestion">
        <span style="font-size:1rem">✨</span>
        <span class="cart-suggestion-text">Pairs well with… <strong>Sommelier's Wine Pairing</strong> or a <strong>Curated Amuse-Bouche</strong> to begin.</span>
    </div>`;

    container.innerHTML = html;

    document.getElementById('cart-subtotal').innerText = '₹' + Number(cartData.subtotal).toLocaleString('en-IN');
    document.getElementById('cart-delivery').innerText = '₹' + Number(cartData.deliveryFee).toLocaleString('en-IN');
    document.getElementById('cart-total').innerText = '₹' + Number(cartData.total).toLocaleString('en-IN');
}


// ─── CHECKOUT — delegate to fullscreen overlay ─────────────────────────────
function proceedToCheckout() {
    if (typeof CibelleCheckout !== 'undefined') {
        CibelleCheckout.open();
    }
}

// kept for compatibility (cart button calls this)
function openCheckoutFlow() { proceedToCheckout(); }

function showCheckoutError(msg) {
    const toast = document.createElement('div');
    toast.className = 'checkout-error-toast';
    toast.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>${msg}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function redirectToPrivateDining() {
    const id = getRestaurantId();
    window.location.href = id ? `private-dining.html?id=${id}` : 'private-dining.html';
}
