/**
 * CIBELLE — CENTRALIZED NAVBAR COMPONENT
 * Ensures absolute consistency across all luxury endpoints.
 */

const Navbar = {
    render: function() {
        const placeholder = document.getElementById('navbar-placeholder');
        if (!placeholder) return;

        // Skip rendering on payment redirection page if identified
        if (window.location.pathname.includes('payment-redirect')) {
            console.log("Navbar omitted for payment security.");
            return;
        }

        const path = window.location.pathname;
        const fileName = path.substring(path.lastIndexOf('/') + 1);
        const isIndex = fileName === '' || fileName === 'index.html';

        const navbarHTML = `
            <header class="navbar ${!isIndex ? 'scrolled' : ''}" id="main-navbar">
                <div class="nav-left">
                    <a href="index.html" class="logo">CIBELLE</a>
                </div>
                
                <div class="navbar-center">
                    <a href="index.html" class="nav-link-center ${isIndex ? 'active' : ''}" data-key="nav-home">Home</a>
                    <a href="index.html#restaurants" class="nav-link-center ${path.includes('#restaurants') ? 'active' : ''}" data-key="nav-restaurants">Restaurants</a>
                    <a href="private-dining.html" class="nav-link-center ${path.includes('private-dining.html') ? 'active' : ''} text-gold" style="font-weight: 600;">Private Dining ✨</a>
                    <a href="#" class="nav-link-center" data-key="nav-concierge" onclick="toggleConcierge()">Concierge</a>
                </div>

                <div class="navbar-right">
                    <a href="#" class="cart-wrapper" id="cart-toggle-btn" onclick="event.preventDefault()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        <span class="cart-count" id="nav-cart-count">0</span>
                    </a>
                    <div id="nav-auth-container">
                        <a href="login.html" class="btn-signin-outline" id="nav-auth-btn">Sign In</a>
                    </div>
                    <div class="hamburger" onclick="Navbar.toggleMobileMenu()">
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </header>

            <!-- Mobile Navigation Overlay -->
            <div class="mobile-nav" id="mobile-nav">
                <a href="index.html" class="nav-link-center" onclick="Navbar.toggleMobileMenu()" data-key="nav-home">Home</a>
                <a href="index.html#restaurants" class="nav-link-center" onclick="Navbar.toggleMobileMenu()" data-key="nav-restaurants">Restaurants</a>
                <a href="private-dining.html" class="nav-link-center text-gold" onclick="Navbar.toggleMobileMenu()" style="font-weight: 600;">Private Dining ✨</a>
                <a href="#" class="nav-link-center" onclick="Navbar.toggleMobileMenu(); toggleConcierge()">Concierge</a>
                <a href="login.html" class="btn-signin-outline" style="margin-top: 2rem;" data-key="nav-signin">Sign In</a>
            </div>
        `;

        placeholder.innerHTML = navbarHTML;
        this.init();
    },

    init: function() {
        this.setupScrollEffect();
        // The global app.js checkAuthState will handle filling nav-auth-container
    },

    setupScrollEffect: function() {
        const nav = document.getElementById('main-navbar');
        if (!nav) return;

        // If not on index, keep it scrolled (solid/glassy) by default
        const isIndex = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50 || !isIndex) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });

        // Initialize state
        if (window.scrollY > 50 || !isIndex) {
            nav.classList.add('scrolled');
        }
    },

    toggleMobileMenu: function() {
        const mobileNav = document.getElementById('mobile-nav');
        if (mobileNav) {
            mobileNav.classList.toggle('active');
        }
    }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => Navbar.render());
