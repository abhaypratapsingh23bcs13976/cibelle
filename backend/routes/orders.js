const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Get User's Orders with Restaurant Details
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                o.id, 
                o.items, 
                o.total_amount AS "total_price", 
                o.status, 
                o.created_at AS "date",
                r.name AS "restaurant_name",
                r.image_url AS "restaurant_image"
             FROM orders o
             LEFT JOIN restaurants r ON o.restaurant_id::text = r.id::text
             WHERE o.user_id = $1 
             ORDER BY o.created_at DESC`, 
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch Orders Error:', err);
        res.status(500).json({ message: "Error fetching order history" });
    }
});

// Place New Order
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { items, restaurant_id, total_amount, address } = req.body;
        
        if (!items || !total_amount) {
            return res.status(400).json({ message: "Insufficient order details" });
        }

        const result = await db.query(
            `INSERT INTO orders (user_id, restaurant_id, items, total_amount, status, delivery_address) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user.id, restaurant_id || null, JSON.stringify(items), total_amount, 'DELIVERED', address || 'N/A']
        );

        res.status(201).json({ message: "Order placed in history", order: result.rows[0] });
    } catch (err) {
        console.error('Place Order Error:', err);
        res.status(500).json({ message: "Error placing order" });
    }
});

module.exports = router;
