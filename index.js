
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

const app = express();
app.use(express.json());
const ADMIN_USERNAME = 'botpromomurah';


const bot = new TelegramBot(process.env.BOT_TOKEN);


bot.on('my_chat_member', (msg) => {
  const chat = msg.chat;

  if (chat.type === 'group' || chat.type === 'supergroup') {
    db.query(
      'INSERT IGNORE INTO telegram_groups (chat_id, title) VALUES (?, ?)',
      [chat.id, chat.title],
      (err) => {
        if (err) console.log('❌ DB error:', err);
        else console.log(`✅ Bot masuk grup: ${chat.title}`);
      }
    );
  }
});


// ===============================
// VAR GLOBAL (SATU KALI SAJA)
// ===============================
let sendInterval = null;     // khusus /send (single group)
let broadcastRunning = false; // khusus /sendall


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


let broadcastTimer = null;
let broadcastIndex = 0;
let broadcastGroups = [];
let broadcastMessage = '';

bot.onText(/\/sendall (.+)/, (msg, match) => {
  if (msg.from.username !== ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Khusus admin');
  }

  if (broadcastTimer) {
    return bot.sendMessage(msg.chat.id, '⚠️ Broadcast sudah berjalan');
  }

  broadcastMessage = match[1];

  db.query('SELECT chat_id FROM telegram_groups', (err, rows) => {
    if (err || rows.length === 0) {
      return bot.sendMessage(msg.chat.id, '❌ Tidak ada grup');
    }

    broadcastGroups = rows;
    broadcastIndex = 0;

    broadcastTimer = setInterval(() => {
      const groupId = broadcastGroups[broadcastIndex].chat_id;
      console.log('📤 SEND KE', groupId);

      bot.sendMessage(groupId, broadcastMessage)
        .catch(err => console.log('❌ ERROR', err.message));

      broadcastIndex++;
      if (broadcastIndex >= broadcastGroups.length) {
        broadcastIndex = 0;
      }
    }, 5000);

    bot.sendMessage(msg.chat.id, '🚀 Broadcast nonstop DIMULAI');
  });
});

bot.onText(/\/stop/, (msg) => {
  if (msg.from.username !== ADMIN_USERNAME) return;

  if (!broadcastTimer) {
    return bot.sendMessage(msg.chat.id, '⚠️ Tidak ada broadcast');
  }

  clearInterval(broadcastTimer);
  broadcastTimer = null;
  bot.sendMessage(msg.chat.id, '🛑 Broadcast dihentikan');
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

  if (!sendInterval && !broadcastRunning) {
    return bot.sendMessage(msg.chat.id, '⚠️ Tidak ada pengiriman aktif');
  }

  if (sendInterval) {
    clearInterval(sendInterval);
    sendInterval = null;
  }

  broadcastRunning = false;

  bot.sendMessage(msg.chat.id, '🛑 Semua pengiriman dihentikan');
});

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

bot.setWebHook(`${WEBHOOK_URL}/bot${process.env.BOT_TOKEN}`);

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log('🚀 Bot webhook jalan di port', PORT);
});

