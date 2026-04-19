const Reservation = (() => {

    // ─── State ───────────────────────────────────────────────────────────────
    const state = {
        restaurantId: null,
        restaurantName: null,
        currentStep: 0,
        totalSteps: 5, // 0, 1, 2, 3, 4
        selectedDate: null,
        selectedTimeSlot: null,
        guests: 2,
        occasion: null,
        menuType: 'tasting', // Default to Chef's Tasting
        selectedDishes: [], // Array of { id, name, price, qty, category }
        menuData: null, // Full menu from API
        currentCategory: null,
        filters: { isVeg: false, isSignature: false },
        specialRequests: '',
        totalAmount: 0,
        allRestaurants: []
    };

    const OCCASIONS = [
        { id: 'romantic', icon: '🕯️', name: 'Romantic Dinner', desc: 'An intimate table for two in a private setting' },
        { id: 'business', icon: '🤝', name: 'Business Meeting', desc: 'A refined environment for discerning executives' },
        { id: 'celebration', icon: '✨', name: 'Celebration', desc: 'Anniversaries, birthdays & milestones' },
        { id: 'custom', icon: '🎭', name: 'Custom Experience', desc: 'Tell us your vision and we will craft it' }
    ];

    const TIME_SLOTS = [
        { id: 'early', time: '18:00', label: 'Early Evening', avail: 'Multiple tables available' },
        { id: 'dinner', time: '19:30', label: 'Prime Dinner', avail: 'High demand — 3 tables left' },
        { id: 'late', time: '21:00', label: 'Late Dining', avail: 'Exclusive setting' },
        { id: 'midnight', time: '22:30', label: 'Midnight Feast', avail: 'Very limited — 1 table remaining' }
    ];

    // ─── Calendar State ───────────────────────────────────────────────────────
    let calYear, calMonth;

    function initCalendar() {
        const now = new Date();
        calYear = now.getFullYear();
        calMonth = now.getMonth();
    }

    // ─── DOM Helpers ──────────────────────────────────────────────────────────
    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    function goToStep(step) {
        state.currentStep = step;

        // Update stepper
        $$('.pd-step, .step-item').forEach((el) => {
            el.classList.remove('active', 'complete');
            const stepNum = parseInt(el.dataset.step);
            if (stepNum === step) el.classList.add('active');
            if (stepNum < step) el.classList.add('complete');
        });

        // Show correct panel
        const panels = $$('.pd-panel, .res-panel');
        panels.forEach((el) => {
            el.classList.remove('active');
            const panelId = el.id;
            if (panelId === `res-step-${step}`) {
                el.classList.add('active');
            }
        });

        // Render step content
        if (step === 0) renderStep0();
        if (step === 1) renderStep1();
        if (step === 2) renderStep2();
        if (step === 3) renderStep3();
        if (step === 4) renderStep4();
        
        // Scroll to reservation section
        const section = $('#reservation-section');
        if (section) {
            const offset = 100;
            const elementPosition = section.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    }

    // ─── Step 0: Destination ──────────────────────────────────────────────────
    async function renderStep0() {
        const container = $('#featured-destinations');
        if (!container) return;

        if (state.allRestaurants.length === 0) {
            try {
                const res = await fetch('/api/restaurants');
                state.allRestaurants = await res.json();
            } catch (err) {
                console.error(err);
                container.innerHTML = '<p class="loader-gold">Communication error with concierge.</p>';
                return;
            }
        }

        renderRestaurants(state.allRestaurants);
    }

    function renderRestaurants(list) {
        const container = $('#featured-destinations');
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<p class="loader-gold" style="font-size: 0.8rem; letter-spacing: 2px;">No establishments match your search.</p>';
            return;
        }

        container.innerHTML = list.map(r => `
            <div class="destination-card ${state.restaurantId === r.id ? 'selected' : ''}" 
                 onclick="Reservation.selectRestaurant('${r.id}', '${r.name.replace(/'/g, "\\'")}')">
                <div class="dest-img" style="background-image: url('${r.image}')"></div>
                <div class="dest-info">
                    <h3 class="dest-name">${r.name}</h3>
                    <p class="dest-meta">${r.cuisine} • ${r.isPremium ? 'Elite' : 'Classic'}</p>
                </div>
                <div class="dest-check">✓</div>
            </div>
        `).join('');

        const nextBtn = $('#btn-step-0-next');
        if (nextBtn) {
            if (state.restaurantId) nextBtn.classList.remove('disabled');
            else nextBtn.classList.add('disabled');
        }
    }

    function filterRestaurants() {
        const val = $('#restaurant-search').value.toLowerCase();
        const filtered = state.allRestaurants.filter(r => 
            r.name.toLowerCase().includes(val) || 
            r.cuisine.toLowerCase().includes(val)
        );
        renderRestaurants(filtered);
    }

    function selectRestaurant(id, name) {
        state.restaurantId = id;
        state.restaurantName = name;
        state.menuData = null; // Clear cached menu for new restaurant
        renderRestaurants(state.allRestaurants);
        playClickSound();
    }

    function playClickSound() {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.015, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.1);
        } catch(e) {}
    }

    // ─── Step 1: Date & Time ──────────────────────────────────────────────────
    function renderStep1() {
        renderCalendar();
        renderTimeSlots();
    }

    function renderCalendar() {
        const container = $('#res-calendar');
        if (!container) return;

        const months = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        const today = new Date();
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

        $('#res-cal-month').textContent = `${months[calMonth]} ${calYear}`;

        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('');

        for (let i = 0; i < firstDay; i++) {
            html += `<div class="cal-day empty"></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isPast = new Date(calYear, calMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
            const isSelected = state.selectedDate === dateStr;

            html += `<div class="cal-day ${isPast ? 'past' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
                         onclick="${isPast ? '' : `Reservation.selectDate('${dateStr}')`}">
                         ${d}
                    </div>`;
        }

        container.innerHTML = html;
    }

    function renderTimeSlots() {
        const container = $('#res-time-slots');
        if (!container) return;
        container.innerHTML = TIME_SLOTS.map(slot => `
            <div class="time-slot ${state.selectedTimeSlot === slot.id ? 'selected' : ''}"
                 onclick="Reservation.selectTimeSlot('${slot.id}')">
                <div class="time-slot-time">${slot.time}</div>
                <div class="time-slot-label">${slot.label}</div>
                <div class="time-slot-avail">${slot.avail}</div>
            </div>
        `).join('');
    }

    function selectDate(dateStr) {
        state.selectedDate = dateStr;
        renderCalendar();
        playClickSound();
    }

    function selectTimeSlot(id) {
        state.selectedTimeSlot = id;
        renderTimeSlots();
        playClickSound();
    }

    function prevMonth() {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    }

    function nextMonth() {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    }

    // ─── Step 2: Guests & Occasion ────────────────────────────────────────────
    function renderStep2() {
        const numEl = $('#res-guest-num');
        if (numEl) numEl.textContent = state.guests;

        const container = $('#res-occasions');
        if (!container) return;
        container.innerHTML = OCCASIONS.map(o => `
            <div class="occasion-card ${state.occasion === o.id ? 'selected' : ''}"
                 onclick="Reservation.selectOccasion('${o.id}')">
                <span class="occasion-icon">${o.icon}</span>
                <div class="occasion-name">${o.name}</div>
                <div class="occasion-desc">${o.desc}</div>
            </div>
        `).join('');
    }

    function changeGuests(delta) {
        state.guests = Math.max(1, Math.min(20, state.guests + delta));
        const el = $('#res-guest-num');
        if (el) el.textContent = state.guests;
        playClickSound();
    }

    function selectOccasion(id) {
        state.occasion = id;
        renderStep2();
        playClickSound();
    }

    // ─── Step 3: Interactive Menu Selection ───────────────────────────────────
    async function renderStep3() {
        if (!state.menuData) {
            const grid = $('#res-dish-grid');
            if (grid) grid.innerHTML = '<div class="loader-gold" style="grid-column: 1/-1;">Consulting with the Chef...</div>';
            
            try {
                const res = await fetch(`/api/restaurants/${state.restaurantId}/menu`);
                state.menuData = await res.json();
                
                // Set initial category
                const categories = Object.keys(state.menuData);
                if (categories.length > 0) state.currentCategory = categories[0];
            } catch (err) {
                console.error("Menu fetch error:", err);
                return;
            }
        }

        updateMenuUI();
    }

    function setMenuMode(mode) {
        state.menuType = mode;
        playClickSound();
        
        // Update Buttons
        $$('.mode-btn').forEach(btn => btn.classList.remove('active'));
        $(`#mode-${mode}`).classList.add('active');
        
        // Handle Sidebar visibility
        const sidebar = $('#menu-sidebar');
        if (sidebar) sidebar.style.display = (mode === 'custom') ? 'block' : 'none';
        
        // Change layout based on mode
        const container = $('.pd-menu-experience-container');
        if (container) {
            if (mode === 'custom') {
                container.classList.add('showcase-mode');
                container.style.gridTemplateColumns = '220px 1fr 320px';
            } else {
                container.classList.remove('showcase-mode');
                container.style.gridTemplateColumns = '1fr 320px';
            }
        }

        if (mode === 'tasting') {
            state.selectedDishes = []; // Reset for Tasting
            generateTastingMenu();
        } else {
            state.selectedDishes = []; // Reset for Custom
            updateMenuUI();
        }
    }

    function generateTastingMenu() {
        // Automatically curate a selection of dishes for the Tasting mode
        const tastingDishes = [];
        let index = 1;
        
        // Take 1-2 items from each category for the sequence
        for (const [cat, dishes] of Object.entries(state.menuData)) {
            if (dishes.length > 0) {
                const dish = dishes[0];
                tastingDishes.push({
                    id: dish.id,
                    name: dish.name,
                    price: dish.price,
                    qty: 1,
                    category: cat,
                    isPreSet: true
                });
            }
        }
        
        state.selectedDishes = tastingDishes;
        updateMenuUI();
    }

    function updateMenuUI(partial = false) {
        if (!partial) {
            if (state.menuType === 'custom') {
                renderShowcase();
            } else {
                renderTastingSequence();
            }
        } else {
            // If partial, we might just update the summary or specific cards.
            // For now, let's at least keep scroll positions if re-rendering everything.
            const scrollPositions = Array.from(document.querySelectorAll('.scroll-container')).map(el => el.scrollLeft);
            renderShowcase();
            const newContainers = document.querySelectorAll('.scroll-container');
            scrollPositions.forEach((pos, i) => {
                if (newContainers[i]) newContainers[i].scrollLeft = pos;
            });
        }
        renderCurationSummary();
    }

    function renderCategories() {
        const container = $('#res-menu-categories');
        if (!container) return;
        
        container.innerHTML = Object.keys(state.menuData).map(cat => `
            <li class="pd-category-item ${state.currentCategory === cat ? 'active' : ''}" 
                onclick="Reservation.selectCategory('${cat}')">
                ${cat}
            </li>
        `).join('');
    }

    function selectCategory(cat) {
        state.currentCategory = cat;
        renderCategories();
        
        // Scroll to category section in showcase
        const section = document.getElementById(`showcase-${cat.toLowerCase()}`);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        playClickSound();
    }

    function filterDishes(key, val) {
        state.filters[key] = val;
        renderShowcase();
    }

    function renderShowcase() {
        const gallery = $('#res-dish-grid');
        if (!gallery) return;
        
        gallery.style.display = 'block'; // Ensure block layout for stacked sections
        
        let sectionsHtml = '';
        
        for (const [category, dishes] of Object.entries(state.menuData)) {
            let filteredDishes = dishes;
            if (state.filters.isVeg) filteredDishes = filteredDishes.filter(d => d.isVeg);
            // Signatures filter logic
            if (state.filters.isSignature) filteredDishes = filteredDishes.filter((d, i) => i % 3 === 0);

            if (filteredDishes.length === 0) continue;

            sectionsHtml += `
                <div class="pd-showcase-section" id="showcase-${category.toLowerCase()}">
                    <div class="showcase-category-label">${category}</div>
                     <div class="scroll-container" onmousedown="Reservation.handleMouseDown(event, this)">
                        <div class="scroll-track">
                             ${renderDishCards(filteredDishes, category)}
                        </div>
                    </div>
                </div>
            `;
        }
        
        gallery.innerHTML = sectionsHtml;
    }

    function renderDishCards(dishes, category) {
        return dishes.map(dish => {
            const selected = state.selectedDishes.find(sd => sd.id === dish.id);
            const escapedName = dish.name.replace(/'/g, "\\'");
            const escapedCat = category.replace(/'/g, "\\'");
            
            return `
                <div class="dish-card-premium">
                    <div class="dish-img-wrapper">
                        ${dish.image ? `<img src="${dish.image}" class="dish-img" loading="lazy">` : ''}
                        ${dish.isVeg ? '<div class="dish-badge">VEG</div>' : ''}
                    </div>
                    <div class="dish-info-content">
                        <div class="dish-header-row">
                            <h4 class="dish-title">${dish.name}</h4>
                            <span class="dish-price">₹${Number(dish.price).toLocaleString('en-IN')}</span>
                        </div>
                        <p class="dish-desc">${dish.description || 'A masterpiece crafted with precision.'}</p>
                        ${selected ? `
                            <div class="dish-qty-selector" onmousedown="event.stopPropagation()">
                                <button class="dish-qty-btn" onclick="Reservation.updateDishQuantity('${dish.id}', -1); event.stopPropagation();">−</button>
                                <span>${selected.qty}</span>
                                <button class="dish-qty-btn" onclick="Reservation.updateDishQuantity('${dish.id}', 1); event.stopPropagation();">+</button>
                            </div>
                        ` : `
                            <button class="btn-curate" 
                                onmousedown="event.stopPropagation()"
                                onclick="Reservation.curateDish('${dish.id}', '${escapedName}', ${dish.price}, '${escapedCat}'); event.stopPropagation();">
                                Curate Dish
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Manual Drag Support
    let isDragging = false;
    let startX, scrollLeft, currentContainer;

    function handleMouseDown(e, container) {
        isDragging = true;
        currentContainer = container;
        container.classList.add('dragging');
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
        
        // Temporarily pause animation by setting a class or style if needed
        // But CSS hover already pauses it. For drag, we might need more.
        container.querySelector('.scroll-track').style.animationPlayState = 'paused';
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    function handleMouseMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - currentContainer.offsetLeft;
        const walk = (x - startX) * 1.5;
        currentContainer.scrollLeft = scrollLeft - walk;
    }

    function handleMouseUp() {
        isDragging = false;
        if (currentContainer) {
            currentContainer.classList.remove('dragging');
            currentContainer.querySelector('.scroll-track').style.animationPlayState = '';
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    function renderTastingSequence() {
        const grid = $('#res-dish-grid');
        if (!grid) return;
        
        grid.style.display = 'block'; // Ensure same layout consistency
        grid.innerHTML = `
            <div class="pd-chef-tasting-sequence">
                ${state.selectedDishes.map((d, i) => `
                    <div class="chef-course-item">
                        <div class="course-number">0${i+1}</div>
                        <div class="course-content">
                            <h4>${d.name}</h4>
                            <p>${d.category} sequence. Seasonal selection curated for your palate.</p>
                            <div class="wine-pairing">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20m0-20l-4 4m4-4l4 4M5 7h14"/></svg>
                                <span>Paired with Estate Reserve ${i % 2 === 0 ? 'Selection' : 'Vintage'}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function curateDish(id, name, price, category) {
        state.selectedDishes.push({ id, name, price, qty: 1, category });
        updateMenuUI(true); // partial update to preserve scroll
        playClickSound();
    }

    function updateDishQuantity(id, delta) {
        const item = state.selectedDishes.find(d => d.id === id);
        if (!item) return;
        
        item.qty += delta;
        if (item.qty <= 0) {
            state.selectedDishes = state.selectedDishes.filter(d => d.id !== id);
        }
        
        updateMenuUI(true); // partial update to preserve scroll
        playClickSound();
    }

    function renderCurationSummary() {
        const container = $('#curated-items-list');
        const countEl = $('#total-courses-count');
        const suggestionEl = $('#course-suggestion');
        if (!container || !countEl) return;
        
        if (state.selectedDishes.length === 0) {
            container.innerHTML = '<p class="empty-state-text">Select dishes to begin your journey</p>';
            countEl.textContent = '0';
            return;
        }

        container.innerHTML = state.selectedDishes.map(d => `
            <div class="curated-item">
                <div class="curated-item-info">
                    <h4>${d.name}</h4>
                    <span>${d.category}</span>
                </div>
                ${state.menuType === 'custom' ? `
                    <div class="curated-qty-control">
                        <button class="qty-sm-btn" onclick="Reservation.updateDishQuantity('${d.id}', -1)">−</button>
                        <span>${d.qty}</span>
                        <button class="qty-sm-btn" onclick="Reservation.updateDishQuantity('${d.id}', 1)">+</button>
                    </div>
                ` : `
                    <span style="color:var(--pd-gold); font-size:0.7rem;">Curated</span>
                `}
            </div>
        `).join('');

        const totalQty = state.selectedDishes.reduce((sum, d) => sum + d.qty, 0);
        const totalPrice = state.selectedDishes.reduce((sum, d) => sum + (d.price * d.qty), 0);
        
        state.totalAmount = totalPrice;
        countEl.textContent = totalQty;
        
        // Intelligence: Suggestions
        if (totalQty < 3) suggestionEl.textContent = "Recommended: A few more selections to build a full narrative.";
        else if (totalQty >= 5 && totalQty <= 7) suggestionEl.textContent = "Perfect balance: You have curated a multi-course masterpiece.";
        else if (totalQty > 8) suggestionEl.textContent = "Grand Feast: An extensive sequence for a long and immersive evening.";
    }

    // ─── Step 4: Review & Confirm ─────────────────────────────────────────────
    function renderStep4() {
        const slot = TIME_SLOTS.find(s => s.id === state.selectedTimeSlot) || {};
        const occ  = OCCASIONS.find(o => o.id === state.occasion) || {};

        const formatted = state.selectedDate
            ? new Date(state.selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : '—';

        const summaryEl = $('#res-summary');
        if (summaryEl) {
            const menuTitle = state.menuType === 'tasting' ? "Chef's Tasting Menu" : "Custom Curated Selection";
            const dishList = state.selectedDishes.map(d => `<li>${d.name} (x${d.qty})</li>`).join('');

            summaryEl.innerHTML = `
                <div class="summary-title">RESERVATION SUMMARY</div>
                <div class="summary-row">
                    <span class="summary-key">Establishment</span>
                    <span class="summary-val">${state.restaurantName || '—'}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-key">Date</span>
                    <span class="summary-val">${formatted}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-key">Time</span>
                    <span class="summary-val">${slot.time || '—'} · ${slot.label || '—'}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-key">Guests</span>
                    <span class="summary-val">${state.guests} ${state.guests === 1 ? 'Guest' : 'Guests'}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-key">Occasion</span>
                    <span class="summary-val">${occ.name || '—'}</span>
                </div>
                <div class="summary-row" style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 2rem; padding-top: 2rem;">
                    <span class="summary-key">Menu Preference</span>
                    <span class="summary-val" style="color:var(--pd-gold);">${menuTitle}</span>
                </div>
                <div class="curated-menu-preview">
                    <ul style="list-style: none; padding: 1.5rem 0; font-size: 0.8rem; color: rgba(255,255,255,0.6);">
                        ${dishList}
                    </ul>
                </div>
                <div class="summary-row" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem;">
                    <span class="summary-key">Experience Total</span>
                    <span class="summary-val" style="font-size: 1.4rem; color: var(--pd-gold);">₹${state.totalAmount.toLocaleString('en-IN')}</span>
                </div>
            `;
        }
    }

    // ─── Navigation ───────────────────────────────────────────────────────────
    function nextStep() {
        if (state.currentStep === 0) {
            if (!state.restaurantId) return showError('Please select a destination.');
        }
        if (state.currentStep === 1) {
            if (!state.selectedDate)     return showError('Please select a date for your reservation.');
            if (!state.selectedTimeSlot) return showError('Please choose a preferred time slot.');
        }
        if (state.currentStep === 2) {
            if (!state.occasion) return showError('Please select the occasion for your visit.');
        }
        if (state.currentStep === 3) {
            if (state.selectedDishes.length === 0) return showError('Please curate your menu selection to proceed.');
        }
        if (state.currentStep === 4) {
            return submitReservation();
        }
        goToStep(state.currentStep + 1);
    }

    function prevStep() {
        if (state.currentStep > 0) goToStep(state.currentStep - 1);
    }

    function showError(msg) {
        const existing = $('#res-error-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'res-error-toast';
        toast.style.cssText = `
            position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
            background: rgba(20,10,10,0.95); border: 1px solid rgba(231,76,60,0.4);
            color: #e74c3c; padding: 1rem 2rem; border-radius: 8px; z-index: 9999;
            font-size: 0.8rem; letter-spacing: 1px; backdrop-filter: blur(20px);
            animation: floatUpFade 3s ease-out forwards;
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ─── Submit ───────────────────────────────────────────────────────────────
    async function submitReservation() {
        const btn = $('#res-confirm-btn');
        if (btn) { btn.textContent = 'SECURIING TRANSACTION...'; btn.disabled = true; }

        try {
            // 1. Trigger Payment Gateway
            const paymentResult = await Payments.payForBooking(state, state.totalAmount);
            
            if (!paymentResult.success) {
                showError(paymentResult.message || 'Payment could not be completed.');
                if (btn) { btn.textContent = 'Initiate Reservation'; btn.disabled = false; }
                return;
            }

            // 2. Signature and record are already verified in Payments.payForBooking
            // We just need to show the confirmation UI (since the backend already updated the booking status)
            showConfirmation({
                id: paymentResult.payment.provider_payment_id,
                date: state.selectedDate,
                timeSlot: state.selectedTimeSlot,
                guests: state.guests,
                occasion: state.occasion,
                menuType: state.menuType,
                amount: state.totalAmount
            });

        } catch (err) {
            console.error(err);
            showError('Concierge synchronization error. Please try again.');
            if (btn) { btn.textContent = 'Initiate Reservation'; btn.disabled = false; }
        }
    }

    function showConfirmation(reservation) {
        const flowContainer = $('#reservation-flow');
        const panelsViewport = $('.pd-panels-viewport');
        const confPanel = $('#reservation-confirmation');
        if (!flowContainer || !confPanel) return;

        flowContainer.style.display = 'none';
        if (panelsViewport) panelsViewport.style.display = 'none';
        
        confPanel.style.display = 'block';
        confPanel.classList.add('show');

        // Premium Animation Injection
        confPanel.innerHTML = `
            <div class="success-checkmark">
                <div class="check-icon">
                    <span class="icon-line line-tip"></span>
                    <span class="icon-line line-long"></span>
                </div>
            </div>
            <div class="success-glow"></div>
            <h2 class="confirm-headline">Your Sanctuary is Secured</h2>
            <p class="confirm-subtext">A dedicated member of our concierge team will reach out within 15 minutes to finalize your bespoke experience.</p>
            
            <div class="reservation-summary-receipt" id="final-res-summary"></div>

            <div class="concierge-note">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Concierge Confirmation Pending</span>
            </div>

            <button class="btn-confirm-done" onclick="window.location.href='index.html'">Return to Sanctuary</button>
        `;

        const formatted = reservation.date
            ? new Date(reservation.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : '—';
        const slot = TIME_SLOTS.find(s => s.id === reservation.timeSlot) || {};
        const occ  = OCCASIONS.find(o => o.id === reservation.occasion) || {};

        const summaryContainer = $('#final-res-summary');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="receipt-row">
                    <span class="receipt-key">Ref. No.</span>
                    <span class="receipt-val" style="color:var(--pd-gold);">${reservation.id}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-key">Establishment</span>
                    <span class="receipt-val">${state.restaurantName}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-key">Date</span>
                    <span class="receipt-val">${formatted}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-key">Time</span>
                    <span class="receipt-val">${slot.time} · ${slot.label}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-key">Guests</span>
                    <span class="receipt-val">${reservation.guests} Guests</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-key">Menu</span>
                    <span class="receipt-val">${reservation.menuType === 'tasting' ? 'Chef’s Tasting' : 'Custom Curated'}</span>
                </div>
            `;
        }
        confPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ─── Init ─────────────────────────────────────────────────────────────────
    async function init() {
        initCalendar();
        
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        if (id) {
            try {
                const res = await fetch(`/api/restaurants/${id}`);
                const r = await res.json();
                state.restaurantId = r.id;
                state.restaurantName = r.name;
                goToStep(1); // Skip Step 0
            } catch (err) {
                console.error("Failed to load restaurant from URL:", err);
                goToStep(0);
            }
        } else {
            goToStep(0);
        }
    }

    // Auto-init for new page
    if (window.location.pathname.includes('private-dining.html')) {
        document.addEventListener('DOMContentLoaded', init);
    }

    return {
        init,
        selectRestaurant,
        filterRestaurants,
        selectDate,
        selectTimeSlot,
        prevMonth,
        nextMonth,
        changeGuests,
        selectOccasion,
        setMenuMode,
        selectCategory,
        filterDishes,
        curateDish,
        updateDishQuantity,
        handleMouseDown,
        nextStep,
        prevStep
    };

})();
