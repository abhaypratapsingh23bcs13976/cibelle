-- Cibelle Luxury Platform Schema
-- Optimized for PostgreSQL 18.0+

-- 1. Create Database (Run manually if needed: CREATE DATABASE cibelle;)

DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(50) DEFAULT 'CUSTOMER', -- 'CUSTOMER', 'ADMIN', 'RESTAURANT'
    status VARCHAR(50) DEFAULT 'PENDING',  -- 'PENDING', 'APPROVED', 'REJECTED'
    membership_tier VARCHAR(20) DEFAULT 'silver', -- 'silver', 'gold', 'elite'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Restaurants Table
DROP TABLE IF EXISTS restaurants CASCADE;
CREATE TABLE IF NOT EXISTS restaurants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    cuisine VARCHAR(100),
    rating DECIMAL(3,2),
    delivery_time VARCHAR(50),
    price_for_one DECIMAL(10,2),
    tag VARCHAR(255),
    story TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_veg BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    has_offer BOOLEAN DEFAULT FALSE,
    offer_text VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS menu_items CASCADE;
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    category VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    is_veg BOOLEAN DEFAULT FALSE
);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    restaurant_id VARCHAR(50) REFERENCES restaurants(id),
    items JSONB NOT NULL, -- Array of objects: {id, name, price, quantity}
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PLACED', -- 'PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
    delivery_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX idx_menu_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_users_email ON users(email);

-- 6. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restaurant_id)
);

-- 7. Private Dining Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id VARCHAR(50) REFERENCES restaurants(id),
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    guests INTEGER NOT NULL,
    occasion VARCHAR(100),
    menu_type VARCHAR(50),
    selected_dishes JSONB, -- Array of curated dishes
    special_requests TEXT,
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    order_id INTEGER REFERENCES orders(id), -- If food order
    booking_id INTEGER REFERENCES bookings(id), -- If private dining
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_provider VARCHAR(50) DEFAULT 'razorpay',
    provider_order_id TEXT,
    provider_payment_id TEXT,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'
    transaction_type VARCHAR(50), -- 'ORDER', 'BOOKING', 'MEMBERSHIP'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Payment Logs
CREATE TABLE IF NOT EXISTS payment_logs (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id),
    event_type VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for payment lookups
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_provider_order ON payments(provider_order_id);
