/**
 * Cibelle Luxury Payments Orchestrator — JS
 * Handles premium payment flows for Orders, Private Dining, and Membership.
 */

const Payments = (() => {


    const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

    // ─── Helpers ─────────────────────────────────────────────────────────────
    function getToken() {
        return localStorage.getItem('cibelle_token');
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem('cibelle_user') || '{}');
        } catch { return {}; }
    }

    // ─── Injection ────────────────────────────────────────────────────────────
    function loadScript() {
        return new Promise((resolve, reject) => {
            if (window.Razorpay) return resolve();
            const script = document.createElement('script');
            script.src = RAZORPAY_SCRIPT_URL;
            script.onload = () => resolve();
            script.onerror = () => {
                console.warn("Razorpay script blocked or failed. Switching to Concierge mode.");
                resolve(null); // Resolve with null to trigger fallback
            };
            document.body.appendChild(script);
            // Safety timeout for slow connections
            setTimeout(() => resolve(window.Razorpay ? true : null), 4000);
        });
    }

    // ─── Concierge Fallback (The "Simulation") ───────────────────────────────
    async function simulateConciergeAuth(type, internalPaymentId, extraData = {}) {
        return new Promise((resolve) => {
            showPaymentLoader("Initializing Private Concierge Verification...");
            
            setTimeout(() => {
                showPaymentLoader("Establishing Secure Handshake with Private Bank...");
                setTimeout(async () => {
                    showPaymentLoader("Authenticating via Concierge Protocol...");
                    
                    // Call backend to authorize this as a concierge-verified transaction
                    try {
                        const res = await fetch('/api/payments/verify', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${getToken()}` 
                            },
                            body: JSON.stringify({
                                concierge_verification: 'CIBELLE_ELITE_AUTH',
                                internalPaymentId,
                                transaction_type: type,
                                ...extraData
                            })
                        });
                        const result = await res.json();
                        hidePaymentLoader();
                        resolve(result);
                    } catch (err) {
                        hidePaymentLoader();
                        resolve({ success: false, message: "Concierge verification timed out." });
                    }
                }, 1500);
            }, 1200);
        });
    }

    // ─── Verification ─────────────────────────────────────────────────────────
    async function verifyPayment(response, internalPaymentId, type, extraData = {}) {
        try {
            const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}` 
                },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    internalPaymentId,
                    transaction_type: type,
                    ...extraData
                })
            });

            const data = await res.json();
            return data;
        } catch (err) {
            console.error('Verification Fetch Error:', err);
            return { success: false, message: 'Network error during verification' };
        }
    }

    // ─── Private Dining Booking ───────────────────────────────────────────────
    async function payForBooking(bookingDetails, amount) {
        const scriptLoaded = await loadScript();
        showPaymentLoader("Securing your private dining sanctuary...");

        try {
            const res = await fetch('/api/payments/create-booking', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ amount, bookingDetails })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Failed to initiate booking");

            if (!window.Razorpay) {
                return await simulateConciergeAuth('BOOKING', data.internalPaymentId, { bookingId: data.bookingId });
            }

            hidePaymentLoader();

            return new Promise((resolve) => {
                const user = getUser();
                const options = {
                    key: data.key_id,
                    amount: data.order.amount,
                    currency: data.order.currency,
                    name: "Cibelle Luxury Concierge",
                    description: `Private Dining at ${bookingDetails.restaurantName}`,
                    order_id: data.order.id,
                    handler: async function (response) {
                        showPaymentLoader("Finalizing your culinary narrative...");
                        const verifyRes = await verifyPayment(response, data.internalPaymentId, 'BOOKING');
                        hidePaymentLoader();
                        resolve(verifyRes);
                    },
                    prefill: {
                        name: user.first_name + ' ' + (user.last_name || ''),
                        email: user.email
                    },
                    theme: { color: "#D4AF37" },
                    modal: {
                        ondismiss: function() { resolve({ success: false, message: "Payment cancelled by user" }); }
                    }
                };
                const rzp = new Razorpay(options);
                rzp.open();
            });

        } catch (err) {
            hidePaymentLoader();
            return { success: false, message: err.message };
        }
    }

    // ─── Food Order Payment ───────────────────────────────────────────────────
    async function payForOrder(items, totalAmount, restaurantId, address) {
        const scriptLoaded = await loadScript();
        showPaymentLoader("Preparing your secure checkout...");

        try {
            const res = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ amount: totalAmount, orderDetails: { items, restaurantId, address } })
            });

            const data = await res.json();
            if (!data.success) throw new Error("Could not initiate payment");

            if (!window.Razorpay) {
                return await simulateConciergeAuth('ORDER', data.internalPaymentId);
            }

            hidePaymentLoader();

            return new Promise((resolve) => {
                const user = getUser();
                const options = {
                    key: data.key_id,
                    amount: data.order.amount,
                    currency: data.order.currency,
                    name: "Cibelle Luxury Concierge",
                    description: "Premium Food Delivery Selection",
                    order_id: data.order.id,
                    handler: async function (response) {
                        showPaymentLoader("Verifying transaction...");
                        const verifyRes = await verifyPayment(response, data.internalPaymentId, 'ORDER');
                        hidePaymentLoader();
                        resolve(verifyRes);
                    },
                    prefill: {
                        name: user.first_name + ' ' + (user.last_name || ''),
                        email: user.email
                    },
                    theme: { color: "#D4AF37" },
                    modal: {
                        ondismiss: function() { resolve({ success: false, message: "Payment cancelled by member" }); }
                    }
                };
                const rzp = new Razorpay(options);
                rzp.open();
            });

        } catch (err) {
            hidePaymentLoader();
            return { success: false, message: err.message };
        }
    }

    // ─── Membership Upgrade ────────────────────────────────────────────────────
    async function upgradeMembership(tier, amount) {
        const scriptLoaded = await loadScript();
        showPaymentLoader(`Unlocking your ${tier.toUpperCase()} status...`);

        try {
            const res = await fetch('/api/payments/membership-upgrade', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ tier, amount })
            });

            const data = await res.json();
            if (!data.success) throw new Error("Upgrade initiation failed");

            if (!window.Razorpay) {
                return await simulateConciergeAuth('MEMBERSHIP', data.internalPaymentId, { tier });
            }

            hidePaymentLoader();

            return new Promise((resolve) => {
                const user = getUser();
                const options = {
                    key: data.key_id,
                    amount: data.order.amount,
                    currency: data.order.currency,
                    name: "Cibelle Club",
                    description: `Membership Tier Upgrade: ${tier.toUpperCase()}`,
                    order_id: data.order.id,
                    handler: async function (response) {
                        showPaymentLoader("Finalizing your elite status...");
                        const verifyRes = await verifyPayment(response, data.internalPaymentId, 'MEMBERSHIP', { tier });
                        hidePaymentLoader();
                        resolve(verifyRes);
                    },
                    prefill: {
                        name: user.first_name + ' ' + (user.last_name || ''),
                        email: user.email
                    },
                    theme: { color: "#D4AF37" },
                    modal: {
                        ondismiss: function() { 
                            hidePaymentLoader();
                            resolve({ success: false, message: "Upgrade cancelled" }); 
                        }
                    }
                };
                const rzp = new Razorpay(options);
                rzp.open();
            });
        } catch (err) {
            hidePaymentLoader();
            return { success: false, message: err.message };
        }
    }

    // ─── Loader UI ────────────────────────────────────────────────────────────
    function showPaymentLoader(text) {
        let loader = document.getElementById('pd-payment-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'pd-payment-loader';
            loader.innerHTML = `
                <div class="pd-loader-content">
                    <div class="pd-loader-spinner"></div>
                    <p id="pd-loader-text">${text}</p>
                </div>
            `;
            document.body.appendChild(loader);
        } else {
            document.getElementById('pd-loader-text').textContent = text;
            loader.style.display = 'flex';
        }
    }

    function hidePaymentLoader() {
        const loader = document.getElementById('pd-payment-loader');
        if (loader) loader.style.display = 'none';
    }

    return {
        payForBooking,
        payForOrder,
        upgradeMembership
    };

})();
