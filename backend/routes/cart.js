const express = require('express');
const router = express.Router();
const db = require('../db');

// In-memory cart for session (can be migrated to Redis/SQL later for persistent sessions)
global.MOCK_CART = global.MOCK_CART || [];

router.get('/', async (req, res) => {
    try {
        let total = 0;
        const cartItems = global.MOCK_CART || [];
        
        const detailedItems = await Promise.all(cartItems.map(async (c) => {
            const result = await db.query('SELECT * FROM menu_items WHERE id = $1', [c.item_id]);
            const m = result.rows[0];
            if (!m) return null;
            
            const itemTotal = parseFloat(m.price) * c.quantity;
            total += itemTotal;
            
            return {
                cartId: c.cartId,
                itemId: m.id,
                name: m.name,
                price: parseFloat(m.price),
                image: m.image_url,
                quantity: c.quantity,
                itemTotal
            };
        }));

        const items = detailedItems.filter(x => x !== null);

        res.json({
            items,
            subtotal: total.toFixed(2),
            deliveryFee: items.length > 0 ? 15.00 : 0, 
            total: (total + (items.length > 0 ? 15 : 0)).toFixed(2)
        });
    } catch (err) {
        console.error('Cart Fetch Error:', err);
        res.status(500).json({ message: "Error fetching cart" });
    }
});

router.post('/add', async (req, res) => {
    try {
        const { itemId, quantity = 1 } = req.body;
        
        // Validate item existence
        const result = await db.query('SELECT id FROM menu_items WHERE id = $1', [itemId]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Item not found" });

        const existing = global.MOCK_CART.find(x => x.item_id === itemId);
        if (existing) {
            existing.quantity += parseInt(quantity);
        } else {
            global.MOCK_CART.push({ cartId: Date.now(), item_id: itemId, quantity: parseInt(quantity) });
        }

        res.json({ success: true, message: "Added to cart" });
    } catch (err) {
        res.status(500).json({ message: "Error adding to cart" });
    }
});

router.post('/remove', (req, res) => {
    const { itemId, removeAll = false } = req.body;
    
    const existingIndex = global.MOCK_CART.findIndex(x => x.item_id === itemId);
    if (existingIndex > -1) {
        if (removeAll || global.MOCK_CART[existingIndex].quantity <= 1) {
            global.MOCK_CART.splice(existingIndex, 1);
        } else {
            global.MOCK_CART[existingIndex].quantity -= 1;
        }
    }

    res.json({ success: true });
});

router.post('/clear', (req, res) => {
    global.MOCK_CART = [];
    res.json({ success: true, message: "Selection cleared" });
});

module.exports = router;
