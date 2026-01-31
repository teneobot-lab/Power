/**
 * SMARTSTOCK BACKEND - PURE GOOGLE SHEETS
 * Versi Full AppScript (Tanpa VPS/MySQL)
 */

const HEADERS = {
  Inventory: ['id', 'name', 'sku', 'category', 'quantity', 'baseUnit', 'alternativeUnits', 'minLevel', 'unitPrice', 'location', 'lastUpdated', 'status'],
  Transactions: ['id', 'date', 'type', 'items', 'notes', 'timestamp', 'supplierName', 'poNumber', 'riNumber', 'photos'],
  RejectInventory: ['id', 'name', 'sku', 'baseUnit', 'unit2', 'ratio2', 'unit3', 'ratio3', 'lastUpdated'],
  Rejects: ['id', 'date', 'items', 'notes', 'timestamp'],
  Suppliers: ['id', 'name', 'contactPerson', 'email', 'phone', 'address'],
  Settings: ['key', 'value']
};

function doGet(e) {
  try {
    const ss = getSpreadsheet();
    const data = {
      inventory: getSheetData(ss, 'Inventory'),
      transactions: getSheetData(ss, 'Transactions'),
      reject_inventory: getSheetData(ss, 'RejectInventory'),
      rejects: getSheetData(ss, 'Rejects'),
      suppliers: getSheetData(ss, 'Suppliers'),
      settings: getSheetSettings(ss)
    };
    return responseJSON({ status: 'success', data: data });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const type = payload.type; 
    const data = payload.data; 
    const ss = getSpreadsheet();

    const typeToSheet = { 
      'inventory': 'Inventory', 
      'transactions': 'Transactions', 
      'reject_inventory': 'RejectInventory', 
      'rejects': 'Rejects', 
      'suppliers': 'Suppliers',
      'settings': 'Settings'
    };

    const sheetName = typeToSheet[type];
    if (!sheetName) throw new Error("Invalid sync type: " + type);

    if (type === 'settings') {
      saveSheetSettings(ss, data);
    } else {
      saveSheetData(ss, sheetName, data);
    }

    return responseJSON({ status: 'success', message: 'Data synced to Google Sheets' });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// --- UTILITIES ---

function getSpreadsheet() {
  let id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  let ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch(e) { id = null; }
  }
  if (!id) {
    ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create("PowerStock_DB");
    PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
    setupSheets(ss);
  }
  return ss;
}

function setupSheets(ss) {
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
  const vals = sheet.getDataRange().getValues();
  if (vals.length <= 1) return [];
  const headers = vals[0];
  return vals.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[h] = val;
    });
    return obj;
  });
}

function saveSheetData(ss, sheetName, dataArray) {
  const sheet = ss.getSheetByName(sheetName);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  if (!dataArray || dataArray.length === 0) return;
  const headers = HEADERS[sheetName];
  const rows = dataArray.map(item => headers.map(h => {
    let val = item[h];
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    return val === undefined || val === null ? "" : val;
  }));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function getSheetSettings(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const vals = sheet.getDataRange().getValues();
  const settings = {};
  vals.slice(1).forEach(row => {
    let val = row[1];
    try { if (val.startsWith('[') || val.startsWith('{')) val = JSON.parse(val); } catch(e) {}
    settings[row[0]] = val;
  });
  return settings;
}

function saveSheetSettings(ss, settingsObj) {
  const sheet = ss.getSheetByName('Settings');
  sheet.clear();
  sheet.appendRow(['key', 'value']);
  const rows = Object.keys(settingsObj).map(k => {
    let v = settingsObj[k];
    if (typeof v === 'object') v = JSON.stringify(v);
    return [k, v];
  });
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
