require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' })); // Allow frontend to access
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Logging Request untuk Debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] 📡 ${req.method} ${req.url}`);
    next();
});

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'smartstock',
    // FIX: Check undefined specifically to allow empty string password
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'smartstock_pass',
    database: process.env.DB_NAME || 'smartstock_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- HELPER FUNCTIONS ---
// Convert snake_case (DB) to camelCase (Frontend)
const toCamel = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
// Convert camelCase (Frontend) to snake_case (DB)
const toSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Format Row Helper (Parse JSON fields automatically)
const formatRow = (row) => {
    const newRow = {};
    for (const key in row) {
        const camelKey = toCamel(key);
        let val = row[key];
        
        // Handle JSON fields safely
        if (['alternativeUnits', 'items', 'photos'].includes(camelKey) && typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) { val = []; }
        }
        
        newRow[camelKey] = val;
    }
    return newRow;
};

// --- ROUTES ---

// 1. Root Check
app.get('/', (req, res) => {
    res.send('✅ SmartStock Backend is Running!');
});

// 2. Get All Data
app.get('/api/data', async (req, res) => {
    try {
        console.log("📥 Fetching all data...");
        const [inventory] = await pool.query('SELECT * FROM inventory');
        const [transactions] = await pool.query('SELECT * FROM transactions');
        const [suppliers] = await pool.query('SELECT * FROM suppliers');
        const [users] = await pool.query('SELECT * FROM users');
        const [settingsRows] = await pool.query('SELECT * FROM settings');
        
        const settings = {};
        settingsRows.forEach(row => {
            let val = row.setting_value;
            try { 
                // Try parse if it looks like JSON array/object
                if (val && (val.startsWith('[') || val.startsWith('{'))) {
                    val = JSON.parse(val); 
                }
            } catch (e) {}
            settings[row.setting_key] = val;
        });

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
        console.error("❌ Fetch Error:", error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 3. Sync Data (Save)
app.post('/api/sync', async (req, res) => {
    const { type, data } = req.body;
    console.log(`💾 Syncing table: ${type}`);
    
    if (!type || !data) return res.status(400).json({ status: 'error', message: 'Missing type or data' });

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
                if(values.length > 0) {
                    await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES ?', [values]);
                }
             }
        } else {
            const allowedTables = ['inventory', 'transactions', 'suppliers', 'users'];
            if (!allowedTables.includes(type)) throw new Error(`Invalid table name: ${type}`);

            // Full Replace Strategy (Delete All -> Insert All) for simplicity in sync mode
            await connection.query(`DELETE FROM ${type}`);

            if (data.length > 0) {
                // Determine columns dynamically from the first item
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
        console.error("❌ Sync Error:", error.message);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        connection.release();
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`👉 Local: http://localhost:${PORT}`);
});