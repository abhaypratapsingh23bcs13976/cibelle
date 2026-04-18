const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function seed() {
    try {
        console.log('🚀 Starting PostgreSQL Migration...');

        // 1. Read JSON Data
        const restDataPath = path.join(__dirname, '..', 'data', 'cibelle_database.json');
        const userDataPath = path.join(__dirname, '..', 'data', 'users_database.json');

        const db = JSON.parse(fs.readFileSync(restDataPath, 'utf8'));
        const users = JSON.parse(fs.readFileSync(userDataPath, 'utf8')).users || [];

        // 2. Clear Existing Data (Careful!)
        console.log('🧹 Clearing existing data...');
        await pool.query('TRUNCATE orders, menu_items, restaurants, users RESTART IDENTITY CASCADE');

        // 3. Seed Users
        console.log(`👤 Seeding ${users.length} users...`);
        for (const u of users) {
             await pool.query(
                'INSERT INTO users (name, email, password, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
                [u.name, u.email, u.password, u.role || 'CUSTOMER', u.status || 'APPROVED', u.created_at || new Date()]
            );
        }

        // 4. Seed Restaurants
        console.log(`🍽️  Seeding ${db.restaurants.length} restaurants...`);
        for (const r of db.restaurants) {
            await pool.query(
                `INSERT INTO restaurants (id, name, image_url, cuisine, rating, delivery_time, price_range, tag, story, is_featured) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [r.id, r.name, r.image_url, r.cuisine, r.rating, r.time, r.priceForOne?.toString(), r.tag, r.story, r.isPremium || false]
            );
        }

        // 5. Seed Menu Items
        console.log(`📜 Seeding ${db.menuItems.length} menu items...`);
        // Batching for performance
        const menuQuery = `INSERT INTO menu_items (restaurant_id, name, description, price, image_url, category, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        
        for (const m of db.menuItems) {
            await pool.query(menuQuery, [
                m.restaurant_id, 
                m.name, 
                m.description, 
                parseFloat(m.price) || 0, 
                m.image_url, 
                m.category || 'Main', 
                m.is_available ?? true
            ]);
        }

        console.log('✅ Migration Highly Successful!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
}

seed();
