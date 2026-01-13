require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Enable CORS for ALL origins to fix "Network Error" on Vercel/Localhost mismatch
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging Middleware (Cek terminal Anda untuk melihat request masuk)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Increase limit significantly for Base64 image sync
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartstock_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00'
});

// Helper: Convert Snake Case (DB) to Camel Case (Frontend)
const toCamel = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

// Helper: Convert Camel Case (Frontend) to Snake Case (DB)
const toSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Format Row Helper (DB -> Frontend)
const formatRow = (row) => {
    const newRow = {};
    for (const key in row) {
        const camelKey = toCamel(key);
        let val = row[key];
        // Ensure JSON columns are parsed if returned as strings
        if (['alternativeUnits', 'items', 'photos'].includes(camelKey) && typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) { val = []; }
        }
        newRow[camelKey] = val;
    }
    return newRow;
};

// --- ROUTES ---

// Health Check
app.get('/', (req, res) => {
    res.send('SmartStock API is running...');
});

// GET All Data
app.get('/api/data', async (req, res) => {
    try {
        const [inventory] = await pool.query('SELECT * FROM inventory');
        const [transactions] = await pool.query('SELECT * FROM transactions');
        const [suppliers] = await pool.query('SELECT * FROM suppliers');
        const [users] = await pool.query('SELECT * FROM users');
        const [settingsRows] = await pool.query('SELECT * FROM settings');

        // Process Settings into Object
        const settings = {};
        settingsRows.forEach(row => {
            let val = row.setting_value;
            try { val = JSON.parse(val); } catch (e) {}
            settings[row.setting_key] = val;
        });

        res.json({
            status: 'success',
            data: {
                inventory: inventory.map(formatRow),
                transactions: transactions.map(formatRow),
                suppliers: suppliers.map(formatRow),
                users: users.map(formatRow),
                settings: settings
            }
        });
    } catch (error) {
        console.error('Fetch Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// SYNC Data
app.post('/api/sync', async (req, res) => {
    const { type, data } = req.body;
    
    if (!type || !data) {
        return res.status(400).json({ status: 'error', message: 'Missing type or data' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Handling Settings (Key-Value Store)
        if (type === 'settings') {
            await connection.query('DELETE FROM settings'); // Clear old settings
            if (Object.keys(data).length > 0) {
                const values = Object.keys(data).map(key => {
                    let val = data[key];
                    if (typeof val === 'object') val = JSON.stringify(val);
                    return [key, val];
                });
                await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES ?', [values]);
            }
        } 
        // 2. Generic Handling for Arrays (Inventory, Transactions, etc.)
        else {
            const tableName = type; 
            const allowedTables = ['inventory', 'transactions', 'suppliers', 'users'];
            if (!allowedTables.includes(tableName)) {
                 throw new Error(`Invalid table name: ${tableName}`);
            }

            // Sync Strategy: Full Replace (Delete All & Insert New) to ensure consistency with Frontend state
            await connection.query(`DELETE FROM ${tableName}`);

            if (data.length > 0) {
                // Find all possible keys across all objects in the data array
                // This is crucial because some objects might be missing optional keys (e.g. supplierName in outbound tx)
                const allKeys = new Set();
                data.forEach(item => {
                    Object.keys(item).forEach(k => allKeys.add(k));
                });
                
                const columnsCamel = Array.from(allKeys);
                const columnsSnake = columnsCamel.map(toSnake);
                
                if (columnsSnake.length > 0) {
                    const placeholders = columnsSnake.map(() => '?').join(', ');
                    const sql = `INSERT INTO ${tableName} (${columnsSnake.join(', ')}) VALUES (${placeholders})`;

                    for (const item of data) {
                        const values = columnsCamel.map(key => {
                            let val = item[key];
                            
                            // Convert Objects/Arrays to JSON string
                            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                            
                            // Handle undefined/null
                            if (val === undefined) val = null;
                            
                            // Format JS Date to MySQL Datetime
                            if (val instanceof Date) val = val.toISOString().slice(0, 19).replace('T', ' ');
                            
                            return val;
                        });
                        await connection.query(sql, values);
                    }
                }
            }
        }

        await connection.commit();
        console.log(`Synced ${type}: ${Array.isArray(data) ? data.length : 1} records.`);
        res.json({ status: 'success', message: `Synced ${type} successfully.` });

    } catch (error) {
        await connection.rollback();
        console.error('Sync Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        connection.release();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});