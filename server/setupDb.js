
require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    console.log('🚀 Setting up Database...');
    console.log('   User:', process.env.DB_USER || 'smartstock (default)');
    console.log('   Host:', '127.0.0.1');

    const config = {
        host: '127.0.0.1',
        user: process.env.DB_USER || 'smartstock',
        password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'smartstock_pass',
        multipleStatements: true
    };

    const schemaSql = [
        "CREATE TABLE IF NOT EXISTS inventory (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), sku VARCHAR(100), category VARCHAR(100), quantity INT, base_unit VARCHAR(50), alternative_units LONGTEXT, min_level INT, unit_price DECIMAL(15,2), location VARCHAR(100), last_updated DATETIME)",
        "CREATE TABLE IF NOT EXISTS transactions (id VARCHAR(50) PRIMARY KEY, date DATE, type VARCHAR(20), items LONGTEXT, notes TEXT, timestamp DATETIME, supplier_name VARCHAR(255), po_number VARCHAR(100), ri_number VARCHAR(100), photos LONGTEXT)",
        "CREATE TABLE IF NOT EXISTS reject_inventory (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), sku VARCHAR(100), base_unit VARCHAR(50), unit2 VARCHAR(50), ratio2 INT, unit3 VARCHAR(50), ratio3 INT, last_updated DATETIME)",
        "CREATE TABLE IF NOT EXISTS rejects (id VARCHAR(50) PRIMARY KEY, date DATE, items LONGTEXT, notes TEXT, timestamp DATETIME)",
        "CREATE TABLE IF NOT EXISTS suppliers (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), contact_person VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), address TEXT)",
        "CREATE TABLE IF NOT EXISTS users (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), email VARCHAR(255), role VARCHAR(50), status VARCHAR(50), last_login DATETIME)",
        "CREATE TABLE IF NOT EXISTS settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value LONGTEXT)"
    ].join('; ');

    try {
        const connection = await mysql.createConnection(config);
        
        const dbName = process.env.DB_NAME || 'smartstock_db';
        await connection.query('CREATE DATABASE IF NOT EXISTS ' + dbName);
        await connection.query('USE ' + dbName);

        console.log('📂 Applying schema...');
        await connection.query(schemaSql);
        
        console.log('✅ Database setup complete!');
        await connection.end();
        process.exit();
    } catch (error) {
        console.error('❌ DB Setup Error:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   👉 Check your DB_PASSWORD in the .env file.');
        }
        process.exit(1);
    }
}
setupDatabase();
