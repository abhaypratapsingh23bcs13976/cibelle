const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Ensure refined identity columns exist (safe migration)
(async () => {
    try {
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100)`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(20) DEFAULT 'silver'`);
        
        // Settings & Preferences
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_concierge BOOLEAN DEFAULT FALSE`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS offer_notifications BOOLEAN DEFAULT TRUE`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en'`);

        // Sessions Tracking
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL,
                device_info TEXT,
                ip_address VARCHAR(45),
                last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // One-time migration: split existing 'name' into components if they are null
        const result = await db.query(`SELECT id, name FROM users WHERE first_name IS NULL AND name IS NOT NULL`);
        for (const u of result.rows) {
            const parts = u.name.trim().split(/\s+/);
            const first = parts[0] || '';
            const last = parts.length > 1 ? parts[parts.length - 1] : '';
            const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
            
            await db.query(
                `UPDATE users SET first_name = $1, middle_name = $2, last_name = $3 WHERE id = $4`,
                [first, middle, last, u.id]
            );
        }
    } catch (e) { 
        console.error('Migration Error:', e.message);
    }
})();

// Sign Up
router.post('/signup', async (req, res) => {
    try {
        const { name, firstName, lastName, email, password, role } = req.body;
        
        // Ensure at least one form of identity is provided
        const hasIdentity = name || (firstName && lastName);

        if (!hasIdentity || !email || !password) {
            return res.status(400).json({ message: "Identity (Name), Email, and Password are required" });
        }

        // Check if user exists
        const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // We still populate 'name' for backwards compatibility
        const fullName = `${req.body.firstName || ''} ${req.body.middleName ? req.body.middleName + ' ' : ''}${req.body.lastName || ''}`.trim();

        const result = await db.query(
            `INSERT INTO users (name, first_name, middle_name, last_name, email, password, role, status, membership_tier) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING id, first_name, middle_name, last_name, email, role, membership_tier`,
            [
                fullName || name, 
                req.body.firstName || name.split(' ')[0], 
                req.body.middleName || '', 
                req.body.lastName || name.split(' ').slice(1).join(' '),
                email, 
                hashedPassword, 
                role || 'CUSTOMER', 
                'APPROVED',
                req.body.tier || 'silver'
            ]
        );

        const newUser = result.rows[0];
        // Cast ID to string for frontend compatibility
        const userId = newUser.id.toString();

        const token = jwt.sign(
            { id: userId, role: newUser.role }, 
            process.env.JWT_SECRET || 'luxury_secret', 
            { expiresIn: '7d' }
        );

        // Record Session
        await db.query(
            `INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address) VALUES ($1, $2, $3, $4)`,
            [userId, token.substring(token.length - 20), req.get('User-Agent'), req.ip]
        );
        
        res.status(201).json({ 
            message: "Membership granted", 
            token, 
            user: { ...newUser, id: userId } 
        });
    } catch(err) {
        console.error('Signup Error:', err);
        res.status(500).json({ message: "Server error", err: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const userId = user.id.toString();
        const token = jwt.sign(
            { id: userId, role: user.role }, 
            process.env.JWT_SECRET || 'luxury_secret', 
            { expiresIn: '7d' }
        );
        
        // Record Session
        await db.query(
            `INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address) 
             VALUES ($1, $2, $3, $4)`,
            [userId, token.substring(token.length - 20), req.get('User-Agent'), req.ip]
        );
        
        res.json({ 
            token, 
            user: { 
                id: userId, 
                name: user.name, 
                first_name: user.first_name,
                middle_name: user.middle_name,
                last_name: user.last_name,
                role: user.role,
                membership_tier: user.membership_tier
            } 
        });
    } catch(err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: "Server error" });
    }
});

// List User Sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, device_info, ip_address, last_active, created_at 
             FROM user_sessions WHERE user_id = $1 ORDER BY last_active DESC`,
            [req.user.id]
        );
        res.json({ sessions: result.rows });
    } catch (err) {
        res.status(500).json({ message: "Error fetching sessions" });
    }
});

// Revoke Session
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM user_sessions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ message: "Session revoked" });
    } catch (err) {
        res.status(500).json({ message: "Error revoking session" });
    }
});

// Standardized profile retrieval
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, first_name, middle_name, last_name, email, role, status, phone, address, 
                    membership_tier, push_notifications, email_concierge, offer_notifications, preferred_language, created_at 
             FROM users WHERE id = $1`, 
            [req.user.id]
        );
        const user = result.rows[0];
        if (!user) return res.status(401).json({ message: "User account no longer exists" });
        res.json({ user: { ...user, id: user.id.toString() } });
    } catch (err) {
        console.error('Profile Retrieval Error [/me]:', err);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
});

