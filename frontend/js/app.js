// Multi-language strings
const translations = {
    en: {
        "nav-dining": "Dining",
        "nav-collections": "Collections",
        "nav-restaurants": "Restaurants",
        "nav-concierge": "Concierge",
        "nav-signin": "Sign In",
        "hero-title": "Exquisite Dining, <br><span class=\"text-gold\">Delivered Effortlessly.</span>",
        "hero-desc": "Experience the finest culinary creations from the city's most prestigious kitchens, brought to your doorstep with unparalleled care.",
        "hero-btn": "Discover",
        "featured-heading": "The Selection",
        "featured-sub": "Browsing elite culinary destinations, crafted for the distinguished palate.",
        "featured-title": "Signature Dining",
        "member-title": "CIBELLE PRIVATE CLUB",
        "member-desc": "Unlock exclusive access to a world of culinary excellence. Reserved for those who appreciate the extraordinary.",
        "member-b1": "Private Chef Access",
        "member-b2": "Exclusive Menus",
        "member-b3": "Priority Delivery",
        "member-b4": "VIP Concierge",
        "member-btn": "Request Invitation"
    },
    hi: {
        "nav-dining": "भोजन",
        "nav-collections": "संग्रह",
        "nav-restaurants": "रेस्तरां",
        "nav-concierge": "कॉन्शिएर्ज",
        "nav-signin": "साइन इन",
        "hero-title": "उत्कृष्ट भोजन, <br><span class=\"text-gold\">आसानी से वितरित।</span>",
        "hero-desc": "शहर की सबसे प्रतिष्ठित रसोइयों से बेहतरीन व्यंजनों का अनुभव करें, जो अद्वितीय देखभाल के साथ आपके दरवाजे पर लाए जाते हैं।",
        "hero-btn": "खोजें",
        "featured-heading": "विशेष चयन",
        "featured-sub": "विशिष्ट स्वाद के लिए तैयार किए गए कुलीन पाक गंतव्यों को ब्राउज़ करना।",
        "featured-title": "सिग्नेचर डाइनिंग",
        "member-title": "सिबेले प्राइवेट क्लब",
        "member-desc": "पाक उत्कृष्टता की दुनिया तक विशेष पहुंच प्राप्त करें। जो असाधारण की सराहना करते हैं उनके लिए आरक्षित।",
        "member-b1": "निजी शेफ पहुंच",
        "member-b2": "विशेष मेनू",
        "member-b3": "प्राथमिकता वितरण",
        "member-b4": "वीआईपी कॉन्शिएर्ज",
        "member-btn": "आमंत्रण का अनुरोध करें"
    }
};

let currentLang = 'en';
let cart = [];
let allRestaurants = [];
let activeFilter = 'all';
let displayLimit = 100; // Show all restaurants initially
let globalRevealObserver = null;

// Socket setup — only runs on pages that load the socket.io CDN
if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('status_changed', (data) => {
        console.log('Order Update:', data);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchRestaurants();
    setupLanguageToggle();
    setupScrollAnimations();
    checkAuthState();
    setupHeroVideo();
    // Initialise membership tier system
    if (typeof MembershipSystem !== 'undefined') MembershipSystem.init();
});

