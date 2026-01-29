const ADMIN_USERNAME = 'botpromomurah'; // TANPA @
const db = require('./db');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

let sendInterval = null;
let targetGroup = null;


const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// 🔴 WAJIB ADA
let promoInterval = null;

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
// PROMO TERUS-MENERUS TIAP 5 DETIK
// ===============================
bot.onText(/\/promo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const pesan = match[1];

  // cek admin via username
  if (!msg.from.username || msg.from.username !== ADMIN_USERNAME) {
    bot.sendMessage(chatId, '❌ Khusus admin');
    return;
  }

  if (promoInterval) {
    bot.sendMessage(chatId, '⚠️ Promo sedang berjalan. Ketik /stop dulu.');
    return;
  }

  db.query('SELECT chat_id FROM telegram_groups', (err, groups) => {
    if (err || groups.length === 0) {
      bot.sendMessage(chatId, '❌ Tidak ada grup');
      return;
    }

    bot.sendMessage(
      chatId,
      `🚀 Promo dimulai\n📦 Total grup: ${groups.length}\n⏱️ Interval: 5 detik`
    );

    let index = 0;

    promoInterval = setInterval(() => {
      const group = groups[index];

      bot.sendMessage(
        group.chat_id,
        `📢 *PROMO*\n\n${pesan}`,
        { parse_mode: 'Markdown' }
      );

      index++;
      if (index >= groups.length) index = 0;
    }, 5000);
  });
});

// ===============================
// STOP PROMO
// ===============================
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;

  if (!msg.from.username || msg.from.username !== ADMIN_USERNAME) {
    bot.sendMessage(chatId, '❌ Khusus admin');
    return;
  }

  if (!promoInterval) {
    bot.sendMessage(chatId, 'ℹ️ Tidak ada promo berjalan');
    return;
  }

  clearInterval(promoInterval);
  promoInterval = null;

  bot.sendMessage(chatId, '🛑 Promo dihentikan');
});

// ===============================
// DEBUG POLLING ERROR
// ===============================
bot.on('polling_error', (err) => {
  console.log('Polling error:', err.message);
});

console.log('🤖 Bot aktif...');

bot.onText(/\/groups/, (msg) => {
  if (!msg.from.username || msg.from.username !== ADMIN_USERNAME) {
    bot.sendMessage(msg.chat.id, '❌ Khusus admin');
    return;
  }

  db.query('SELECT chat_id, title FROM telegram_groups', (err, groups) => {
    if (err || groups.length === 0) {
      bot.sendMessage(msg.chat.id, '❌ Tidak ada grup');
      return;
    }

    let text = '📋 *DAFTAR GRUP*\n\n';
    groups.forEach((g, i) => {
      text += `${i + 1}. ${g.title}\nID: \`${g.chat_id}\`\n\n`;
    });

    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });
});

bot.on('message', (msg) => {
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    db.query(
      'INSERT IGNORE INTO telegram_groups (chat_id, title) VALUES (?, ?)',
      [msg.chat.id, msg.chat.title]
    );
  }
});

bot.onText(/\/groups/, (msg) => {
  if (!msg.from.username || msg.from.username !== ADMIN_USERNAME) {
    bot.sendMessage(msg.chat.id, '❌ Khusus admin');
    return;
  }

  db.query('SELECT title FROM telegram_groups', (err, groups) => {
    if (err || groups.length === 0) {
      bot.sendMessage(msg.chat.id, '❌ Tidak ada grup');
      return;
    }

    let text = '📋 *DAFTAR GRUP*\n\n';
    groups.forEach((g, i) => {
      text += `${i + 1}. ${g.title}\n`;
    });

    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });
});

bot.onText(/\/send (.+?) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const groupName = match[1];
  const pesan = match[2];

  if (!msg.from.username || msg.from.username !== ADMIN_USERNAME) {
    bot.sendMessage(chatId, '❌ Khusus admin');
    return;
  }

  if (sendInterval) {
    bot.sendMessage(chatId, '⚠️ Pengiriman sedang berjalan. Ketik /stop dulu.');
    return;
  }

  db.query(
    'SELECT chat_id FROM telegram_groups WHERE title = ? LIMIT 1',
    [groupName],
    (err, rows) => {
      if (err || rows.length === 0) {
        bot.sendMessage(chatId, `❌ Grup "${groupName}" tidak ditemukan`);
        return;
      }

      targetGroup = rows[0].chat_id;

      sendInterval = setInterval(() => {
        bot.sendMessage(targetGroup, pesan);
      }, 5000);

      bot.sendMessage(
        chatId,
        `🚀 Mulai kirim ke grup: *${groupName}*\n⏱️ Interval: 5 detik`,
        { parse_mode: 'Markdown' }
      );
    }
  );
});

bot.onText(/\/stop/, (msg) => {
  if (!msg.from.username || msg.from.username !== ADMIN_USERNAME) {
    bot.sendMessage(msg.chat.id, '❌ Khusus admin');
    return;
  }

  if (!sendInterval) {
    bot.sendMessage(msg.chat.id, 'ℹ️ Tidak ada pengiriman berjalan');
    return;
  }

  clearInterval(sendInterval);
  sendInterval = null;
  targetGroup = null;

  bot.sendMessage(msg.chat.id, '🛑 Pengiriman dihentikan');
});

bot.onText(/\/spam (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split(' ');

  const targetGroupId = args[0];
  const total = parseInt(args[1]);
  const text = args.slice(2).join(' ');

  if (!targetGroupId || !total || !text) {
    return bot.sendMessage(chatId,
      'Format:\n/spam <group_id> <jumlah> <pesan>'
    );
  }

  bot.sendMessage(chatId, 
    `Mulai kirim ${total} pesan ke grup ${targetGroupId} tiap 5 detik`
  );

  let sent = 0;

  const interval = setInterval(() => {
    if (sent >= total) {
      clearInterval(interval);
      bot.sendMessage(chatId, 'Selesai kirim pesan 👍');
      return;
    }

    bot.sendMessage(targetGroupId, text)
      .catch(err => {
        clearInterval(interval);
        bot.sendMessage(chatId, 'Gagal kirim ke grup. Cek ID / izin bot.');
      });

    sent++;
  }, 5000); // 5 detik
});

