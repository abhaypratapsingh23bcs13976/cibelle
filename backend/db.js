const { Pool } = require('pg');
require('dotenv').config();

let pool;
let isConnected = false;

try {
    const poolConfig = process.env.DATABASE_URL 
        ? { 
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000 
          }
        : {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'cibelle',
            password: process.env.DB_PASSWORD || '2005',
            port: parseInt(process.env.DB_PORT) || 5432,
            connectionTimeoutMillis: 5000
        };

    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
        console.error('⚠️ PostgreSQL Connection Error:', err.message);
        isConnected = false;
        global.DB_MODE = 'JSON';
    });

    // Test connection immediately
    pool.query('SELECT NOW()')
        .then(() => {
            console.log('✅ PostgreSQL Connected (Real Mode)');
            isConnected = true;
            global.DB_MODE = 'SQL';
        })
        .catch(err => {
            console.log('⚠️ PostgreSQL Unavailable:', err.message);
            console.log('🔄 Switching to SMART MODE (JSON Fallback).');
            isConnected = false;
            global.DB_MODE = 'JSON';
        });

} catch (err) {
    console.log('⚠️ Initialization Error. Switching to SMART MODE (JSON Fallback).');
    isConnected = false;
    global.DB_MODE = 'JSON';
}

module.exports = {
    query: (text, params) => {
        if (global.DB_MODE === 'JSON') {
            return Promise.reject(new Error("Database is in JSON Fallback mode because PostgreSQL is unavailable. Please check your PostgreSQL service and connection settings."));
        }
        return pool.query(text, params);
    },
    isSQL: () => global.DB_MODE === 'SQL'
};
