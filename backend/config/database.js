// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'aeroKatty_db', 
  password: 'admin',
  port: 5433,
});

// Probar conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err);
  } else {
    console.log('✅ Conectado a PostgreSQL en:', res.rows[0].now);
  }
});

module.exports = pool;