
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process'); // Modul untuk menjalankan perintah shell
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Konfigurasi Database
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME || 'smartstock_db',
    dateStrings: true
};

let pool;
let dbConnected = false;

// Fungsi Koneksi Database (Retry Pattern)
async function initDb() {
    try {
        pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log('✅ DATABASE TERHUBUNG: SmartStock DB Ready!');
        dbConnected = true;
        connection.release();
    } catch (err) {
        console.error('❌ DATABASE ERROR:', err.message);
        dbConnected = false;
        setTimeout(initDb, 5000); 
    }
}

// Helper: Snake_case -> CamelCase
const toCamel = (row) => {
    const res = {};
    for (let key in row) {
        const camel = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        let val = row[key];
        if (['alternativeUnits', 'items', 'photos'].includes(camel) && typeof val === 'string') {
            try { val = JSON.parse(val); } catch(e) { val = []; }
        }
        res[camel] = val;
    }
    return res;
};

// --- ROUTES API ---

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        database_status: dbConnected ? 'CONNECTED' : 'DISCONNECTED'
    });
});

const checkDb = (req, res, next) => {
    if (!pool || !dbConnected) return res.status(503).json({ status: 'error', message: 'Database Offline' });
    next();
};

// --- SYSTEM TERMINAL ENDPOINT ---
app.post('/api/terminal', async (req, res) => {
    const { command } = req.body;
    
    if (!command) return res.status(400).json({ output: 'Command is required' });

    console.log(`Executing command: ${command}`);

    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            return res.json({ 
                status: 'error', 
                output: stderr || error.message 
            });
        }
        res.json({ 
            status: 'success', 
            output: stdout || 'Command executed successfully (no output).'
        });
    });
});

app.get('/api/data', checkDb, async (req, res) => {
    try {
        const [inv] = await pool.query('SELECT * FROM inventory');
        const [tx] = await pool.query('SELECT * FROM transactions ORDER BY timestamp DESC');
        const [rejInv] = await pool.query('SELECT * FROM reject_inventory');
        const [rejLogs] = await pool.query('SELECT * FROM rejects ORDER BY timestamp DESC');
        const [sup] = await pool.query('SELECT * FROM suppliers');
        
        // --- AUTO-FIX USER & CREATE ADMIN ---
        let [usr] = await pool.query('SELECT * FROM users');
        const ADMIN_HASH = '3d3467611599540c49097e3a2779836183c50937617565437172083626217315';

        if (usr.length === 0) {
             console.log("⚠️ Users table empty. Creating default admin...");
             const defaultAdminSql = "INSERT INTO users (id, name, username, password, role, status, last_login) VALUES ('1', 'Admin Utama', 'admin', ?, 'admin', 'active', NOW())";
             await pool.query(defaultAdminSql, [ADMIN_HASH]);
             [usr] = await pool.query('SELECT * FROM users'); // Re-fetch
        } else {
             // AUTO-FIX: Cek jika ada user admin yang passwordnya masih 'admin22' (Plain Text) dan ubah ke Hash
             const adminUser = usr.find(u => u.username === 'admin');
             if (adminUser && adminUser.password === 'admin22') {
                 console.log("⚠️ Mendeteksi password admin belum di-hash. Memperbaiki otomatis...");
                 await pool.query('UPDATE users SET password = ? WHERE username = ?', [ADMIN_HASH, 'admin']);
                 [usr] = await pool.query('SELECT * FROM users'); // Re-fetch
             }
        }

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

app.post('/api/sync', checkDb, async (req, res) => {
    const { type, data } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const mapCols = (s) => {
            const m = { 
                'baseUnit':'base_unit', 'minLevel':'min_level', 'unitPrice':'unit_price', 
                'lastUpdated':'last_updated', 'supplierName':'supplier_name', 
                'poNumber':'po_number', 'riNumber':'ri_number',
                'alternativeUnits': 'alternative_units', 'contactPerson': 'contact_person',
                'lastLogin': 'last_login', 'unit2': 'unit2', 'ratio2': 'ratio2',
                'unit3': 'unit3', 'ratio3': 'ratio3'
            };
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
            let table = type;
            if (type === 'inventory') table = 'inventory';
            if (type === 'transactions') table = 'transactions';
            if (type === 'rejectItems' || type === 'reject_inventory') table = 'reject_inventory';
            if (type === 'rejectLogs' || type === 'rejects') table = 'rejects';
            if (type === 'suppliers') table = 'suppliers';
            if (type === 'users') table = 'users';
            
            await conn.query(`DELETE FROM \`${table}\``);
            
            if (data && data.length > 0) {
                const keys = Object.keys(data[0]);
                const cols = keys.map(mapCols);
                const values = data.map(item => keys.map(k => {
                    let v = item[k];
                    if (typeof v === 'object' && v !== null) return JSON.stringify(v);
                    
                    const isIsoDate = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
                    if (isIsoDate) return v.slice(0, 19).replace('T', ' ');
                    
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});

initDb();
