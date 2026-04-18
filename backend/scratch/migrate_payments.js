const db = require('../db');

async function migrate() {
    console.log('🚀 Starting Luxury Payment Migration...');
    
    const queries = [
        `-- 7. Private Dining Bookings Table
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            restaurant_id VARCHAR(50) REFERENCES restaurants(id),
            date DATE NOT NULL,
            time_slot VARCHAR(50) NOT NULL,
            guests INTEGER NOT NULL,
            occasion VARCHAR(100),
            menu_type VARCHAR(50),
            selected_dishes JSONB, 
            special_requests TEXT,
            total_amount DECIMAL(10,2),
            status VARCHAR(50) DEFAULT 'PENDING',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `-- 8. Payments Table
        CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            order_id INTEGER REFERENCES orders(id),
            booking_id INTEGER REFERENCES bookings(id),
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'INR',
            payment_provider VARCHAR(50) DEFAULT 'razorpay',
            provider_order_id TEXT,
            provider_payment_id TEXT,
            status VARCHAR(50) DEFAULT 'PENDING',
            transaction_type VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `-- 9. Payment Logs
        CREATE TABLE IF NOT EXISTS payment_logs (
            id SERIAL PRIMARY KEY,
            payment_id INTEGER REFERENCES payments(id),
            event_type VARCHAR(100),
            payload JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id)`,
        `CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON payments(provider_order_id)`
    ];

    for (const q of queries) {
        try {
            await db.query(q);
            console.log('✅ Executed successfully:', q.split('\n')[0]);
        } catch (err) {
            console.error('❌ Migration Error:', err.message);
        }
    }

    console.log('🎉 Migration Completed.');
    process.exit(0);
}

migrate();