// Update Profile — persists name components, phone, and address
router.patch('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, middleName, lastName, phone, address, tier } = req.body;
        
        // Legacy 'name' sync
        let nameUpdate = null;
        if (firstName || lastName) {
            nameUpdate = `${firstName || ''}${middleName ? ' ' + middleName : ''} ${lastName || ''}`.trim();
        }

        const result = await db.query(
            `UPDATE users 
             SET first_name  = COALESCE($1, first_name),
                 middle_name = COALESCE($2, middle_name),
                 last_name   = COALESCE($3, last_name),
                 name        = COALESCE($4, name),
                 phone       = COALESCE($5, phone),
                 address     = COALESCE($6, address),
                 membership_tier = COALESCE($7, membership_tier)
             WHERE id = $8
             RETURNING id, name, first_name, middle_name, last_name, email, role, phone, address, membership_tier, created_at`,
            [firstName || null, middleName || null, lastName || null, nameUpdate, phone || null, address || null, tier || null, req.user.id]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });

        const user = result.rows[0];
        res.json({ 
            message: "Profile updated successfully", 
            user: { ...user, id: user.id.toString() } 
        });
    } catch (err) {
        console.error('Profile Update Error [/profile]:', err);
        res.status(500).json({ message: "Error updating profile", detail: err.message });
    }
});

// Update Settings (Notifications/Language/Password)
router.patch('/settings', authenticateToken, async (req, res) => {
    try {
        const { 
            password, 
            pushNotifications, 
            emailConcierge, 
            offerNotifications, 
            language 
        } = req.body;
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
        }

        if (language) {
            await db.query('UPDATE users SET preferred_language = $1 WHERE id = $2', [language, req.user.id]);
        }

        const updateFields = [];
        const values = [];
        let count = 1;

        if (pushNotifications !== undefined) {
            updateFields.push(`push_notifications = $${count++}`);
            values.push(pushNotifications);
        }
        if (emailConcierge !== undefined) {
            updateFields.push(`email_concierge = $${count++}`);
            values.push(emailConcierge);
        }
        if (offerNotifications !== undefined) {
            updateFields.push(`offer_notifications = $${count++}`);
            values.push(offerNotifications);
        }

        if (updateFields.length > 0) {
            values.push(req.user.id);
            await db.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = $${count}`, values);
        }

        res.json({ message: "Settings updated successfully" });
    } catch (err) {
        console.error('Settings Update Error:', err);
        res.status(500).json({ message: "Error updating settings" });
    }
});

// Delete Account — cascades all related data safely
router.delete('/account', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // Step 1: Delete in reverse dependency order to avoid FK violations
        // Payment logs depend on payments, so cascade through payments is usually fine,
        // but we delete related rows explicitly for maximum safety.

        // Clear user sessions
        await db.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

        // Clear addresses (new table)
        await db.query('DELETE FROM addresses WHERE user_id = $1', [userId]).catch(() => {});

        // Clear favorites
        await db.query('DELETE FROM favorites WHERE user_id = $1', [userId]).catch(() => {});

        // Clear cart items if cart table exists
        await db.query('DELETE FROM cart WHERE user_id = $1', [userId]).catch(() => {});
        await db.query('DELETE FROM cart_items WHERE user_id = $1', [userId]).catch(() => {});

        // Clear payment logs linked to this user's payments
        await db.query(
            `DELETE FROM payment_logs WHERE payment_id IN (SELECT id FROM payments WHERE user_id = $1)`,
            [userId]
        ).catch(() => {});

        // Clear payments
        await db.query('DELETE FROM payments WHERE user_id = $1', [userId]).catch(() => {});

        // Clear bookings
        await db.query('DELETE FROM bookings WHERE user_id = $1', [userId]).catch(() => {});

        // Clear orders
        await db.query('DELETE FROM orders WHERE user_id = $1', [userId]).catch(() => {});

        // Clear concierge requests if they exist
        await db.query('DELETE FROM concierge_requests WHERE user_id = $1', [userId]).catch(() => {});

        // Step 2: Finally delete the user
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User account not found.' });
        }

        res.json({ success: true, message: 'Account permanently terminated.' });
    } catch (err) {
        console.error('Delete Account Error [userId=' + userId + ']:', err.message);
        res.status(500).json({ success: false, message: 'Failed to terminate account. Please contact support.', detail: err.message });
    }
});


module.exports = router;
