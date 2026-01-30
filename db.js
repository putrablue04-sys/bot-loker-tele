const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL bot_loker_tele failed:', err);
    process.exit(1);
  }
  console.log('✅ MySQL bot_loker_tele connected');
});

module.exports = db;

db.connect(err => {
  if (err) {
    console.error('❌ MySQL Railway connection failed:', err.message);
    process.exit(1);
  }

  console.log('✅ MySQL Railway connected');

  // AUTO CREATE TABLE (NO INSTALL, NO CLI)
  const sql = `
    CREATE TABLE IF NOT EXISTS telegram_groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chat_id BIGINT UNIQUE,
      title VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(sql, (err) => {
    if (err) console.error('❌ Gagal create table:', err.message);
    else console.log('📦 Table telegram_groups ready');
  });
});
