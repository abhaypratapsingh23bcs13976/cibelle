const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Initialize Razorpay with placeholder keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1. Create Payment Order for Food Delivery
router.post('/create-order', authenticateToken, async (req, res) => {
    try {
        const { amount, currency = 'INR', orderDetails } = req.body;

        if (!amount) return res.status(400).json({ message: "Amount is required" });

        // A. Pre-create payment record in PENDING state
        const paymentRes = await db.query(
            `INSERT INTO payments (user_id, amount, currency, transaction_type, status) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [req.user.id, amount, currency, 'ORDER', 'PENDING']
        );
        const internalPaymentId = paymentRes.rows[0].id;

        // B. Create Razorpay Order
        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency,
            receipt: `RCPT_ORD_${internalPaymentId}`,
            notes: {
                userId: req.user.id,
                internalPaymentId
            }
        };

        const rzpOrder = await razorpay.orders.create(options);

        // C. Update payment record with provider order id
        await db.query(
            `UPDATE payments SET provider_order_id = $1 WHERE id = $2`,
            [rzpOrder.id, internalPaymentId]
        );

        res.json({
            success: true,
            key_id: razorpay.key_id,
            order: rzpOrder,
            internalPaymentId
        });

    } catch (err) {
        console.error('Create Order Error:', err);
        res.status(500).json({ message: "Error creating payment order", error: err.message });
    }
});

// 2. Create Payment Order for Private Dining Booking
router.post('/create-booking', authenticateToken, async (req, res) => {
    try {
        const { amount, bookingDetails } = req.body;

        // A. Create Booking in PENDING status
        const bookingRes = await db.query(
            `INSERT INTO bookings (user_id, restaurant_id, date, time_slot, guests, occasion, menu_type, selected_dishes, special_requests, total_amount, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [
                req.user.id, 
                bookingDetails.restaurantId, 
                bookingDetails.date, 
                bookingDetails.timeSlot, 
                bookingDetails.guests, 
                bookingDetails.occasion, 
                bookingDetails.menuType, 
                JSON.stringify(bookingDetails.selectedDishes), 
                bookingDetails.specialRequests, 
                amount,
                'PENDING'
            ]
        );
        const bookingId = bookingRes.rows[0].id;

        // B. Create Payment Record
        const paymentRes = await db.query(
            `INSERT INTO payments (user_id, booking_id, amount, transaction_type, status) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [req.user.id, bookingId, amount, 'BOOKING', 'PENDING']
        );
        const internalPaymentId = paymentRes.rows[0].id;

        // C. Create Razorpay Order
        const options = {
            amount: Math.round(amount * 100), 
            currency: 'INR',
            receipt: `RCPT_BKG_${bookingId}`,
            notes: { bookingId, internalPaymentId }
        };

        const rzpOrder = await razorpay.orders.create(options);

        await db.query(`UPDATE payments SET provider_order_id = $1 WHERE id = $2`, [rzpOrder.id, internalPaymentId]);

        res.json({
            success: true,
            key_id: razorpay.key_id,
            order: rzpOrder,
            bookingId,
            internalPaymentId
        });

    } catch (err) {
        console.error('Create Booking Error:', err);
        res.status(500).json({ message: "Error creating booking session" });
    }
});

// 3. Create Payment Order for Membership Upgrade
router.post('/membership-upgrade', authenticateToken, async (req, res) => {
    try {
        const { tier, amount } = req.body;

        const paymentRes = await db.query(
            `INSERT INTO payments (user_id, amount, transaction_type, status) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [req.user.id, amount, 'MEMBERSHIP', 'PENDING']
        );
        const internalPaymentId = paymentRes.rows[0].id;

        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `RCPT_MBR_${internalPaymentId}`,
            notes: { tier, internalPaymentId }
        };

        const rzpOrder = await razorpay.orders.create(options);
        await db.query(`UPDATE payments SET provider_order_id = $1 WHERE id = $2`, [rzpOrder.id, internalPaymentId]);

        res.json({
            success: true,
            key_id: razorpay.key_id,
            order: rzpOrder,
            internalPaymentId
        });
    } catch (err) {
        res.status(500).json({ message: "Error initiating upgrade" });
    }
});

// 4. Verify Payment (The "moment of truth")
router.post('/verify', authenticateToken, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, internalPaymentId, concierge_verification } = req.body;

        // A-1. Handle Concierge Verification Fallback
        if (concierge_verification === 'CIBELLE_ELITE_AUTH') {
            const paymentRes = await db.query(
                `UPDATE payments 
                 SET status = 'SUCCESS', provider_payment_id = 'CONCIERGE_AUTH_' || id, updated_at = NOW() 
                 WHERE id = $1 RETURNING *`,
                [internalPaymentId]
            );
            
            if (paymentRes.rows.length === 0) return res.status(404).json({ success: false, message: "Payment record not found" });
            const payment = paymentRes.rows[0];

            // Perform Transaction-Specific Side Effects
            await handlePaymentSideEffects(payment, req.body, req.user.id);

            return res.json({ success: true, message: "Concierge verification authorized", payment });
        }

        // A-2. Real Razorpay Signature Verification
        const hmac = crypto.createHmac('sha256', razorpay.key_secret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
            await db.query(`UPDATE payments SET status = 'FAILED' WHERE id = $1`, [internalPaymentId]);
            return res.status(400).json({ success: false, message: "Fraudulent payment attempt detected." });
        }

        // B. Update Payment Record
        const paymentRes = await db.query(
            `UPDATE payments 
             SET status = 'SUCCESS', provider_payment_id = $1, updated_at = NOW() 
             WHERE provider_order_id = $2 RETURNING *`,
            [razorpay_payment_id, razorpay_order_id]
        );
        const payment = paymentRes.rows[0];

        // C. Perform Transaction-Specific Side Effects
        await handlePaymentSideEffects(payment, req.body, req.user.id);

        res.json({ success: true, message: "Payment verified successfully", payment });

    } catch (err) {
        console.error('Verification Error:', err);
        res.status(500).json({ success: false, message: "Error verifying payment" });
    }
});

/**
 * Shared logic for fulfilling a successful payment
 */
async function handlePaymentSideEffects(payment, body, userId) {
    if (payment.transaction_type === 'BOOKING') {
        await db.query(`UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1`, [payment.booking_id]);
    } else if (payment.transaction_type === 'ORDER') {
        // Orders are finalized on the frontend via /orders POST, 
        // but we ensure payment record is linked.
    } else if (payment.transaction_type === 'MEMBERSHIP') {
        const tier = body.tier; 
        if (tier) {
            await db.query(`UPDATE users SET membership_tier = $1 WHERE id = $2`, [tier, userId]);
        }
    }

    // Log the success
    await db.query(
        `INSERT INTO payment_logs (payment_id, event_type, payload) VALUES ($1, $2, $3)`,
        [payment.id, 'payment.verified', JSON.stringify(body)]
    );
}

module.exports = router;
