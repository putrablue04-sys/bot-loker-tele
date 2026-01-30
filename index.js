

const ADMIN_USERNAME = 'botpromomurah';
const db = require('./db');
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });


// ===============================
// VAR GLOBAL (SATU KALI SAJA)
// ===============================
let sendInterval = null;

// ===============================
// SIMPAN GRUP SAAT BOT DIMASUKIN
// ===============================
bot.on('message', (msg) => {
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    db.query(
      'INSERT IGNORE INTO telegram_groups (chat_id, title) VALUES (?, ?)',
      [msg.chat.id, msg.chat.title]
    );
  }
});

// ===============================
// LIST GRUP
// ===============================
bot.onText(/\/groups/, (msg) => {
  if (msg.from.username !== ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Khusus admin');
  }

  db.query('SELECT chat_id, title FROM telegram_groups', (err, rows) => {
    if (err || rows.length === 0) {
      return bot.sendMessage(msg.chat.id, '❌ Tidak ada grup');
    }

    let text = '📋 *DAFTAR GRUP*\n\n';
    rows.forEach((g, i) => {
      text += `${i + 1}. ${g.title}\nID: \`${g.chat_id}\`\n\n`;
    });

    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });
});

// ===============================
// START KIRIM PROMO
// ===============================
bot.onText(/\/send (\-?\d+) (.+)/, (msg, match) => {
  if (msg.from.username !== ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Khusus admin');
  }

  if (sendInterval) {
    return bot.sendMessage(msg.chat.id, '⚠️ Pengiriman sedang berjalan. /stop dulu.');
  }

  const groupId = match[1];
  const pesan = match[2];

  sendInterval = setInterval(() => {
    bot.sendMessage(groupId, pesan).catch(() => {
      bot.sendMessage(msg.chat.id, '❌ Gagal kirim. Bot belum admin / ID salah.');
      clearInterval(sendInterval);
      sendInterval = null;
    });
  }, 5000);


  bot.sendMessage(msg.chat.id, `🚀 Mulai kirim ke ${groupId} tiap 5 detik`);
});

bot.onText(/\/sendall (.+)/, (msg, match) => {
  if (msg.from.username !== ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Khusus admin');
  }

  const pesan = match[1];

  if (sendInterval) {
    return bot.sendMessage(msg.chat.id, '⚠️ Pengiriman sedang berjalan');
  }

  db.query('SELECT chat_id FROM telegram_groups', (err, rows) => {
    if (err || rows.length === 0) {
      return bot.sendMessage(msg.chat.id, '❌ Tidak ada grup');
    }

    let index = 0;

    sendInterval = setInterval(() => {
      if (index >= rows.length) {
        clearInterval(sendInterval);
        sendInterval = null;
        return bot.sendMessage(msg.chat.id, '✅ Semua grup terkirim');
      }

      bot.sendMessage(rows[index].chat_id, pesan).catch(() => {});
      index++;
    }, 5000);
  });
});


bot.onText(/\/addgroup (\-?\d+)/, (msg, match) => {
  if (msg.from.username !== ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Khusus admin');
  }

  const groupId = match[1];

  db.query(
    'INSERT IGNORE INTO telegram_groups (chat_id, title) VALUES (?, ?)',
    [groupId, 'Manual Group'],
    (err) => {
      if (err) {
        return bot.sendMessage(msg.chat.id, '❌ Gagal simpan grup');
      }
      bot.sendMessage(msg.chat.id, '✅ Grup berhasil ditambahkan');
    }
  );
});

// ===============================
// STOP KIRIM PROMO
// ===============================
bot.onText(/\/stop/, (msg) => {
  if (msg.from.username !== ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Khusus admin');
  }

  if (!sendInterval) {
    return bot.sendMessage(msg.chat.id, '⚠️ Tidak ada pengiriman aktif');
  }

  clearInterval(sendInterval);
  sendInterval = null;
  bot.sendMessage(msg.chat.id, '🛑 Pengiriman dihentikan');
});
