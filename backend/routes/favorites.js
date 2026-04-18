const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Get User's Saved Restaurants
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT f.restaurant_id, r.name, r.image_url as restaurant_image, r.cuisine as restaurant_cuisine, f.created_at as saved_at
             FROM favorites f
             JOIN restaurants r ON f.restaurant_id = r.id
             WHERE f.user_id = $1`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch Favorites Error:', err);
        res.status(500).json({ message: "Error fetching saved establishments" });
    }
});

// Save a Restaurant
router.post('/add', authenticateToken, async (req, res) => {
    try {
        const { restaurant_id } = req.body;
        
        if (!restaurant_id) return res.status(400).json({ message: "Restaurant ID required" });

        await db.query(
            'INSERT INTO favorites (user_id, restaurant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.user.id, restaurant_id]
        );

        res.status(201).json({ message: "Saved to favorites" });
    } catch (err) {
        console.error('Add Favorite Error:', err);
        res.status(500).json({ message: "Error saving to favorites" });
    }
});

// Remove from Favorites
router.delete('/:restaurant_id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM favorites WHERE user_id = $1 AND restaurant_id = $2 RETURNING id',
            [req.user.id, req.params.restaurant_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Not found in favorites" });
        }

        res.json({ message: "Removed from favorites" });
    } catch (err) {
        console.error('Remove Favorite Error:', err);
        res.status(500).json({ message: "Error removing from favorites" });
    }
});

module.exports = router;
