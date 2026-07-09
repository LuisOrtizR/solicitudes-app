const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.zzwklbekqwcqurmkbthd:lIOcYLqVn4leDac8@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({ connectionString });

pool.query('SELECT NOW()')
  .then((res) => {
    console.log('✅ CONEXIÓN EXITOSA:', res.rows[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.log('❌ FALLÓ:', err.message);
    process.exit(1);
  });