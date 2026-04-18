const db = require('../db');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });


async function migrate() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS addresses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                label VARCHAR(50) DEFAULT 'Home',
                address_type VARCHAR(20) DEFAULT 'home',
                full_address TEXT NOT NULL,
                city VARCHAR(100),
                state VARCHAR(100),
                postal_code VARCHAR(20),
                landmark VARCHAR(255),
                is_default BOOLEAN DEFAULT FALSE,
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default)`);
        console.log('✅ addresses table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

// Give pool time to connect
setTimeout(migrate, 1000);
