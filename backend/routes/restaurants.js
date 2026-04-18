const express = require('express');
const router = express.Router();
const db = require('../db');

// Get All Restaurants
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM restaurants ORDER BY rating DESC');
        const restaurants = result.rows.map(r => ({ 
            ...r, 
            image: r.image_url,
            priceForOne: r.price_for_one,
            time: r.delivery_time,
            isVeg: r.is_veg,
            isPremium: r.is_premium,
            hasOffer: r.has_offer,
            offerText: r.offer_text
        }));
        res.json(restaurants);
    } catch (err) {
        console.error('Fetch Restaurants Error:', err);
        res.status(500).json({ message: "Error fetching establishments" });
    }
});

// Get Single Restaurant Details
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM restaurants WHERE id = $1', [req.params.id]);
        const r = result.rows[0];
        
        if (!r) return res.status(404).json({ message: "Establishment not found" });
        
        res.json({ 
            ...r, 
            image: r.image_url,
            priceForOne: r.price_for_one,
            time: r.delivery_time,
            isVeg: r.is_veg,
            isPremium: r.is_premium,
            hasOffer: r.has_offer,
            offerText: r.offer_text
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching details" });
    }
});

// Get Menu Grouped
router.get('/:id/menu', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM menu_items WHERE restaurant_id = $1', [req.params.id]);
        const items = result.rows;
        
        const categories = {
            "Chef's Signatures": [],
            "House Specials": [],
            "Accompaniments": []
        };

        items.forEach((item, index) => {
            const mappedItem = { 
                ...item, 
                image: item.image_url,
                price: parseFloat(item.price),
                isVeg: item.is_veg
            };
            
            // Distribute items into logical category buckets for the frontend UI
            if (index < 6) categories["Chef's Signatures"].push(mappedItem);
            else if (index > 40) categories["Accompaniments"].push(mappedItem);
            else categories["House Specials"].push(mappedItem);
        });

        const finalCategories = {};
        for (let key in categories) {
             if(categories[key].length > 0) finalCategories[key] = categories[key];
        }
        
        res.json(finalCategories);
    } catch (err) {
        console.error('Fetch Menu Error:', err);
        res.status(500).json({ message: "Error fetching menu" });
    }
});

module.exports = router;
