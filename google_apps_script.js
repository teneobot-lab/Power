/**
 * SMARTSTOCK BACKEND - HYBRID (MySQL Primary + Sheets Sync)
 * 
 * Konfigurasi Database:
 * Ubah variabel DB_URL, DB_USER, dan DB_PASS sesuai kredensial MySQL Anda.
 * Pastikan server MySQL mengizinkan koneksi dari IP Google (Remote MySQL).
 * IP Google Apps Script biasanya berubah-ubah, jadi disarankan whitelist IP 0.0.0.0/0 sementara atau gunakan proxy.
 */

const DB_URL = 'jdbc:mysql://YOUR_DB_HOST:3306/smartstock_db'; // Ganti dengan IP/Host dan Nama DB Anda
const DB_USER = 'YOUR_DB_USERNAME'; // Ganti User DB
const DB_PASS = 'YOUR_DB_PASSWORD'; // Ganti Password DB

// --- MAIN HANDLERS ---

function doGet(e) {
  try {
    // 1. Coba koneksi ke MySQL (Primary Source)
    const conn = getDbConnection();
    
    const data = {
      inventory: fetchFromSql(conn, 'inventory'),
      transactions: fetchFromSql(conn, 'transactions'),
      suppliers: fetchFromSql(conn, 'suppliers'),
      users: fetchFromSql(conn, 'users'),
      settings: fetchSettingsFromSql(conn)
    };
    
    conn.close();
    return responseJSON({ status: 'success', data: data, source: 'mysql' });

  } catch (err) {
    // 2. Fallback ke Sheets jika MySQL gagal (misal: timeout atau error koneksi)
    console.error("MySQL Connection Failed, falling back to Sheets:", err);
    
    try {
      const ss = getSpreadsheet();
      const fallbackData = {
        inventory: getSheetData(ss, 'Inventory'),
        transactions: getSheetData(ss, 'Transactions'),
        suppliers: getSheetData(ss, 'Suppliers'),
        users: getSheetData(ss, 'Users'),
        settings: getSheetSettings(ss)
      };
      return responseJSON({ status: 'success', data: fallbackData, source: 'sheets_fallback', error: err.toString() });
    } catch (sheetErr) {
      return responseJSON({ status: 'error', message: 'Both MySQL and Sheets failed: ' + sheetErr.toString() });
    }
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const type = payload.type; // 'inventory', 'transactions', etc.
    const data = payload.data; // Array of objects

    // 1. Simpan ke MySQL (Primary)
    const conn = getDbConnection();
    conn.setAutoCommit(false); // Mulai Transaksi

    try {
      if (type === 'settings') {
        saveSettingsToSql(conn, data);
      } else {
        saveToSql(conn, type, data);
      }
      conn.commit();
    } catch (sqlErr) {
      conn.rollback(); // Batalkan jika ada error saat insert
      throw sqlErr;
    } finally {
      conn.close();
    }

    // 2. Sync ke Google Sheets (Secondary / Backup)
    // Blok ini dijalankan terpisah agar jika sheets error, respons tetap sukses (opsional, tergantung kebutuhan strictness)
    try {
      const ss = getSpreadsheet();
      if (type === 'settings') {
        saveSheetSettings(ss, data);
      } else {
        const typeToSheet = {
          'inventory': 'Inventory',
          'transactions': 'Transactions',
          'suppliers': 'Suppliers',
          'users': 'Users'
        };
        if(typeToSheet[type]) {
            saveSheetData(ss, typeToSheet[type], data);
        }
      }
    } catch (sheetErr) {
      console.warn("Sync to Sheets failed (Data saved to MySQL though):", sheetErr);
    }

    return responseJSON({ status: 'success', message: 'Saved to MySQL & Synced to Sheets' });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// --- MYSQL FUNCTIONS ---

function getDbConnection() {
  return Jdbc.getConnection(DB_URL, DB_USER, DB_PASS);
}

function fetchFromSql(conn, tableName) {
  const stmt = conn.createStatement();
  const rs = stmt.executeQuery('SELECT * FROM ' + tableName);
  const meta = rs.getMetaData();
  const colCount = meta.getColumnCount();
  const results = [];

  while (rs.next()) {
    const row = {};
    for (let i = 1; i <= colCount; i++) {
      let colName = meta.getColumnLabel(i);
      let val = rs.getObject(i);
      
      // Convert keys from snake_case (DB) to camelCase (Frontend)
      colName = snakeToCamel(colName);

      // Handle JSON Strings from MySQL (LongText columns)
      if (['alternativeUnits', 'items', 'photos'].includes(colName) && typeof val === 'string') {
        try { val = JSON.parse(val); } catch(e) { val = []; } // Default to empty array if parse fails
      }
      
      // Handle Date/Timestamp
      if (val instanceof JdbcDate || val instanceof JdbcTimestamp) {
         val = new Date(val.getTime()).toISOString();
      }
      
      // Handle NULLs
      if (val === null) {
          if (['quantity', 'minLevel', 'unitPrice'].includes(colName)) val = 0;
          else val = '';
      }

      row[colName] = val;
    }
    results.push(row);
  }
  
  rs.close();
  stmt.close();
  return results;
}

function fetchSettingsFromSql(conn) {
  const stmt = conn.createStatement();
  const rs = stmt.executeQuery('SELECT * FROM settings');
  const settings = {};
  while(rs.next()) {
    const key = rs.getString('setting_key');
    let val = rs.getString('setting_value');
    try {
       // Coba parse jika itu JSON array/object
       if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
         val = JSON.parse(val); 
       }
    } catch(e) {}
    settings[key] = val;
  }
  rs.close();
  stmt.close();
  return settings;
}

function saveToSql(conn, type, dataArray) {
  const tableName = type; 
  
  // Clean Table first (Full Replace Strategy)
  const stmtDelete = conn.createStatement();
  stmtDelete.execute('DELETE FROM ' + tableName);
  stmtDelete.close();

  if (!dataArray || dataArray.length === 0) return;

  // Prepare Column Names
  const sampleObj = dataArray[0];
  const keys = Object.keys(sampleObj);
  const dbCols = keys.map(k => camelToSnake(k));
  
  const placeholders = keys.map(() => '?').join(',');
  const sql = `INSERT INTO ${tableName} (${dbCols.join(',')}) VALUES (${placeholders})`;
  
  const ps = conn.prepareStatement(sql);

  // Batch Insert
  dataArray.forEach(item => {
    keys.forEach((key, index) => {
      let val = item[key];
      
      // Stringify Objects/Arrays for TEXT/LONGTEXT columns
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val); 
      }
      
      // Handle Date objects if passed directly
      if (val instanceof Date) {
        val = val.toISOString().slice(0, 19).replace('T', ' '); // Format for MySQL
      }

      if (val === undefined) val = null;
      
      ps.setObject(index + 1, val);
    });
    ps.addBatch();
  });

  ps.executeBatch();
  ps.close();
}

