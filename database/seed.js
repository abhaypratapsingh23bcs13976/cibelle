const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function seedDatabase() {
    try {
        console.log("🌱 Starting Database Seed...");

        // 1. Create a demo user for carts
        const userRes = await pool.query(`
            INSERT INTO users (email, password_hash, name, role) 
            VALUES ('demo@cibelle.com', 'hashed123', 'Demo Member', 'CUSTOMER')
            ON CONFLICT (email) DO NOTHING
            RETURNING id;
        `);

        // Get the demo user id (or find it if already exists)
        let userId;
        if (userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
        } else {
            const existingUser = await pool.query(`SELECT id FROM users WHERE email = 'demo@cibelle.com'`);
            userId = existingUser.rows[0].id;
        }

        // 2. Clear existing restaurants/menu items for clean state
        await pool.query('DELETE FROM restaurants');

        // 3. Insert Restaurants
        const restResult = await pool.query(`
            INSERT INTO restaurants (name, slug, description, cuisine, image_url, avg_rating, delivery_fee, is_approved) VALUES 
            ('The Golden Spoon', 'the-golden-spoon', 'Three-Michelin-star experience led by Chef Adrian Thorne.', 'MODERN FRENCH', 'https://images.unsplash.com/photo-1550966842-28df09871629?auto=format&fit=crop&q=80&w=800', 4.9, 15.00, true),
            ('Azure Lounge', 'azure-lounge', 'Coastal delicacies curated with seasonal ingredients.', 'MEDITERRANEAN', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800', 4.7, 8.50, true),
            ('Velvet Plate', 'velvet-plate', 'Artisanal cuts of the worlds finest wagyu.', 'STEAKHOUSE', 'https://images.unsplash.com/photo-1546241072-48010ad28abb?auto=format&fit=crop&q=80&w=800', 4.8, 20.00, true)
            RETURNING id, name;
        `);

        const restaurants = restResult.rows;

        // 4. Insert Menu Items grouped by pseudo categories
        for (let r of restaurants) {
            if (r.name === 'The Golden Spoon') {
                await pool.query(`
                    INSERT INTO menu_items (restaurant_id, name, description, price, image_url, is_veg) VALUES 
                    ($1, 'Truffle Tagliatelle', 'Hand-rolled pasta, winter black truffle.', 42.00, 'https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&q=80&w=600', true),
                    ($1, 'Foie Gras Tartlet', 'Caramelized onion, fig reduction.', 38.00, 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?auto=format&fit=crop&q=80&w=600', false),
                    ($1, 'Duck a l''Orange', 'Confit leg, orange glacé, parsnip purée.', 65.00, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600', false),
                    ($1, 'Vanilla Bean Mille-Feuille', 'Madagascar vanilla cream, crisp puff pastry.', 25.00, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=600', true)
                `, [r.id]);
            } else if (r.name === 'Azure Lounge') {
                await pool.query(`
                    INSERT INTO menu_items (restaurant_id, name, description, price, image_url, is_veg) VALUES 
                    ($1, 'Blue Lobster', 'Brittany lobster, saffron emulsion.', 65.00, 'https://images.unsplash.com/photo-1534080564617-382d6241e12e?auto=format&fit=crop&q=80&w=600', false),
                    ($1, 'Burrata & Heirloom Tomato', 'Aged balsamic, micro basil.', 28.00, 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?auto=format&fit=crop&q=80&w=600', true)
                `, [r.id]);
            } else if (r.name === 'Velvet Plate') {
                 await pool.query(`
                    INSERT INTO menu_items (restaurant_id, name, description, price, image_url, is_veg) VALUES 
                    ($1, 'A5 Wagyu Ribeye', '8oz, charcoal grilled, marrow butter.', 180.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600', false),
                    ($1, 'Truffle Mac & Cheese', '5-cheese blend, shaved truffles.', 35.00, 'https://images.unsplash.com/photo-1612871689253-9ce40cdb9ae0?auto=format&fit=crop&q=80&w=600', true)
                `, [r.id]);
            }
        }

        console.log("✅ Seed complete!");

    } catch (err) {
        console.error("❌ Seed error:", err);
    } finally {
        pool.end();
    }
}

seedDatabase();
