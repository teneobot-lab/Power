
import React, { useState, useEffect } from 'react';
import { User, AppSettings, UserRole } from '../types';
import { checkServerConnection } from '../services/api';
import { Save, Shield, X, Globe, Loader2, Wifi, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, Clock, Database, ServerCrash, FileCode, Terminal, Copy, FileJson, FileText, Cpu, ChevronRight } from 'lucide-react';

interface AdminPanelProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onFullSyncToSheets?: () => Promise<boolean>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  settings, onUpdateSettings, 
  users, onAddUser, onUpdateUser, onDeleteUser, onFullSyncToSheets
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'cloud' | 'migration'>('settings');
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed' | 'partial'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async (type: 'vps' | 'gas') => {
      const url = type === 'vps' ? tempSettings.vpsApiUrl : tempSettings.viteGasUrl;
      if (!url) {
          setConnectionStatus('failed');
          setConnectionMsg('URL tidak boleh kosong.');
          return;
      }
      setConnectionStatus('checking');
      const result = await checkServerConnection(url);
      setConnectionStatus(result.online ? 'success' : 'failed');
      setConnectionMsg(result.message);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Kode berhasil disalin!");
  };

  // --- SERVER CODE CONSTANTS ---
  const packageJsonCode = `{
  "name": "smartstock-backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "db:setup": "node setupDb.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "body-parser": "^1.20.2"
  }
}`;

  const envCode = `DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smartstock_db
PORT=3000`;

  const setupDbCode = `require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    console.log('🚀 Menyiapkan Database SmartStock...');
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };
    const dbName = process.env.DB_NAME || 'smartstock_db';
    const tables = [
        \`CREATE TABLE IF NOT EXISTS inventory (id VARCHAR(50) PRIMARY KEY, sku VARCHAR(100), name VARCHAR(255), category VARCHAR(100), quantity INT, base_unit VARCHAR(50), alternative_units LONGTEXT, min_level INT, unit_price DECIMAL(15,2), location VARCHAR(100), last_updated DATETIME, status VARCHAR(20) DEFAULT 'active')\`,
        \`CREATE TABLE IF NOT EXISTS transactions (id VARCHAR(50) PRIMARY KEY, date DATE, type VARCHAR(20), items LONGTEXT, notes TEXT, timestamp DATETIME, supplier_name VARCHAR(255), po_number VARCHAR(100), ri_number VARCHAR(100), photos LONGTEXT)\`,
        \`CREATE TABLE IF NOT EXISTS reject_inventory (id VARCHAR(50) PRIMARY KEY, sku VARCHAR(100), name VARCHAR(255), base_unit VARCHAR(50), unit2 VARCHAR(50), ratio2 INT, unit3 VARCHAR(50), ratio3 INT, last_updated DATETIME)\`,
        \`CREATE TABLE IF NOT EXISTS rejects (id VARCHAR(50) PRIMARY KEY, date DATE, items LONGTEXT, notes TEXT, timestamp DATETIME)\`,
        \`CREATE TABLE IF NOT EXISTS suppliers (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), contact_person VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), address TEXT)\`,
        \`CREATE TABLE IF NOT EXISTS users (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), username VARCHAR(255) UNIQUE, password VARCHAR(255), role VARCHAR(50), status VARCHAR(50), last_login DATETIME)\`,
        \`CREATE TABLE IF NOT EXISTS settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value LONGTEXT)\`
    ];
    try {
        const connection = await mysql.createConnection(config);
        await connection.query(\`CREATE DATABASE IF NOT EXISTS \${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci\`);
        await connection.query(\`USE \${dbName}\`);
        console.log('📂 Membuat tabel-tabel...');
        for (const sql of tables) { await connection.query(sql); }
        await connection.query("INSERT IGNORE INTO users (id, name, username, password, role, status, last_login) VALUES ('1', 'Admin Utama', 'admin', 'admin22', 'admin', 'active', NOW())");
        console.log('✅ Database berhasil dikonfigurasi!');
        await connection.end();
        process.exit(0);
    } catch (error) { console.error('❌ Gagal Setup DB:', error.message); process.exit(1); }
}
setupDatabase();`;

  const indexJsCode = `const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    dateStrings: true
};

let pool;
let dbConnected = false;

async function initDb() {
    try {
        pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log('✅ DATABASE TERHUBUNG');
        dbConnected = true;
        connection.release();
    } catch (err) {
        console.error('❌ DATABASE ERROR:', err.message);
        dbConnected = false;
        setTimeout(initDb, 5000); 
    }
}

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
        res.json({ status: 'success', data: { inventory: inv.map(toCamel), transactions: tx.map(toCamel), reject_inventory: rejInv.map(toCamel), rejects: rejLogs.map(toCamel), suppliers: sup.map(toCamel), users: usr.map(toCamel), settings } });
    } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

app.post('/api/sync', async (req, res) => {
    const { type, data } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const mapCols = (s) => {
            const m = { 'baseUnit':'base_unit', 'minLevel':'min_level', 'unitPrice':'unit_price', 'lastUpdated':'last_updated', 'supplierName':'supplier_name', 'poNumber':'po_number', 'riNumber':'ri_number', 'alternativeUnits': 'alternative_units', 'contactPerson': 'contact_person', 'lastLogin': 'last_login' };
            return m[s] || s.replace(/[A-Z]/g, l => \`_\${l.toLowerCase()}\`);
        };
        if (type === 'settings') {
            await conn.query('DELETE FROM settings');
            for (let k in data) {
                let v = data[k];
                if (typeof v === 'object') v = JSON.stringify(v);
                await conn.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [k, v]);
            }
        } else {
            let table = type === 'rejectItems' ? 'reject_inventory' : (type === 'rejectLogs' ? 'rejects' : type);
            await conn.query(\`DELETE FROM \\\`\${table}\\\`\`);
            if (data && data.length > 0) {
                const keys = Object.keys(data[0]);
                const cols = keys.map(mapCols);
                const values = data.map(item => keys.map(k => {
                    let v = item[k];
                    if (typeof v === 'object' && v !== null) return JSON.stringify(v);
                    const isIsoDate = typeof v === 'string' && /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(v);
                    if (isIsoDate) return v.slice(0, 19).replace('T', ' ');
                    return v;
                }));
                await conn.query(\`INSERT INTO \\\`\${table}\\\` (\${cols.map(c => \`\\\`\${c}\\\`\`).join(',')}) VALUES ?\`, [values]);
            }
        }
        await conn.commit();
        res.json({ status: 'success' });
    } catch (e) { await conn.rollback(); res.status(500).json({ status: 'error', message: e.message }); } finally { conn.release(); }
});

app.listen(PORT, '0.0.0.0', () => console.log(\`🚀 SERVER RUNNING ON PORT \${PORT}\`));
initDb();`;

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Globe className="w-4 h-4" /> 
            <span>Pengaturan Server</span>
          </button>
          <button onClick={() => setActiveTab('migration')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'migration' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <ServerCrash className="w-4 h-4" /> 
            <span>Setup & Migrasi</span>
          </button>
          <button onClick={() => setActiveTab('cloud')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'cloud' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <FileSpreadsheet className="w-4 h-4" /> 
            <span>Integrasi Sheets</span>
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Shield className="w-4 h-4" /> 
            <span>Manajemen Akses</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
               <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                 <Database className="w-6 h-6 text-blue-500" /> 
                 VPS Configuration
               </h2>
               <p className="text-slate-500 text-sm mb-8 italic">Pastikan VPS Anda sudah menjalankan API Backend sebelum mengetes koneksi.</p>
               
               <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Backend API URL</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input type="text" className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono bg-slate-50" placeholder="http://ip-vps:3000" value={tempSettings.vpsApiUrl} onChange={(e) => setTempSettings({...tempSettings, vpsApiUrl: e.target.value})} />
                        <button onClick={() => handleTestConnection('vps')} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2">
                           {connectionStatus === 'checking' && activeTab === 'settings' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                           Tes VPS
                        </button>
                    </div>
                    {connectionMsg && activeTab === 'settings' && (
                      <div className={`mt-3 p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {connectionMsg}
                      </div>
                    )}
                  </div>
                  <div className="pt-6 border-t flex items-center gap-4">
                     <button onClick={handleSaveSettings} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Save className="w-4 h-4" /> Simpan Pengaturan
                     </button>
                     {isSaved && activeTab === 'settings' && <span className="text-emerald-600 text-sm font-bold animate-pulse"><CheckCircle2 className="inline w-4 h-4 mr-1" /> Tersimpan</span>}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-3">
                        <ServerCrash className="w-7 h-7 text-amber-600" /> 
                        Inisialisasi VPS Baru
                    </h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        Gunakan script di bawah ini untuk membangun ulang backend di VPS baru Anda. 
                        Pastikan Node.js dan MySQL sudah terinstall di VPS.
                    </p>

                    <div className="space-y-12">
                        {/* Step 1: Install Dependencies */}
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Cpu className="w-4 h-4" /> Langkah 1: Persiapan Folder di VPS
                            </h3>
                            <div className="p-5 bg-slate-900 rounded-xl space-y-3">
                                <div className="text-[10px] text-slate-500 font-mono mb-1"># Jalankan di Terminal SSH VPS</div>
                                <code className="block text-emerald-400 text-xs font-mono leading-relaxed">
                                    mkdir server && cd server<br/>
                                    npm init -y
                                </code>
                            </div>
                        </section>

                        {/* package.json */}
                        <section className="pt-8 border-t">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileJson className="w-4 h-4 text-emerald-500" /> package.json
                                </h3>
                                <button onClick={() => copyToClipboard(packageJsonCode)} className="text-[10px] bg-slate-100 px-4 py-1.5 rounded-lg font-bold hover:bg-slate-200 flex items-center gap-1.5">
                                    <Copy className="w-3.5 h-3.5" /> Salin Kode
                                </button>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto max-h-[300px] border border-slate-800">
                                <pre className="text-emerald-400 text-[11px] font-mono leading-relaxed">{packageJsonCode}</pre>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 italic">* Simpan sebagai file bernama <strong>package.json</strong></p>
                        </section>

                        {/* .env */}
                        <section className="pt-8 border-t">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500" /> .env
                                </h3>
                                <button onClick={() => copyToClipboard(envCode)} className="text-[10px] bg-slate-100 px-4 py-1.5 rounded-lg font-bold hover:bg-slate-200 flex items-center gap-1.5">
                                    <Copy className="w-3.5 h-3.5" /> Salin Kode
                                </button>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                                <pre className="text-emerald-400 text-[11px] font-mono leading-relaxed">{envCode}</pre>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 italic">* Simpan sebagai file bernama <strong>.env</strong> dan ganti password MySQL Anda.</p>
                        </section>

                        {/* setupDb.js */}
                        <section className="pt-8 border-t">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Database className="w-4 h-4 text-rose-500" /> setupDb.js
                                </h3>
                                <button onClick={() => copyToClipboard(setupDbCode)} className="text-[10px] bg-slate-100 px-4 py-1.5 rounded-lg font-bold hover:bg-slate-200 flex items-center gap-1.5">
                                    <Copy className="w-3.5 h-3.5" /> Salin Kode
                                </button>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto max-h-[400px] custom-scrollbar border border-slate-800">
                                <pre className="text-emerald-400 text-[11px] font-mono leading-relaxed">{setupDbCode}</pre>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 italic">* Simpan sebagai file bernama <strong>setupDb.js</strong></p>
                        </section>

                        {/* index.js */}
                        <section className="pt-8 border-t">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileCode className="w-4 h-4 text-amber-500" /> index.js (API Backend)
                                </h3>
                                <button onClick={() => copyToClipboard(indexJsCode)} className="text-[10px] bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-md">
                                    <Copy className="w-3.5 h-3.5" /> Salin Kode
                                </button>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto max-h-[500px] custom-scrollbar border border-slate-800">
                                <pre className="text-emerald-400 text-[11px] font-mono leading-relaxed">{indexJsCode}</pre>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 italic">* Simpan sebagai file bernama <strong>index.js</strong></p>
                        </section>

                        {/* Final Command */}
                        <section className="pt-8 border-t">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-slate-800" /> Langkah Akhir: Jalankan Server
                            </h3>
                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4">
                                <p className="text-xs text-emerald-800 font-bold">Jalankan perintah ini secara berurutan:</p>
                                <div className="bg-slate-900 p-4 rounded-xl space-y-2">
                                    <code className="block text-emerald-400 text-xs font-mono">npm install</code>
                                    <code className="block text-emerald-400 text-xs font-mono">node setupDb.js</code>
                                    <code className="block text-white text-xs font-mono font-bold mt-2">npm start</code>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Server akan berjalan di port 3000.
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in duration-300">
                <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                    <FileSpreadsheet className="w-7 h-7 text-emerald-600" /> 
                    Integrasi Google Sheets
                </h2>
                <p className="text-slate-500 text-sm mb-8">Backup database Anda ke Google Sheets secara manual.</p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">GAS Deployment URL</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input type="url" className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono bg-slate-50" value={tempSettings.viteGasUrl} onChange={(e) => setTempSettings({...tempSettings, viteGasUrl: e.target.value})} />
                            <button onClick={() => handleTestConnection('gas')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2">
                                {connectionStatus === 'checking' && activeTab === 'cloud' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                                Tes GAS
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 border-t">
                        <button 
                            onClick={async () => {
                                if (!onFullSyncToSheets) return;
                                setIsSyncing(true);
                                try { await onFullSyncToSheets(); } finally { setIsSyncing(false); }
                            }}
                            disabled={isSyncing}
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Sync Total Sekarang
                        </button>
                        {tempSettings.lastSheetSync && (
                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                <Clock className="w-3.5 h-3.5" /> Terakhir Sinkron: {new Date(tempSettings.lastSheetSync).toLocaleString('id-ID')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          )}
          
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in duration-300">
               <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-500" /> Manajemen Akses</h2>
               <div className="overflow-hidden border border-slate-100 rounded-xl">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b">
                       <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-sm">
                       {users.map(user => (
                         <tr key={user.id} className="hover:bg-slate-50">
                           <td className="px-6 py-4"><div className="font-bold text-slate-900">{user.name}</div><div className="text-[11px] text-slate-500">@{user.username}</div></td>
                           <td className="px-6 py-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase">{user.role}</span></td>
                           <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{user.status}</span></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