// Premium Scroll Animations (Reveal)
function setupScrollAnimations() {
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

    globalRevealObserver = observer;

    // Observe containers and individual items
    document.querySelectorAll('.reveal, .reveal-item').forEach(el => observer.observe(el));

    // Interactive Glint Effect for Featured Cards
    const featuredCards = document.querySelectorAll('.featured-hero-card, .featured-secondary-card');
    featuredCards.forEach(card => {
        const glow = card.querySelector('.card-glow-interactive');
        if (!glow) return;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(212, 175, 55, 0.25) 0%, transparent 60%)`;
        });
    });
}


function setupLanguageToggle() {
    const btn = document.getElementById('lang-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'hi' : 'en';
        updateLanguage();
    });
}

function updateLanguage() {
    const elements = document.querySelectorAll('[data-key]');
    elements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
        }
    });
}

function setupHeroVideo() {
    const video = document.getElementById('hero-video');
    if (!video) return;

    // Pause video when out of viewport to save performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                video.play().catch(e => console.log("Autoplay prevented"));
            } else {
                video.pause();
            }
        });
    }, { threshold: 0 });

    observer.observe(video);
}

function toggleSound() {
    const video = document.getElementById('hero-video');
    const iconMuted = document.getElementById('sound-icon-muted');
    const iconUnmuted = document.getElementById('sound-icon-unmuted');
    
    if (!video) return;

    if (video.muted) {
        video.muted = false;
        if(iconMuted) iconMuted.style.display = 'none';
        if(iconUnmuted) iconUnmuted.style.display = 'block';
    } else {
        video.muted = true;
        if(iconMuted) iconMuted.style.display = 'block';
        if(iconUnmuted) iconUnmuted.style.display = 'none';
    }
}

function scrollToRestaurants() {
    const input = document.getElementById('search-input');
    if (input.value.trim() === "") {
        input.style.border = "1px solid var(--gold)";
        setTimeout(() => input.style.border = "1px solid var(--border)", 2000);
    }
    document.getElementById('restaurants').scrollIntoView({ behavior: 'smooth' });
}

// Filtering & Sorting Logic
async function fetchRestaurants() {
    const grid = document.getElementById('restaurant-grid');
    if (!grid) return;
    try {
        const response = await fetch('/api/restaurants');
        allRestaurants = await response.json();
        renderGrid(allRestaurants);
    } catch (err) {
        grid.innerHTML = '<p class="loader" style="font-weight: 200;">Our concierge is currently busy. Please refresh.</p>';
    }
}

function setFilter(filter) {
    activeFilter = filter;
    displayLimit = 9; // Reset to initial limit on filter change
    
    // Update UI active state
    document.querySelectorAll('.chip').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(filter.toLowerCase()) || 
           (filter === 'all' && btn.innerText.toLowerCase().includes('all'))) {
            btn.classList.add('active');
        }
    });

    applyFiltersAndSort();
}

function handleSort() {
    displayLimit = 9; // Reset to initial limit on sort change
    applyFiltersAndSort();
}



function applyFiltersAndSort() {
    let filtered = [...allRestaurants];

    // Apply category filter
    if (activeFilter === 'veg') filtered = filtered.filter(r => r.isVeg);
    if (activeFilter === 'premium') filtered = filtered.filter(r => r.isPremium);
    if (activeFilter === 'offers') filtered = filtered.filter(r => r.hasOffer);

    // Apply Search filter if input has value
    const searchVal = document.getElementById('search-input').value.toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(r => 
            r.name.toLowerCase().includes(searchVal) || 
            r.cuisine.toLowerCase().includes(searchVal)
        );
    }

    // Apply Sort
    const sortVal = document.getElementById('sort-select').value;
    if (sortVal === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    if (sortVal === 'price-low') filtered.sort((a, b) => a.priceForOne - b.priceForOne);
    if (sortVal === 'price-high') filtered.sort((a, b) => b.priceForOne - a.priceForOne);
    if (sortVal === 'time') filtered.sort((a, b) => parseInt(a.time) - parseInt(b.time));

    const totalCount = filtered.length;
    const paginated = filtered.slice(0, displayLimit);
    
    renderGrid(paginated, totalCount);
}

function renderGrid(data, totalItems) {
    const grid = document.getElementById('restaurant-grid');
    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = '<p class="loader" style="grid-column: 1/-1; opacity: 0.5;">No establishments match your selection.</p>';
        return;
    }

    data.forEach((r, index) => {
        const isHero = index === 0;
        const card = document.createElement('div');
        card.className = `card reveal ${isHero ? 'card-hero' : 'card-secondary'}`;
        card.style.transitionDelay = `${(index % 8) * 0.15}s`;
        card.setAttribute('onclick', `openMenu('${r.id}')`);
        card.setAttribute('tabindex', '0');
        card.setAttribute('onkeydown', `if(event.key === 'Enter') openMenu('${r.id}')`);
        card.setAttribute('role', 'button');
        
        card.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000'}" alt="${r.name}" class="card-img" loading="lazy">
            </div>
            
            <div class="enter-invitation">
                <span>ENTER EXPERIENCE</span>
            </div>

            <div class="card-overlay">
                <span class="category-tag">${r.cuisine || 'Gourmet Selection'}</span>
                <h3 class="card-title">${r.name || 'Signature Establishment'}</h3>
                
                <div class="card-meta-cinematic" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 1rem;">
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        <span style="color: var(--gold); font-size: 0.9rem;">★ ${r.rating || 'New'}</span>
                        <span style="opacity: 0.5; font-size: 0.8rem;">|</span>
                        <span style="font-size: 0.8rem; opacity: 0.8; letter-spacing: 1px;">₹${r.priceForOne || 'On Request'}</span>
                    </div>
                    <span style="font-size: 0.8rem; opacity: 0.8; letter-spacing: 1px;">${r.time || 'Time Varies'}</span>
                </div>
            </div>
            
            ${r.isPremium ? `<div class="card-badge">ELITE</div>` : ''}
        `;
        grid.appendChild(card);
        
        // Register with global observer for reveal
        if (globalRevealObserver) {
            globalRevealObserver.observe(card);
        } else {
            // Fallback if observer not ready
            setTimeout(() => card.classList.add('visible'), 100);
        }

        // Force reveal if parent section is already visible
        const section = document.getElementById('restaurants');
        if (section && section.classList.contains('visible')) {
            setTimeout(() => card.classList.add('visible'), 100);
        }
    });
}

