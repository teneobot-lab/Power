require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'smartstock',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'smartstock_pass',
    database: process.env.DB_NAME || 'smartstock_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- ROUTES ---

// 1. Root Route (Health Check)
app.get('/', (req, res) => {
    res.send('✅ SmartStock Backend is Running on Port ' + PORT);
});

// 2. Main Data Endpoint
app.get('/api/data', async (req, res) => {
    try {
        const [inventory] = await pool.query('SELECT * FROM inventory');
        const [transactions] = await pool.query('SELECT * FROM transactions');
        const [suppliers] = await pool.query('SELECT * FROM suppliers');
        const [users] = await pool.query('SELECT * FROM users');
        const [settingsRows] = await pool.query('SELECT * FROM settings');
        
        const settings = {};
        settingsRows.forEach(row => {
            let val = row.setting_value;
            try { 
                if (val && (val.startsWith('[') || val.startsWith('{'))) {
                    val = JSON.parse(val); 
                }
            } catch (e) {}
            settings[row.setting_key] = val;
        });

        // Helper to format rows
        const formatRow = (row) => {
            const newRow = {};
            for (const key in row) {
                const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()); // snake to camel
                let val = row[key];
                if (['alternativeUnits', 'items', 'photos'].includes(camelKey) && typeof val === 'string') {
                    try { val = JSON.parse(val); } catch (e) { val = []; }
                }
                newRow[camelKey] = val;
            }
            return newRow;
        };

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
        console.error("Fetch Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 3. Sync Endpoint
app.post('/api/sync', async (req, res) => {
    const { type, data } = req.body;
    
    if (!type || !data) return res.status(400).json({ status: 'error', message: 'Missing type or data' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Helper: camel to snake
        const toSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

        if (type === 'settings') {
             await connection.query('DELETE FROM settings');
             if (Object.keys(data).length > 0) {
                const values = Object.keys(data).map(k => {
                    let val = data[k];
                    if (typeof val === 'object') val = JSON.stringify(val);
                    return [k, val];
                });
                if(values.length > 0) {
                    await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES ?', [values]);
                }
             }
        } else {
            const allowedTables = ['inventory', 'transactions', 'suppliers', 'users'];
            if (!allowedTables.includes(type)) throw new Error(`Invalid table name: ${type}`);

            await connection.query(`DELETE FROM ${type}`);

            if (data.length > 0) {
                const firstItem = data[0];
                const camelKeys = Object.keys(firstItem);
                const snakeKeys = camelKeys.map(toSnake);
                const placeholders = snakeKeys.map(() => '?').join(', ');
                const sql = `INSERT INTO ${type} (${snakeKeys.join(', ')}) VALUES (${placeholders})`;

                for (const item of data) {
                    const values = camelKeys.map(key => {
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
        await connection.commit();
        res.json({ status: 'success' });
    } catch (error) {
        await connection.rollback();
        console.error("Sync Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        connection.release();
    }
});

// 4. Fallback for 404
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: `Route not found: ${req.url}` });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`   - http://localhost:${PORT}`);
    console.log(`   - http://127.0.0.1:${PORT}`);
    console.log('Routes: GET /, GET /api/data, POST /api/sync\n');
});