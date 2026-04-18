const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/reservations_database.json');

function readDB() {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// GET /api/reservations — list all (or user-filtered)
router.get('/', (req, res) => {
    const db = readDB();
    // In a real app, filter by userId from auth token
    res.json(db.reservations);
});

// POST /api/reservations — create a new reservation
router.post('/', (req, res) => {
    const { restaurantId, restaurantName, date, timeSlot, guests, occasion, menuType, specialRequests } = req.body;

    if (!restaurantId || !date || !timeSlot || !guests || !occasion) {
        return res.status(400).json({ error: 'Missing required reservation fields.' });
    }

    const db = readDB();

    const newReservation = {
        id: `RES-${Date.now()}`,
        restaurantId,
        restaurantName,
        date,
        timeSlot,
        guests,
        occasion,
        menuType: menuType || 'Custom Selection',
        specialRequests: specialRequests || '',
        status: 'confirmed',
        createdAt: new Date().toISOString()
    };

    db.reservations.push(newReservation);
    writeDB(db);

    res.status(201).json({ success: true, reservation: newReservation });
});

// DELETE /api/reservations/:id — cancel a reservation
router.delete('/:id', (req, res) => {
    const db = readDB();
    const idx = db.reservations.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Reservation not found.' });
    db.reservations.splice(idx, 1);
    writeDB(db);
    res.json({ success: true });
});

module.exports = router;