// [Rest of the functions: openMenu, closeMenu, addToCart, togglePassword, handleAuthSubmit remain the same]
function openMenu(id) {
    // Navigate to the dynamic restaurant page
    window.location.href = `restaurant.html?id=${id}`;
}

function closeMenu() {
    document.getElementById('menu-modal').style.display = 'none';
}

function addToCart(name, fee) {
    cart.push({ name, fee });
    const cartBtn = document.querySelector('.cart-wrapper');
    const cartCount = document.querySelector('.cart-count');
    
    if (cartCount) {
        cartCount.innerText = cart.length;
        cartBtn.classList.add('bump');
        setTimeout(() => cartBtn.classList.remove('bump'), 300);
    }
    showToast(`Excellent Choice. ${name} has been added to your selection.`);
}

function togglePassword() {
    const input = document.getElementById('password');
    if (!input) return;
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}

// Auth State check
function checkAuthState() {
    if (typeof CibelleAuth !== 'undefined') {
        CibelleAuth.renderNavbar();
    }
}
function logout() {
    if (typeof CibelleAuth !== 'undefined') {
        CibelleAuth.logout();
    } else {
        localStorage.removeItem('cibelle_auth');
        localStorage.removeItem('cibelle_user');
        localStorage.removeItem('cibelle_token');
        window.location.href = 'index.html';
    }
}

async function handleAuthSubmit(event, redirect) {
    event.preventDefault();
    const btn = document.getElementById('auth-btn');
    if (!btn) return;

    const emailInput     = document.getElementById('email');
    const firstNameInput  = document.getElementById('firstName'); // signup only
    const middleNameInput = document.getElementById('middleName'); // signup only
    const lastNameInput   = document.getElementById('lastName'); // signup only
    const passwordInput  = document.getElementById('password');
    
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerText = 'VERIFYING IDENTITY...';
    
    const isLogin = !firstNameInput;

    try {
        let data;
        if (isLogin) {
            data = await CibelleAuth.login(emailInput.value, passwordInput.value);
        } else {
            const roleInput = document.getElementById('role');
            data = await CibelleAuth.signup(
                firstNameInput.value, 
                middleNameInput ? middleNameInput.value : '', 
                lastNameInput.value, 
                emailInput.value, 
                passwordInput.value,
                roleInput ? roleInput.value : 'CUSTOMER'
            );
        }
        
        // Redirect with a smooth fade
        document.body.style.transition = 'opacity 0.4s';
        document.body.style.opacity = '0';
        setTimeout(() => { window.location.href = redirect || 'index.html'; }, 400);

    } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = isLogin ? 'ENTER THE CLUB' : 'GRANT MEMBERSHIP';
    }
}

function toggleConcierge() {
    const panel = document.getElementById('concierge-panel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function showToast(message) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '30px';
        toastContainer.style.right = '30px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'cibelle-toast glass-card';
    toast.style.padding = '15px 25px';
    toast.style.marginTop = '10px';
    toast.style.borderLeft = '3px solid var(--gold)';
    toast.style.color = 'var(--text-light)';
    toast.style.fontSize = '0.9rem';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    toast.innerText = message;

    toastContainer.appendChild(toast);

    // Trigger reveal
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Remove after 4s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
