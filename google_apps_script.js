
/**
 * SMARTSTOCK BACKEND - HYBRID (MySQL Primary + Sheets Sync)
 */

const DB_URL = 'jdbc:mysql://YOUR_DB_HOST:3306/smartstock_db'; 
const DB_USER = 'YOUR_DB_USERNAME'; 
const DB_PASS = 'YOUR_DB_PASSWORD'; 

// --- MAIN HANDLERS ---

function doGet(e) {
  try {
    const conn = getDbConnection();
    const data = {
      inventory: fetchFromSql(conn, 'inventory'),
      transactions: fetchFromSql(conn, 'transactions'),
      reject_inventory: fetchFromSql(conn, 'reject_inventory'),
      rejects: fetchFromSql(conn, 'rejects'),
      suppliers: fetchFromSql(conn, 'suppliers'),
      users: fetchFromSql(conn, 'users'),
      settings: fetchSettingsFromSql(conn)
    };
    conn.close();
    return responseJSON({ status: 'success', data: data, source: 'mysql' });
  } catch (err) {
    try {
      const ss = getSpreadsheet();
      const fallbackData = {
        inventory: getSheetData(ss, 'Inventory'),
        transactions: getSheetData(ss, 'Transactions'),
        reject_inventory: getSheetData(ss, 'RejectInventory'),
        rejects: getSheetData(ss, 'Rejects'),
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
    const type = payload.type; 
    const data = payload.data; 

    // Handle Full Batch Sync for Google Sheets Integration
    if (type === 'full_sync') {
      const ss = getSpreadsheet();
      if (data.inventory) saveSheetData(ss, 'Inventory', data.inventory);
      if (data.transactions) saveSheetData(ss, 'Transactions', data.transactions);
      if (data.rejectItems) saveSheetData(ss, 'RejectInventory', data.rejectItems);
      if (data.rejectLogs) saveSheetData(ss, 'Rejects', data.rejectLogs);
      if (data.suppliers) saveSheetData(ss, 'Suppliers', data.suppliers);
      if (data.users) saveSheetData(ss, 'Users', data.users);
      if (data.settings) saveSheetSettings(ss, data.settings);
      
      return responseJSON({ status: 'success', message: 'Full Spreadsheet Sync Complete' });
    }

    // Individual SQL Sync
    const conn = getDbConnection();
    conn.setAutoCommit(false);
    try {
      if (type === 'settings') saveSettingsToSql(conn, data);
      else saveToSql(conn, type, data);
      conn.commit();
    } catch (sqlErr) {
      conn.rollback();
      throw sqlErr;
    } finally {
      conn.close();
    }

    // Background Sync to Sheet
    try {
      const ss = getSpreadsheet();
      if (type === 'settings') saveSheetSettings(ss, data);
      else {
        const typeToSheet = { 
          'inventory': 'Inventory', 
          'transactions': 'Transactions', 
          'reject_inventory': 'RejectInventory', 
          'rejects': 'Rejects', 
          'suppliers': 'Suppliers', 
          'users': 'Users' 
        };
        if(typeToSheet[type]) saveSheetData(ss, typeToSheet[type], data);
      }
    } catch (sheetErr) {
      console.warn("Sync to Sheets failed:", sheetErr);
    }

    return responseJSON({ status: 'success', message: 'Saved and Synced' });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// --- MYSQL FUNCTIONS ---
function getDbConnection() { return Jdbc.getConnection(DB_URL, DB_USER, DB_PASS); }

function fetchFromSql(conn, tableName) {
  const stmt = conn.createStatement();
  const rs = stmt.executeQuery('SELECT * FROM ' + tableName);
  const meta = rs.getMetaData();
  const colCount = meta.getColumnCount();
  const results = [];
  while (rs.next()) {
    const row = {};
    for (let i = 1; i <= colCount; i++) {
      let colName = snakeToCamel(meta.getColumnLabel(i));
      let val = rs.getObject(i);
      if (['alternativeUnits', 'items', 'photos'].includes(colName) && typeof val === 'string') {
        try { val = JSON.parse(val); } catch(e) { val = []; }
      }
      if (val instanceof JdbcDate || val instanceof JdbcTimestamp) val = new Date(val.getTime()).toISOString();
      row[colName] = val === null ? '' : val;
    }
    results.push(row);
  }
  rs.close(); stmt.close();
  return results;
}

function fetchSettingsFromSql(conn) {
  const stmt = conn.createStatement();
  const rs = stmt.executeQuery('SELECT * FROM settings');
  const settings = {};
  while(rs.next()) {
    const key = rs.getString('setting_key');
    let val = rs.getString('setting_value');
    try { if (val.startsWith('[') || val.startsWith('{')) val = JSON.parse(val); } catch(e) {}
    settings[key] = val;
  }
  rs.close(); stmt.close();
  return settings;
}

function saveToSql(conn, type, dataArray) {
  const stmtDelete = conn.createStatement();
  stmtDelete.execute('DELETE FROM ' + type);
  stmtDelete.close();
  if (!dataArray || dataArray.length === 0) return;
  const keys = Object.keys(dataArray[0]);
  const dbCols = keys.map(k => camelToSnake(k));
  const placeholders = keys.map(() => '?').join(',');
  const ps = conn.prepareStatement(`INSERT INTO ${type} (${dbCols.join(',')}) VALUES (${placeholders})`);
  dataArray.forEach(item => {
    keys.forEach((key, index) => {
      let val = item[key];
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      ps.setObject(index + 1, val === undefined ? null : val);
    });
    ps.addBatch();
  });
  ps.executeBatch(); ps.close();
}

function saveSettingsToSql(conn, settingsObj) {
  const stmtDelete = conn.createStatement(); stmtDelete.execute('DELETE FROM settings'); stmtDelete.close();
  const ps = conn.prepareStatement('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)');
  Object.keys(settingsObj).forEach(key => {
    let val = settingsObj[key];
    if (typeof val === 'object') val = JSON.stringify(val);
    ps.setString(1, key); ps.setString(2, val); ps.addBatch();
  });
  ps.executeBatch(); ps.close();
}

function camelToSnake(str) { 
  const map = { 'baseUnit':'base_unit', 'alternativeUnits':'alternative_units', 'minLevel':'min_level', 'unitPrice':'unit_price', 'lastUpdated':'last_updated', 'contactPerson':'contact_person', 'lastLogin':'last_login', 'supplierName':'supplier_name', 'poNumber':'po_number', 'riNumber':'ri_number', 'unit2':'unit2', 'ratio2':'ratio2', 'unit3':'unit3', 'ratio3':'ratio3' };
  return map[str] || str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
function snakeToCamel(str) { return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase()); }

// --- SHEETS FUNCTIONS ---
const HEADERS = {
  Inventory: ['id', 'name', 'sku', 'category', 'quantity', 'baseUnit', 'alternativeUnits', 'minLevel', 'unitPrice', 'location', 'lastUpdated'],
  Transactions: ['id', 'date', 'type', 'items', 'notes', 'timestamp', 'supplierName', 'poNumber', 'riNumber', 'photos'],
  RejectInventory: ['id', 'name', 'sku', 'baseUnit', 'unit2', 'ratio2', 'unit3', 'ratio3', 'lastUpdated'],
  Rejects: ['id', 'date', 'items', 'notes', 'timestamp'],
  Suppliers: ['id', 'name', 'contactPerson', 'email', 'phone', 'address'],
  Users: ['id', 'name', 'email', 'role', 'status', 'lastLogin'],
  Settings: ['key', 'value']
};

function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  var ss;
  if (id) try { ss = SpreadsheetApp.openById(id); } catch(e) { id = null; }
  if (!id) {
    ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create("SmartStock Database");
    PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
    setupDatabaseSheets(ss);
  }
  return ss;
}

function setupDatabaseSheets(ss) {
  Object.keys(HEADERS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) { sheet = ss.insertSheet(name); sheet.appendRow(HEADERS[name]); sheet.setFrozenRows(1); }
  });
}

function saveSheetData(ss, sheetName, dataArray) {
  let sheet = ss.getSheetByName(sheetName);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).clearContent();
  if (!dataArray || dataArray.length === 0) return;
  const headers = HEADERS[sheetName] || Object.keys(dataArray[0]);
  const rows = dataArray.map(item => headers.map(h => {
    let val = item[h];
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    return val === undefined || val === null ? "" : val;
  }));
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function saveSheetSettings(ss, settingsObj) {
  const sheet = ss.getSheetByName('Settings');
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow()-1, 2).clearContent();
  const rows = Object.keys(settingsObj).map(key => {
    let val = settingsObj[key];
    if (typeof val === 'object') val = JSON.stringify(val);
    return [key, val];
  });
  if(rows.length > 0) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function responseJSON(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
