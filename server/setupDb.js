require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🚀 Setting up Database...');
    
    const config = {
        host: '127.0.0.1',
        user: process.env.DB_USER || 'smartstock',
        password: process.env.DB_PASSWORD || 'smartstock_pass',
        multipleStatements: true
    };

    try {
        const connection = await mysql.createConnection(config);
        
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📂 Applying schema...');
        await connection.query(schemaSql);
        
        console.log('✅ Database setup complete!');
        await connection.end();
        process.exit();
    } catch (error) {
        console.error('❌ DB Setup Error:', error.message);
        process.exit(1);
    }
}
setupDatabase();