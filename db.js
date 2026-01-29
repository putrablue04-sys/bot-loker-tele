const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL Railway connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ MySQL Railway connected');
});

module.exports = db;
