
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Konfigurasi Database (Tanpa Password)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smartstock_db'
};

let pool;

async function initDb() {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Terhubung ke MySQL');
}

// Format CamelCase helper
const toCamel = (row) => {
    const res = {};
    for (let key in row) {
        const camel = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        let val = row[key];
        // Parse JSON fields
        if (['alternativeUnits', 'items', 'photos'].includes(camel) && typeof val === 'string') {
            try { val = JSON.parse(val); } catch(e) { val = []; }
        }
        res[camel] = val;
    }
    return res;
};

// --- API ENDPOINTS ---

app.get('/api/data', async (req, res) => {
    try {
        const [inv] = await pool.query('SELECT * FROM inventory');
        const [tx] = await pool.query('SELECT * FROM transactions ORDER BY timestamp DESC');
        const [rejInv] = await pool.query('SELECT * FROM reject_inventory');
        const [rejLogs] = await pool.query('SELECT * FROM rejects ORDER BY timestamp DESC');
        const [sup] = await pool.query('SELECT * FROM suppliers');
        const [usr] = await pool.query('SELECT * FROM users');
        const [setRows] = await pool.query('SELECT * FROM settings');

        const settings = {};
        setRows.forEach(r => {
            let v = r.setting_value;
            try { if(v.startsWith('[') || v.startsWith('{')) v = JSON.parse(v); } catch(e){}
            settings[r.setting_key] = v;
        });

        res.json({
            status: 'success',
            data: {
                inventory: inv.map(toCamel),
                transactions: tx.map(toCamel),
                reject_inventory: rejInv.map(toCamel),
                rejects: rejLogs.map(toCamel),
                suppliers: sup.map(toCamel),
                users: usr.map(toCamel),
                settings
            }
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/api/sync', async (req, res) => {
    const { type, data } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const mapCols = (s) => {
            const m = { 'baseUnit':'base_unit', 'minLevel':'min_level', 'unitPrice':'unit_price', 'lastUpdated':'last_updated', 'supplierName':'supplier_name', 'poNumber':'po_number', 'ri_number':'ri_number' };
            return m[s] || s.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        };

        if (type === 'settings') {
            await conn.query('DELETE FROM settings');
            for (let k in data) {
                let v = data[k];
                if (typeof v === 'object') v = JSON.stringify(v);
                await conn.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [k, v]);
            }
        } else {
            const table = type === 'reject_inventory' ? 'reject_inventory' : (type === 'rejects' ? 'rejects' : type);
            await conn.query(`DELETE FROM \`${table}\``);
            
            if (data && data.length > 0) {
                const keys = Object.keys(data[0]);
                const cols = keys.map(mapCols);
                const values = data.map(item => keys.map(k => {
                    let v = item[k];
                    if (typeof v === 'object' && v !== null) return JSON.stringify(v);
                    if (typeof v === 'string' && v.includes('T')) return v.slice(0, 19).replace('T', ' ');
                    return v;
                }));
                await conn.query(`INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(',')}) VALUES ?`, [values]);
            }
        }

        await conn.commit();
        res.json({ status: 'success' });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ status: 'error', message: e.message });
    } finally {
        conn.release();
    }
});

initDb().then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
});
