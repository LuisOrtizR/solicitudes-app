const { Pool } = require('pg');

console.log('=== DEBUG ENV ===');
console.log('DB_USER:', JSON.stringify(process.env.DB_USER));
console.log('DB_HOST:', JSON.stringify(process.env.DB_HOST));
console.log('DB_NAME:', JSON.stringify(process.env.DB_NAME));
console.log('==================');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

module.exports = pool;