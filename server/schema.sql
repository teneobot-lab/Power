
-- 1. Buat Database
CREATE DATABASE IF NOT EXISTS smartstock_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartstock_db;

-- 2. Tabel Master Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INT DEFAULT 0,
    base_unit VARCHAR(50) DEFAULT 'Pcs',
    alternative_units LONGTEXT,
    min_level INT DEFAULT 0,
    unit_price DECIMAL(15, 2) DEFAULT 0,
    location VARCHAR(100),
    last_updated DATETIME,
    status VARCHAR(20) DEFAULT 'active'
);

-- 3. Tabel Transaksi (IN/OUT)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,
    items LONGTEXT NOT NULL,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    supplier_name VARCHAR(255),
    po_number VARCHAR(100),
    ri_number VARCHAR(100),
    photos LONGTEXT
);

-- 4. Tabel Master Reject
CREATE TABLE IF NOT EXISTS reject_inventory (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100),
    name VARCHAR(255),
    base_unit VARCHAR(50),
    unit2 VARCHAR(50),
    ratio2 INT,
    unit3 VARCHAR(50),
    ratio3 INT,
    last_updated DATETIME
);

-- 5. Tabel Log Reject
CREATE TABLE IF NOT EXISTS rejects (
    id VARCHAR(50) PRIMARY KEY,
    date DATE,
    items LONGTEXT NOT NULL,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Supplier
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT
);

-- 7. Tabel User (Login)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    status VARCHAR(50) DEFAULT 'active',
    last_login DATETIME
);

-- 8. Tabel Settings
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value LONGTEXT
);

-- 9. Insert Admin Default (admin / admin22)
INSERT IGNORE INTO users (id, name, username, password, role, status, last_login) 
VALUES ('1', 'Admin Utama', 'admin', 'admin22', 'admin', 'active', NOW());
