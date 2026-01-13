require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- LOGGING MIDDLEWARE (Agar kelihatan di terminal saat ada Request) ---
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 📡 Incoming Request: ${req.method} ${req.url}`);
    next();
});

// STRICT FIX: Always use 127.0.0.1 for local VPS MySQL
const dbHost = '127.0.0.1';

const pool = mysql.createPool({
    host: dbHost,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartstock_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helpers
const toCamel = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
const toSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const formatRow = (row) => {
    const newRow = {};
    for (const key in row) {
        const camelKey = toCamel(key);
        let val = row[key];
        if (['alternativeUnits', 'items', 'photos'].includes(camelKey) && typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) { val = []; }
        }
        newRow[camelKey] = val;
    }
    return newRow;
};

// Routes
app.get('/', (req, res) => {
    console.log("✅ Root endpoint hit");
    res.send('SmartStock API Running...');
});

app.get('/api/data', async (req, res) => {
    try {
        console.log("🔄 Fetching all data...");
        const [inventory] = await pool.query('SELECT * FROM inventory');
        const [transactions] = await pool.query('SELECT * FROM transactions');
        const [suppliers] = await pool.query('SELECT * FROM suppliers');
        const [users] = await pool.query('SELECT * FROM users');
        const [settingsRows] = await pool.query('SELECT * FROM settings');
        
        const settings = {};
        settingsRows.forEach(row => {
            let val = row.setting_value;
            try { val = JSON.parse(val); } catch (e) {}
            settings[row.setting_key] = val;
        });

        console.log("✅ Data fetched successfully");
        res.json({
            status: 'success',
            data: { 
                inventory: inventory.map(formatRow), 
                transactions: transactions.map(formatRow), 
                suppliers: suppliers.map(formatRow), 
                users: users.map(formatRow), 
                settings 
            }
        });
    } catch (error) {
        console.error("❌ Error fetching data:", error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.post('/api/sync', async (req, res) => {
    const { type, data } = req.body;
    console.log(`💾 Syncing data for: ${type}`);
    
    if (!type || !data) return res.status(400).json({ status: 'error', message: 'Missing data' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        if (type === 'settings') {
             await connection.query('DELETE FROM settings');
             if (Object.keys(data).length > 0) {
                const values = Object.keys(data).map(k => {
                    let val = data[k];
                    if (typeof val === 'object') val = JSON.stringify(val);
                    return [k, val];
                });
                await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES ?', [values]);
             }
        } else {
            // Validasi tabel untuk keamanan dasar
            const allowedTables = ['inventory', 'transactions', 'suppliers', 'users'];
            if (!allowedTables.includes(type)) throw new Error("Invalid table");

            await connection.query(`DELETE FROM ${type}`);
            if (data.length > 0) {
                const allKeys = new Set();
                data.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
                const colsCamel = Array.from(allKeys);
                const colsSnake = colsCamel.map(toSnake);
                
                if (colsSnake.length > 0) {
                    const placeholders = colsSnake.map(() => '?').join(', ');
                    const sql = `INSERT INTO ${type} (${colsSnake.join(', ')}) VALUES (${placeholders})`;
                    for (const item of data) {
                        const values = colsCamel.map(key => {
                            let val = item[key];
                            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                            if (val === undefined) val = null;
                            if (val instanceof Date) val = val.toISOString().slice(0, 19).replace('T', ' ');
                            return val;
                        });
                        await connection.query(sql, values);
                    }
                }
            }
        }
        await connection.commit();
        console.log("✅ Sync successful");
        res.json({ status: 'success' });
    } catch (error) {
        await connection.rollback();
        console.error("❌ Sync failed:", error.message);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        connection.release();
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));