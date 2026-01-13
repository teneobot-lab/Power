require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🚀 Starting Database Setup...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true // Important to allow multiple queries in one file
    });

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📂 Reading schema.sql...');
        
        // Execute the SQL file content
        await connection.query(schemaSql);

        console.log('✅ Database and Tables created successfully!');
    } catch (error) {
        console.error('❌ Error setting up database:', error);
    } finally {
        await connection.end();
        process.exit();
    }
}

setupDatabase();
