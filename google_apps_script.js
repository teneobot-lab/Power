/**
 * SMARTSTOCK BACKEND - COLUMN BASED STORAGE
 * Menyimpan data dalam format tabel (per kolom) agar mudah dibaca manusia.
 */

// Definisi Header Kolom untuk setiap Sheet
const HEADERS = {
  Inventory: ['id', 'name', 'sku', 'category', 'quantity', 'baseUnit', 'alternativeUnits', 'minLevel', 'unitPrice', 'location', 'lastUpdated'],
  Transactions: ['id', 'date', 'type', 'items', 'notes', 'timestamp'],
  Suppliers: ['id', 'name', 'contactPerson', 'email', 'phone', 'address'],
  Users: ['id', 'name', 'email', 'role', 'status', 'lastLogin'],
  Settings: ['key', 'value']
};

function doGet(e) {
  const ss = getSpreadsheet();
  const action = e.parameter ? e.parameter.action : null;

  // Action khusus untuk inisialisasi database
  if (action === 'setup') {
    setupDatabase(ss);
    return responseJSON({ status: 'success', message: 'Database schema & samples created.' });
  }

  // Ambil semua data
  const data = {
    inventory: getSheetData(ss, 'Inventory'),
    transactions: getSheetData(ss, 'Transactions'),
    suppliers: getSheetData(ss, 'Suppliers'),
    users: getSheetData(ss, 'Users'),
    settings: getSettings(ss)
  };

  return responseJSON({ status: 'success', data: data });
}

function doPost(e) {
  const ss = getSpreadsheet();
  
  try {
    const payload = JSON.parse(e.postData.contents);
    const type = payload.type;
    const data = payload.data;
    
    // Mapping tipe data frontend ke Nama Sheet
    const typeToSheet = {
      'inventory': 'Inventory',
      'transactions': 'Transactions',
      'suppliers': 'Suppliers',
      'users': 'Users',
      'settings': 'Settings'
    };
    
    const sheetName = typeToSheet[type];
    if (!sheetName) throw new Error("Unknown data type: " + type);

    if (type === 'settings') {
      saveSettings(ss, data);
    } else {
      saveSheetData(ss, sheetName, data);
    }

    return responseJSON({ status: 'success', message: 'Saved ' + type });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// --- CORE FUNCTIONS ---

function getSpreadsheet() {
  // Menggunakan Active Spreadsheet
  // Pastikan script ini "Container Bound" (dibuat dari dalam Google Sheet)
  // Atau masukkan ID spreadsheet manual jika standalone: SpreadsheetApp.openById("ID_DISINI");
  var id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  var ss;
  
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch(e) { id = null; }
  }
  
  if (!id) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
        ss = SpreadsheetApp.create("SmartStock Database");
    }
    PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
    setupDatabase(ss);
  }
  return ss;
}

function setupDatabase(ss) {
  // 1. Setup Inventory
  createSheetIfNotExists(ss, 'Inventory', HEADERS.Inventory);
  const invSheet = ss.getSheetByName('Inventory');
  if (invSheet.getLastRow() <= 1) {
    // Sample Data
    const samples = [
       { id: '1', name: 'Wireless Ergonomic Mouse', sku: 'PER-001', category: 'Peripherals', quantity: 45, baseUnit: 'Pcs', alternativeUnits: JSON.stringify([{name: 'Box', ratio: 10}]), minLevel: 15, unitPrice: 25.50, location: 'A-12', lastUpdated: new Date().toISOString() },
       { id: '2', name: 'Mechanical Keyboard', sku: 'PER-002', category: 'Peripherals', quantity: 8, baseUnit: 'Pcs', alternativeUnits: '[]', minLevel: 10, unitPrice: 85.00, location: 'A-13', lastUpdated: new Date().toISOString() }
    ];
    appendRowsFromObjects(invSheet, HEADERS.Inventory, samples);
  }

  // 2. Setup Transactions
  createSheetIfNotExists(ss, 'Transactions', HEADERS.Transactions);

  // 3. Setup Suppliers
  createSheetIfNotExists(ss, 'Suppliers', HEADERS.Suppliers);
  const supSheet = ss.getSheetByName('Suppliers');
  if (supSheet.getLastRow() <= 1) {
    const samples = [
      { id: '1', name: 'TechGlobal', contactPerson: 'Sarah', email: 'orders@tech.com', phone: '555-0101', address: 'Silicon Valley' }
    ];
    appendRowsFromObjects(supSheet, HEADERS.Suppliers, samples);
  }

  // 4. Setup Users
  createSheetIfNotExists(ss, 'Users', HEADERS.Users);
  const usrSheet = ss.getSheetByName('Users');
  if (usrSheet.getLastRow() <= 1) {
    const samples = [
      { id: '1', name: 'Admin User', email: 'admin@smartstock.com', role: 'admin', status: 'active', lastLogin: new Date().toISOString() }
    ];
    appendRowsFromObjects(usrSheet, HEADERS.Users, samples);
  }

  // 5. Setup Settings
  createSheetIfNotExists(ss, 'Settings', HEADERS.Settings);
}

function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers); // Set Header Row
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

// --- DATA READ/WRITE HANDLERS ---

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Hanya header
  
  const headers = data[0]; // Baris pertama adalah header
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let value = row[index];
      
      // Handle Date: Google Sheet mengembalikan objek Date, ubah ke ISO String untuk konsistensi JSON
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      // Auto-parse JSON untuk kolom kompleks
      // alternativeUnits (Inventory), items (Transactions), mediaItems (Settings - via getSettings)
      if (['alternativeUnits', 'items'].includes(header) && typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try { value = JSON.parse(value); } catch(e) {}
      }
      
      obj[header] = value;
    });
    return obj;
  });
}

function saveSheetData(ss, sheetName, dataArray) {
  let sheet = ss.getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  
  if (!sheet) {
    setupDatabase(ss); // Safety net
    sheet = ss.getSheetByName(sheetName);
  }

  // Timpa semua data (Clear data lama, sisakan header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).clearContent();
  }
  
  if (!dataArray || dataArray.length === 0) return;

  appendRowsFromObjects(sheet, headers, dataArray);
}

function appendRowsFromObjects(sheet, headers, dataArray) {
  const rows = dataArray.map(item => {
    return headers.map(header => {
      let val = item[header];
      
      // Jika data adalah object/array kompleks, stringify
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      // Handle undefined/null
      if (val === undefined || val === null) val = "";
      
      return val;
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  }
}

// Khusus Settings (Key-Value Pair)
function getSettings(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  const settings = {};
  
  // Skip Header
  rows.slice(1).forEach(r => {
    const key = r[0];
    let val = r[1];
    try {
       // Coba parse jika value nya JSON (misal mediaItems)
       if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
         val = JSON.parse(val); 
       }
    } catch(e) {}
    settings[key] = val;
  });
  return settings;
}

function saveSettings(ss, settingsObj) {
  const sheet = ss.getSheetByName('Settings');
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow()-1, 2).clearContent();
  
  const rows = [];
  Object.keys(settingsObj).forEach(key => {
    let val = settingsObj[key];
    if (typeof val === 'object') val = JSON.stringify(val);
    rows.push([key, val]);
  });
  
  if(rows.length > 0) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}