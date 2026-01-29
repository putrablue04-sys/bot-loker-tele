const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL Railway connection failed:', err.message);
    process.exit(1); // 🚨 HENTIKAN SERVICE BIAR JELAS
  }
  console.log('✅ MySQL Railway connected');
});

module.exports = db;
