require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🚀 Starting Database Setup...');
    
    // STRICT FIX: Always use 127.0.0.1 for local VPS MySQL
    const dbHost = '127.0.0.1';

    console.log(`📡 Connecting to Database at ${dbHost}...`);

    try {
        const connection = await mysql.createConnection({
            host: dbHost,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true 
        });

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('📂 Reading schema.sql...');
        await connection.query(schemaSql);
        console.log('✅ Database created successfully!');
        await connection.end();
        process.exit();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
setupDatabase();