function saveSettingsToSql(conn, settingsObj) {
  const stmtDelete = conn.createStatement();
  stmtDelete.execute('DELETE FROM settings');
  stmtDelete.close();

  const sql = 'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)';
  const ps = conn.prepareStatement(sql);

  Object.keys(settingsObj).forEach(key => {
    let val = settingsObj[key];
    if (typeof val === 'object') val = JSON.stringify(val);
    ps.setString(1, key);
    ps.setString(2, val);
    ps.addBatch();
  });
  
  ps.executeBatch();
  ps.close();
}

// --- HELPER UTILS ---
function camelToSnake(str) {
  const manualMap = {
      'baseUnit': 'base_unit',
      'alternativeUnits': 'alternative_units',
      'minLevel': 'min_level',
      'unitPrice': 'unit_price',
      'lastUpdated': 'last_updated',
      'contactPerson': 'contact_person',
      'lastLogin': 'last_login',
      'supplierName': 'supplier_name',
      'poNumber': 'po_number',
      'riNumber': 'ri_number'
  };
  if (manualMap[str]) return manualMap[str];
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}


// --- GOOGLE SHEETS FUNCTIONS (SECONDARY SYNC) ---

const HEADERS = {
  Inventory: ['id', 'name', 'sku', 'category', 'quantity', 'baseUnit', 'alternativeUnits', 'minLevel', 'unitPrice', 'location', 'lastUpdated'],
  Transactions: ['id', 'date', 'type', 'items', 'notes', 'timestamp', 'supplierName', 'poNumber', 'riNumber', 'photos'],
  Suppliers: ['id', 'name', 'contactPerson', 'email', 'phone', 'address'],
  Users: ['id', 'name', 'email', 'role', 'status', 'lastLogin'],
  Settings: ['key', 'value']
};

function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  var ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch(e) { id = null; }
  }
  if (!id) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) ss = SpreadsheetApp.create("SmartStock Database");
    PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
    setupDatabaseSheets(ss);
  }
  return ss;
}

function setupDatabaseSheets(ss) {
  Object.keys(HEADERS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(HEADERS[name]);
      sheet.setFrozenRows(1);
    }
  });
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) val = val.toISOString();
      if (['alternativeUnits', 'items', 'photos'].includes(h) && typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[h] = val;
    });
    return obj;
  });
}

function getSheetSettings(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  const settings = {};
  rows.slice(1).forEach(r => {
    let val = r[1];
    try { if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) val = JSON.parse(val); } catch(e) {}
    settings[r[0]] = val;
  });
  return settings;
}

function saveSheetData(ss, sheetName, dataArray) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { setupDatabaseSheets(ss); sheet = ss.getSheetByName(sheetName); }
  
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).clearContent();
  
  if (!dataArray || dataArray.length === 0) return;

  const headers = HEADERS[sheetName] || Object.keys(dataArray[0]);
  
  // Re-write headers if changed
  if (sheet.getLastColumn() !== headers.length || sheet.getRange(1, 1).getValue() !== headers[0]) {
      sheet.clear();
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
  }

  const rows = dataArray.map(item => {
    return headers.map(header => {
      let val = item[header];
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      return val === undefined || val === null ? "" : val;
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function saveSheetSettings(ss, settingsObj) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return;
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow()-1, 2).clearContent();
  
  const rows = Object.keys(settingsObj).map(key => {
    let val = settingsObj[key];
    if (typeof val === 'object') val = JSON.stringify(val);
    return [key, val];
  });
  
  if(rows.length > 0) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
