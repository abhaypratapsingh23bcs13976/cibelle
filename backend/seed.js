const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function seedDatabase() {
    try {
        console.log("🌱 Starting Dynamic Database Seed...");
        
        // 0. Apply schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log("📜 Schema applied.");

        // Load JSON Data
        const dataPath = path.join(__dirname, 'data', 'cibelle_database.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        console.log(`📊 Found ${data.restaurants.length} restaurants and ${data.menuItems.length} menu items.`);

        // 1. Clear existing data
        await pool.query('DELETE FROM menu_items');
        await pool.query('DELETE FROM restaurants');
        console.log("🧹 Cleared old records.");

        // 2. Insert Restaurants
        for (const r of data.restaurants) {
            await pool.query(`
                INSERT INTO restaurants (id, name, image_url, cuisine, rating, delivery_time, price_for_one, tag, story, is_veg, is_premium, has_offer, offer_text) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                r.id, 
                r.name, 
                r.image_url, 
                r.cuisine, 
                r.rating, 
                r.time, 
                r.priceForOne, 
                r.tag, 
                r.story,
                r.isVeg || false,
                r.isPremium || false,
                r.hasOffer || false,
                r.offerText || null
            ]);
        }
        console.log("✅ Restaurants seeded.");

        // 3. Insert Menu Items
        for (const item of data.menuItems) {
            await pool.query(`
                INSERT INTO menu_items (restaurant_id, name, description, price, image_url, is_veg) 
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                item.restaurant_id, 
                item.name, 
                item.description, 
                item.price, 
                item.image_url,
                item.is_veg || false
            ]);
        }
        console.log("✅ Menu items seeded.");

        console.log("🌟 Seed complete! Platform is now synchronized with localized Indian data.");

    } catch (err) {
        console.error("❌ Seed error:", err);
    } finally {
        pool.end();
    }
}

seedDatabase();
