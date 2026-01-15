
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Buka akses untuk semua IP
app.use(bodyParser.json({ limit: '50mb' })); // Limit besar untuk upload foto

// Konfigurasi Database (Root tanpa password)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'smartstock_db',
    dateStrings: true
};

let pool;

// Fungsi Koneksi Database
async function initDb() {
    try {
        pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log('✅ DATABASE TERHUBUNG: SmartStock DB Ready!');
        connection.release();
    } catch (err) {
        console.error('❌ DATABASE ERROR:', err.message);
        // Retry connection after 5 seconds if failed
        setTimeout(initDb, 5000);
    }
}

// Helper: Convert Snake_case (DB) -> CamelCase (Frontend)
const toCamel = (row) => {
    const res = {};
    for (let key in row) {
        const camel = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        let val = row[key];
        // Parse JSON String kembali ke Object/Array
        if (['alternativeUnits', 'items', 'photos'].includes(camel) && typeof val === 'string') {
            try { val = JSON.parse(val); } catch(e) { val = []; }
        }
        res[camel] = val;
    }
    return res;
};

// --- ROUTES API ---

// 1. Cek Status Server
app.get('/', (req, res) => {
    res.send(`
        <h1 style="color:green; font-family:sans-serif;">🚀 SmartStock Server Berjalan!</h1>
        <p>Database: <b>Connected</b></p>
        <p>Port: <b>${PORT}</b></p>
    `);
});

// 2. Ambil Semua Data (GET)
app.get('/api/data', async (req, res) => {
    if (!pool) await initDb();
    try {
        // Ambil data dari semua tabel secara paralel
        const [inv] = await pool.query('SELECT * FROM inventory');
        const [tx] = await pool.query('SELECT * FROM transactions ORDER BY timestamp DESC');
        const [rejInv] = await pool.query('SELECT * FROM reject_inventory');
        const [rejLogs] = await pool.query('SELECT * FROM rejects ORDER BY timestamp DESC');
        const [sup] = await pool.query('SELECT * FROM suppliers');
        const [usr] = await pool.query('SELECT * FROM users');
        const [setRows] = await pool.query('SELECT * FROM settings');

        // Format Settings
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
        console.error('GET Error:', e);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// 3. Simpan Data / Sync (POST)
app.post('/api/sync', async (req, res) => {
    const { type, data } = req.body;
    if (!pool) await initDb();
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Mapping nama kolom frontend ke database
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
            // Mapping tipe ke nama tabel
            let table = type;
            if (type === 'inventory') table = 'inventory';
            if (type === 'transactions') table = 'transactions';
            if (type === 'rejectItems' || type === 'reject_inventory') table = 'reject_inventory';
            if (type === 'rejectLogs' || type === 'rejects') table = 'rejects';
            
            // Hapus data lama (Strategy Full Sync untuk konsistensi)
            await conn.query(`DELETE FROM \`${table}\``);
            
            if (data && data.length > 0) {
                const keys = Object.keys(data[0]);
                const cols = keys.map(mapCols);
                
                // Siapkan data bulk insert
                const values = data.map(item => keys.map(k => {
                    let v = item[k];
                    if (typeof v === 'object' && v !== null) return JSON.stringify(v);
                    // Format tanggal agar diterima MySQL
                    if (typeof v === 'string' && v.includes('T') && v.length > 20) return v.slice(0, 19).replace('T', ' ');
                    return v;
                }));
                
                await conn.query(`INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(',')}) VALUES ?`, [values]);
            }
        }

        await conn.commit();
        console.log(`✅ SYNC SUKSES: ${type} (${Array.isArray(data) ? data.length : 1} records)`);
        res.json({ status: 'success' });
    } catch (e) {
        await conn.rollback();
        console.error(`❌ SYNC GAGAL (${type}):`, e.message);
        res.status(500).json({ status: 'error', message: e.message });
    } finally {
        conn.release();
    }
});

// Jalankan Server pada IP 0.0.0.0 (Publik)
initDb().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n================================================');
        console.log(`🚀 SERVER BERJALAN DI PORT ${PORT}`);
        console.log('================================================\n');
    });
});
