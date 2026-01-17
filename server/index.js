
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// =======================
// DATABASE CONFIG
// =======================
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartstock_db',
    dateStrings: true
};

let pool;
let dbConnected = false;

// =======================
// INIT DATABASE
// =======================
async function initDb() {
    try {
        pool = mysql.createPool(dbConfig);
        const conn = await pool.getConnection();
        console.log('✅ DATABASE CONNECTED');

        dbConnected = true;

        // =======================
        // CREATE DEFAULT ADMIN (ONLY IF NOT EXISTS)
        // password: admin22
        // =======================
        const ADMIN_HASH = crypto
            .createHash('sha256')
            .update('admin22')
            .digest('hex');

        const [rows] = await conn.query(
            "SELECT id FROM users WHERE username = 'admin'"
        );

        if (rows.length === 0) {
            console.log('⚠️ Admin not found, creating default admin...');
            await conn.query(
                `INSERT INTO users (name, username, password, role, status, last_login)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                ['Admin Utama', 'admin', ADMIN_HASH, 'admin', 'active']
            );
        }

        conn.release();
    } catch (err) {
        console.error('❌ DB ERROR:', err.message);
        dbConnected = false;
        setTimeout(initDb, 5000);
    }
}

// =======================
// UTILS
// =======================
const toCamel = (row) => {
    const res = {};
    for (let key in row) {
        const camel = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        let val = row[key];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try { val = JSON.parse(val); } catch {}
        }
        res[camel] = val;
    }
    return res;
};

const checkDb = (req, res, next) => {
    if (!dbConnected || !pool) {
        return res.status(503).json({ status: 'error', message: 'Database offline' });
    }
    next();
};

// =======================
// ROUTES
// =======================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        database: dbConnected ? 'connected' : 'offline'
    });
});

// =======================
// LOGIN
// =======================
app.post('/api/login', checkDb, async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ? LIMIT 1',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'User tidak ditemukan' });
        }

        const user = rows[0];
        const dbPassword = user.password || '';

        // 1️⃣ Plain text (legacy)
        if (dbPassword === password) {
            await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
            return res.json({ status: 'success', data: toCamel(user) });
        }

        // 2️⃣ SHA-256
        const inputHash = crypto
            .createHash('sha256')
            .update(password)
            .digest('hex');

        if (dbPassword === inputHash) {
            await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
            return res.json({ status: 'success', data: toCamel(user) });
        }

        return res.status(401).json({ status: 'error', message: 'Password salah' });

    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// =======================
// DATA API
// =======================
app.get('/api/data', checkDb, async (req, res) => {
    try {
        const [inventory] = await pool.query('SELECT * FROM inventory');
        const [transactions] = await pool.query('SELECT * FROM transactions ORDER BY timestamp DESC');
        const [users] = await pool.query('SELECT * FROM users');

        res.json({
            status: 'success',
            data: {
                inventory: inventory.map(toCamel),
                transactions: transactions.map(toCamel),
                users: users.map(toCamel)
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// =======================
// START SERVER
// =======================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});

initDb();
