const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const favoriteRoutes = require('./routes/favorites');
const reservationRoutes = require('./routes/reservations');
const paymentRoutes = require('./routes/payments');
const conciergeRoutes = require('./routes/concierge');
const addressRoutes = require('./routes/addresses');
const path = require('path');

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://checkout.razorpay.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://www.transparenttextures.com", "https://grainy-gradients.vercel.app", "blob:", "https://api.razorpay.com"],
            connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "https://nominatim.openstreetmap.org", "https://cdn.socket.io", "https://lumberjack.razorpay.com", "https://api.razorpay.com"],
            frameSrc: ["'self'", "https://api.razorpay.com"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/concierge', conciergeRoutes);
app.use('/api/addresses', addressRoutes);

// Static Frontend Serving with Clean Routes
const frontendPath = path.join(__dirname, '..', 'frontend');

// 1. Specific Page Routes (Clean URLs)
const pages = [
    { route: '/', file: 'index.html' },
    { route: '/login', file: 'login.html' },
    { route: '/register', file: 'register.html' },
    { route: '/restaurant', file: 'restaurant.html' },
    { route: '/delivery', file: 'delivery.html' },
    { route: '/admin', file: 'admin.html' },
    { route: '/dashboard', file: 'dashboard.html' },
    { route: '/profile', file: 'profile.html' },
    { route: '/orders', file: 'orders.html' },
    { route: '/saved', file: 'saved.html' },
    { route: '/membership', file: 'membership.html' },
    { route: '/settings', file: 'settings.html' },
    { route: '/private-dining', file: 'private-dining.html' }
];

pages.forEach(p => {
    app.get(p.route, (req, res) => {
        res.sendFile(path.join(frontendPath, p.file));
    });
});

// 2. Static Files (CSS, JS, Images)
app.use(express.static(frontendPath));

app.get('/api', (req, res) => {
    res.json({ message: "Welcome to Cibelle API - Luxury Food Delivery" });
});

// Database Connection
const pool = require('./db');

// Socket.io for Real-time Updates
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);
    
    socket.on('order_status_update', (data) => {
        io.emit('status_changed', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Cibelle Server running on port ${PORT}`);
});
