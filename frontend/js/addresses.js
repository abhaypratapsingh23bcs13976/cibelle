/**
 * Cibelle — Dining Addresses Controller (Frontend)
 * Handles: Load, Add, Edit, Delete, Set Default, GPS Detection
 * Uses OpenStreetMap Nominatim for free reverse geocoding.
 */

const AddressManager = (() => {
    const API = '/api/addresses';

    function token() { return localStorage.getItem('cibelle_token'); }

    // ─── Type config ───────────────────────────────────────────────────────────
    const TYPE_CONFIG = {
        home:   { emoji: '🏡', label: 'Home' },
        villa:  { emoji: '🏰', label: 'Villa' },
        office: { emoji: '🏢', label: 'Office' },
        event:  { emoji: '✨', label: 'Event Venue' }
    };

    // ─── State ─────────────────────────────────────────────────────────────────
    let addresses = [];
    let editingId = null;

    // ─── Init ──────────────────────────────────────────────────────────────────
    async function init() {
        await loadAddresses();
        renderSection();
        bindModalEvents();
    }

    // ─── API Calls ─────────────────────────────────────────────────────────────
    async function loadAddresses() {
        try {
            const res = await fetch(API, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            const data = await res.json();
            addresses = data.success ? data.addresses : [];
        } catch (err) {
            console.error('Address load error:', err);
            addresses = [];
        }
    }

    async function saveAddress(payload) {
        const method = editingId ? 'PUT' : 'POST';
        const url    = editingId ? `${API}/${editingId}` : API;
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token()}`
            },
            body: JSON.stringify(payload)
        });
        return res.json();
    }

    async function deleteAddress(id) {
        const res = await fetch(`${API}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        return res.json();
    }

    async function setDefault(id) {
        const res = await fetch(`${API}/${id}/default`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        return res.json();
    }

    // ─── Render ────────────────────────────────────────────────────────────────
    function renderSection() {
        const container = document.getElementById('address-sanctuaries-grid');
        if (!container) return;

        container.innerHTML = '';

        if (addresses.length === 0) {
            container.innerHTML = `
                <div class="addr-empty-state">
                    <div class="addr-empty-icon">🗺️</div>
                    <p class="addr-empty-title">Your Dining Sanctuaries Await</p>
                    <p class="addr-empty-sub">Define the exceptional places where Cibelle will serve you.</p>
                </div>
            `;
        } else {
            addresses.forEach(addr => {
                container.appendChild(buildCard(addr));
            });
        }

        // Always add the "+" card at end
        const addCard = document.createElement('div');
        addCard.className = 'addr-card addr-card-add';
        addCard.id = 'addr-add-card';
        addCard.setAttribute('tabindex', '0');
        addCard.setAttribute('role', 'button');
        addCard.innerHTML = `
            <div class="addr-add-plus">+</div>
            <span>Add New Sanctuary</span>
        `;
        addCard.onclick = () => openModal();
        addCard.onkeydown = (e) => { if (e.key === 'Enter') openModal(); };
        container.appendChild(addCard);
    }

    function buildCard(addr) {
        const config = TYPE_CONFIG[addr.address_type] || TYPE_CONFIG.home;
        const card = document.createElement('div');
        card.className = `addr-card ${addr.is_default ? 'addr-card--default' : ''}`;
        card.id = `addr-card-${addr.id}`;
        card.innerHTML = `
            ${addr.is_default ? '<div class="addr-primary-badge">✦ PRIMARY</div>' : ''}
            <div class="addr-card-emoji">${config.emoji}</div>
            <div class="addr-card-type">${config.label}</div>
            <div class="addr-card-label">${escapeHtml(addr.label)}</div>
            <div class="addr-card-address">${escapeHtml(addr.full_address)}</div>
            ${addr.city ? `<div class="addr-card-city">${escapeHtml(addr.city)}${addr.postal_code ? ' — ' + escapeHtml(addr.postal_code) : ''}</div>` : ''}
            <div class="addr-card-actions">
                ${!addr.is_default ? `<button class="addr-btn addr-btn-default" onclick="AddressManager.triggerSetDefault(${addr.id})" title="Set as Primary">★ Set Primary</button>` : ''}
                <button class="addr-btn addr-btn-edit" onclick="AddressManager.openModalEdit(${addr.id})" title="Edit">Edit</button>
                <button class="addr-btn addr-btn-delete" onclick="AddressManager.triggerDelete(${addr.id})" title="Remove">Remove</button>
            </div>
        `;
        return card;
    }

    // ─── Modal ─────────────────────────────────────────────────────────────────
    function openModal(prefilledData = null) {
        editingId = null;
        const modal = document.getElementById('addr-modal');
        const title = document.getElementById('addr-modal-title');
        if (!modal) return;

        title.textContent = 'NEW DINING SANCTUARY';
        clearForm();
        if (prefilledData) fillForm(prefilledData);
        modal.classList.add('addr-modal--open');
        document.body.style.overflow = 'hidden';
    }

    function openModalEdit(id) {
        const addr = addresses.find(a => a.id === id);
        if (!addr) return;
        editingId = id;
        clearForm();
        fillForm(addr);
        const modal = document.getElementById('addr-modal');
        const title = document.getElementById('addr-modal-title');
        title.textContent = 'REFINE YOUR SANCTUARY';
        modal.classList.add('addr-modal--open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('addr-modal');
        if (modal) modal.classList.remove('addr-modal--open');
        document.body.style.overflow = '';
        editingId = null;
        clearForm();
        setGpsStatus('');
    }

    function fillForm(addr) {
        setVal('addr-inp-label', addr.label || '');
        setVal('addr-inp-type', addr.address_type || 'home');
        setVal('addr-inp-address', addr.full_address || '');
        setVal('addr-inp-city', addr.city || '');
        setVal('addr-inp-state', addr.state || '');
        setVal('addr-inp-postal', addr.postal_code || '');
        setVal('addr-inp-landmark', addr.landmark || '');
        const defCb = document.getElementById('addr-inp-default');
        if (defCb) defCb.checked = !!addr.is_default;

        // Store hidden lat/lng for editing
        const latEl = document.getElementById('addr-inp-lat');
        const lngEl = document.getElementById('addr-inp-lng');
        if (latEl) latEl.value = addr.latitude || '';
        if (lngEl) lngEl.value = addr.longitude || '';
    }

    function clearForm() {
        ['addr-inp-label','addr-inp-type','addr-inp-address','addr-inp-city',
         'addr-inp-state','addr-inp-postal','addr-inp-landmark',
         'addr-inp-lat','addr-inp-lng'].forEach(id => setVal(id, ''));
        const defCb = document.getElementById('addr-inp-default');
        if (defCb) defCb.checked = false;
        setVal('addr-inp-type', 'home');
        // Clear validation
        document.querySelectorAll('.addr-field-error').forEach(el => el.textContent = '');
    }

    function bindModalEvents() {
        const overlay = document.getElementById('addr-modal');
        if (!overlay) return;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }

    // ─── GPS Detection ─────────────────────────────────────────────────────────
    function detectLocation() {
        if (!navigator.geolocation) {
            setGpsStatus('error', 'Geolocation is not supported by your browser.');
            return;
        }

        setGpsStatus('loading', 'Detecting your location...');
        const gpsBtn = document.getElementById('addr-gps-btn');
        if (gpsBtn) { gpsBtn.disabled = true; gpsBtn.textContent = 'Detecting...'; }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setGpsStatus('loading', 'Translating coordinates to address...');

                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
                    const res = await fetch(url, {
                        headers: { 'Accept-Language': 'en' }
                    });
                    const data = await res.json();

                    if (data && data.address) {
                        const a = data.address;
                        const road = a.road || a.pedestrian || a.suburb || '';
                        const neighbourhood = a.neighbourhood || a.quarter || '';
                        const fullAddr = [road, neighbourhood, a.city_district].filter(Boolean).join(', ');

                        setVal('addr-inp-address', fullAddr || data.display_name);
                        setVal('addr-inp-city', a.city || a.town || a.village || '');
                        setVal('addr-inp-state', a.state || '');
                        setVal('addr-inp-postal', a.postcode || '');
                        setVal('addr-inp-lat', latitude);
                        setVal('addr-inp-lng', longitude);

                        setGpsStatus('success', '✓ Location detected successfully');
                    } else {
                        setGpsStatus('error', 'Could not resolve address. Please fill manually.');
                    }
                } catch (err) {
                    setGpsStatus('error', 'Geocoding service unavailable. Please fill manually.');
                }

                if (gpsBtn) { gpsBtn.disabled = false; gpsBtn.textContent = '📍 Use Current Location'; }
            },
            (error) => {
                const msgs = {
                    1: 'Location access denied. Please enable in browser settings.',
                    2: 'Location unavailable. Please try again.',
                    3: 'Location request timed out.'
                };
                setGpsStatus('error', msgs[error.code] || 'Location detection failed.');
                if (gpsBtn) { gpsBtn.disabled = false; gpsBtn.textContent = '📍 Use Current Location'; }
            },
            { timeout: 10000, maximumAge: 60000 }
        );
    }

    function setGpsStatus(type, msg = '') {
        const el = document.getElementById('addr-gps-status');
        if (!el) return;
        el.textContent = msg;
        el.className = 'addr-gps-status';
        if (type) el.classList.add(`addr-gps-status--${type}`);
    }

    // ─── Form Submit ───────────────────────────────────────────────────────────
    async function submitForm() {
        // Validate
        const fullAddress = getVal('addr-inp-address').trim();
        const city = getVal('addr-inp-city').trim();
        const postal = getVal('addr-inp-postal').trim();

        let valid = true;
        setError('addr-err-address', '');
        setError('addr-err-city', '');
        setError('addr-err-postal', '');

        if (!fullAddress) {
            setError('addr-err-address', 'Full address is required');
            valid = false;
        }
        if (postal && !/^\d{4,10}$/.test(postal)) {
            setError('addr-err-postal', 'Enter a valid postal code');
            valid = false;
        }

        if (!valid) return;

        const payload = {
            label:        getVal('addr-inp-label') || 'Home',
            address_type: getVal('addr-inp-type') || 'home',
            full_address: fullAddress,
            city:         city,
            state:        getVal('addr-inp-state').trim(),
            postal_code:  postal,
            landmark:     getVal('addr-inp-landmark').trim(),
            is_default:   document.getElementById('addr-inp-default')?.checked || false,
            latitude:     getVal('addr-inp-lat') || null,
            longitude:    getVal('addr-inp-lng') || null
        };

        const saveBtn = document.getElementById('addr-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

        try {
            const result = await saveAddress(payload);
            if (result.success) {
                closeModal();
                await loadAddresses();
                renderSection();
                showAddressToast(editingId ? 'Sanctuary updated successfully.' : 'New sanctuary added to your profile.');
            } else {
                showAddressToast(result.message || 'An error occurred. Please try again.', 'error');
            }
        } catch (err) {
            showAddressToast('Connection error. Please try again.', 'error');
        }

        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Sanctuary'; }
    }

    // ─── Delete Flow ───────────────────────────────────────────────────────────
    function triggerDelete(id) {
        const confirm = document.getElementById('addr-confirm-modal');
        if (!confirm) return;
        confirm.dataset.targetId = id;
        confirm.classList.add('addr-modal--open');
        document.body.style.overflow = 'hidden';
    }

    async function confirmDelete() {
        const confirm = document.getElementById('addr-confirm-modal');
        if (!confirm) return;
        const id = parseInt(confirm.dataset.targetId);
        
        const result = await deleteAddress(id);
        confirm.classList.remove('addr-modal--open');
        document.body.style.overflow = '';

        if (result.success) {
            await loadAddresses();
            renderSection();
            showAddressToast('Sanctuary removed from your profile.');
        } else {
            showAddressToast(result.message || 'Failed to remove address.', 'error');
        }
    }

    function cancelDelete() {
        const confirm = document.getElementById('addr-confirm-modal');
        if (confirm) confirm.classList.remove('addr-modal--open');
        document.body.style.overflow = '';
    }

    // ─── Set Default ────────────────────────────────────────────────────────────
    async function triggerSetDefault(id) {
        const card = document.getElementById(`addr-card-${id}`);
        if (card) card.style.opacity = '0.6';

        const result = await setDefault(id);

        if (result.success) {
            await loadAddresses();
            renderSection();
            showAddressToast('Primary sanctuary updated.');
        } else {
            showAddressToast(result.message || 'Failed to update primary address.', 'error');
        }

        if (card) card.style.opacity = '1';
    }

    // ─── Toast ─────────────────────────────────────────────────────────────────
    function showAddressToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `addr-toast addr-toast--${type}`;
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('addr-toast--visible'));
        setTimeout(() => {
            t.classList.remove('addr-toast--visible');
            setTimeout(() => t.remove(), 400);
        }, 3500);
    }

    // ─── Utilities ─────────────────────────────────────────────────────────────
    function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
    function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
    function setError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ─── Public API ────────────────────────────────────────────────────────────
    return {
        init,
        openModal,
        openModalEdit,
        closeModal,
        submitForm,
        detectLocation,
        triggerDelete,
        confirmDelete,
        cancelDelete,
        triggerSetDefault
    };
})();
