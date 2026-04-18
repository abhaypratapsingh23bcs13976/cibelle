/**
 * Cibelle — Addresses API Route
 * Full CRUD for user dining addresses + default management.
 * PostgreSQL-backed, JWT-protected.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

/**
 * GET /api/addresses
 * Retrieve all addresses for the authenticated user.
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, addresses: result.rows });
    } catch (err) {
        console.error('GET /addresses error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch addresses.' });
    }
});

/**
 * POST /api/addresses
 * Add a new address for the authenticated user.
 * If is_default = true, unset all other defaults first.
 */
router.post('/', authenticateToken, async (req, res) => {
    const { label, address_type, full_address, city, state, postal_code, landmark, is_default, latitude, longitude } = req.body;

    if (!full_address) {
        return res.status(400).json({ success: false, message: 'Full address is required.' });
    }

    try {
        // If setting as default, clear existing defaults first
        if (is_default) {
            await db.query(
                `UPDATE addresses SET is_default = FALSE WHERE user_id = $1`,
                [req.user.id]
            );
        }

        const result = await db.query(
            `INSERT INTO addresses 
             (user_id, label, address_type, full_address, city, state, postal_code, landmark, is_default, latitude, longitude, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             RETURNING *`,
            [
                req.user.id,
                label || 'Home',
                address_type || 'home',
                full_address,
                city || null,
                state || null,
                postal_code || null,
                landmark || null,
                is_default || false,
                latitude || null,
                longitude || null
            ]
        );

        res.status(201).json({ success: true, address: result.rows[0] });
    } catch (err) {
        console.error('POST /addresses error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to save address.' });
    }
});

/**
 * PUT /api/addresses/:id
 * Update an existing address. Only the owner may update.
 */
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { label, address_type, full_address, city, state, postal_code, landmark, is_default, latitude, longitude } = req.body;

    if (!full_address) {
        return res.status(400).json({ success: false, message: 'Full address is required.' });
    }

    try {
        // Verify ownership
        const check = await db.query(
            `SELECT id FROM addresses WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );
        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Address not found or access denied.' });
        }

        // If setting as default, clear others first
        if (is_default) {
            await db.query(
                `UPDATE addresses SET is_default = FALSE WHERE user_id = $1`,
                [req.user.id]
            );
        }

        const result = await db.query(
            `UPDATE addresses
             SET label = $1, address_type = $2, full_address = $3, city = $4, state = $5,
                 postal_code = $6, landmark = $7, is_default = $8, latitude = $9, longitude = $10, updated_at = NOW()
             WHERE id = $11 AND user_id = $12
             RETURNING *`,
            [
                label || 'Home',
                address_type || 'home',
                full_address,
                city || null,
                state || null,
                postal_code || null,
                landmark || null,
                is_default || false,
                latitude || null,
                longitude || null,
                id,
                req.user.id
            ]
        );

        res.json({ success: true, address: result.rows[0] });
    } catch (err) {
        console.error('PUT /addresses/:id error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to update address.' });
    }
});

/**
 * DELETE /api/addresses/:id
 * Delete an address. Only the owner may delete.
 * If deleting the default, promote the next address.
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Verify ownership and get address info
        const check = await db.query(
            `SELECT id, is_default FROM addresses WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );
        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Address not found or access denied.' });
        }

        const wasDefault = check.rows[0].is_default;

        await db.query(`DELETE FROM addresses WHERE id = $1`, [id]);

        // If deleted address was the default, promote the most recent remaining one
        if (wasDefault) {
            await db.query(
                `UPDATE addresses SET is_default = TRUE, updated_at = NOW()
                 WHERE id = (SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)`,
                [req.user.id]
            );
        }

        res.json({ success: true, message: 'Address removed from your sanctuaries.' });
    } catch (err) {
        console.error('DELETE /addresses/:id error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to delete address.' });
    }
});

/**
 * PATCH /api/addresses/:id/default
 * Set a specific address as the user's default.
 * Unsets all other defaults atomically.
 */
router.patch('/:id/default', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Verify ownership
        const check = await db.query(
            `SELECT id FROM addresses WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );
        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Address not found or access denied.' });
        }

        // Unset all current defaults for this user
        await db.query(
            `UPDATE addresses SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1`,
            [req.user.id]
        );

        // Set the new default
        const result = await db.query(
            `UPDATE addresses SET is_default = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );

        res.json({ success: true, address: result.rows[0] });
    } catch (err) {
        console.error('PATCH /addresses/:id/default error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to set default address.' });
    }
});

module.exports = router;
