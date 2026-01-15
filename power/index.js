
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' })); 
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// DB Config
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartstock_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const formatSqlValue = (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return val.slice(0, 19).replace('T', ' ');
    }
    if (typeof val === 'object') {
        return JSON.stringify(val);
    }
    return val;
};

pool.getConnection()
    .then(conn => {
        console.log("✅ POWER API Database Connected Successfully!");
        conn.release();
    })
    .catch(err => {
        console.error("❌ Database Connection Failed:", err.message);
    });

app.get('/', (req, res) => {
    res.send('POWER INVENTORY API is Running.');
});

app.get('/api/data', async (req, res) => {
    try {
        const [inventory] = await pool.query('SELECT * FROM inventory');
        const [transactions] = await pool.query('SELECT * FROM transactions');
        const [reject_inventory] = await pool.query('SELECT * FROM reject_inventory');
        const [rejects] = await pool.query('SELECT * FROM rejects');
        const [suppliers] = await pool.query('SELECT * FROM suppliers');
        const [users] = await pool.query('SELECT * FROM users');
        const [settingsRows] = await pool.query('SELECT * FROM settings');
        
        const settings = {};
        settingsRows.forEach(row => {
            let val = row.setting_value;
            try { 
                if (val && (val.startsWith('[') || val.startsWith('{'))) val = JSON.parse(val); 
            } catch (e) {}
            settings[row.setting_key] = val;
        });

        const formatRow = (row) => {
            const newRow = {};
            for (const key in row) {
                const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
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
                reject_inventory: reject_inventory.map(formatRow),
                rejects: rejects.map(formatRow),
                suppliers: suppliers.map(formatRow), 
                users: users.map(formatRow), 
                settings 
            }
        });
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.post('/api/sync', async (req, res) => {
    const { type, data } = req.body;
    if (!type) return res.status(400).json({ status: 'error', message: 'Missing type' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const toSnake = (str) => {
            const map = { 
                'baseUnit':'base_unit', 'alternativeUnits':'alternative_units', 'minLevel':'min_level', 
                'unitPrice':'unit_price', 'lastUpdated':'last_updated', 'contactPerson':'contact_person', 
                'lastLogin':'last_login', 'supplierName':'supplier_name', 'poNumber':'po_number', 
                'riNumber':'ri_number', 'unit2':'unit2', 'ratio2':'ratio2', 'unit3':'unit3', 'ratio3':'ratio3' 
            };
            return map[str] || str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        };

        if (type === 'settings') {
             await connection.query('DELETE FROM settings');
             if (data && Object.keys(data).length > 0) {
                const values = Object.keys(data).map(k => {
                    let val = data[k];
                    if (typeof val === 'object') val = JSON.stringify(val);
                    return [k, val];
                });
                await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES ?', [values]);
             }
        } else {
            const tableName = type === 'reject_inventory' ? 'reject_inventory' : type;
            await connection.query(`DELETE FROM \`${tableName}\``);
            
            if (Array.isArray(data) && data.length > 0) {
                const keys = Object.keys(data[0]);
                const snakeKeys = keys.map(toSnake);
                const values = data.map(item => keys.map(k => formatSqlValue(item[k])));
                const sql = `INSERT INTO \`${tableName}\` (${snakeKeys.map(k => `\`${k}\``).join(', ')}) VALUES ?`;
                await connection.query(sql, [values]);
            }
        }
        await connection.commit();
        res.json({ status: 'success' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        connection.release();
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 POWER Backend running on port ${PORT}`);
});
