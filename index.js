
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');
const PROMO_TEXT = `
🚀 LAGI BUTUH PROMOSI BIAR MAKIN RAMAI? 🚀

Capek posting tapi respon sepi? Reach mentok?
Saatnya pakai cara yang lebih efektif 🔥

Kami buka JASA SEBAR PROMOSI / IKLAN
Solusi simpel buat ningkatin exposure, branding, dan penjualan tanpa ribet 💯

💰 Harga super terjangkau:
• 1 hari ➜ 10K
• 2 hari ➜ 20K
• 3 hari ➜ 30K
• 4 hari ➜ 40K
• 5 hari ➜ 50K

⏳ Makin lama durasi sebar, makin kerasa hasilnya 📈

✨ Keunggulan layanan:
✅ Sebar rapi & konsisten
✅ Cocok buat jualan, channel, jasa, event, komunitas
✅ Bisa request jam sebar ⏰
✅ Aman, praktis, no ribet

📩 Minat? Langsung chat admin!
👉 @Imperiuslux

⚠️ Slot terbatas tiap hari
⚠️ Yang cepat booking, promonya jalan duluan 🚀🔥
`;

let broadcastTimer = null;
let broadcastIndex = 0;
let broadcastGroups = [];
let broadcastMessage = '';
let broadcastDelay = 5000; // default 5 detik

let autoStart = null;
let autoStop = null;
let autoEnabled = false;

setInterval(() => {
  if (!autoEnabled) return;

  const allowed = inTimeRange(autoStart, autoStop);

  if (allowed && !broadcastTimer) {
    console.log('▶️ AUTO BROADCAST START');
    startBroadcast();
  }

  if (!allowed && broadcastTimer) {
    console.log('⏹️ AUTO BROADCAST STOP');
    stopBroadcast();
  }
}, 60000); // cek tiap 1 menit

function startBroadcast() {
  if (broadcastTimer) return;

  broadcastTimer = setInterval(() => {
    if (!broadcastGroups.length) return;

    const groupId = broadcastGroups[broadcastIndex].chat_id;

    bot.sendMessage(groupId, broadcastMessage, {
      disable_web_page_preview: true
    }).catch(err => {
      console.log('❌ ERROR KIRIM KE', groupId, err.message);
    });

    broadcastIndex++;
    if (broadcastIndex >= broadcastGroups.length) {
      broadcastIndex = 0;
    }
  }, broadcastDelay);

}

function stopBroadcast() {
  if (!broadcastTimer) return;

  clearInterval(broadcastTimer);
  broadcastTimer = null;
}


const app = express();
app.use(express.json());

const ADMIN_USERNAME = 'botpromomurah';


const bot = new TelegramBot(process.env.BOT_TOKEN, {
  webHook: true
});



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
bot.onText(/\/send/, (msg) => {
  if (msg.from.username !== ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Khusus admin');
  }

  if (sendInterval) {
    return bot.sendMessage(msg.chat.id, '⚠️ Pengiriman sedang berjalan. /stop dulu.');
  }

  const text = msg.text.replace('/send', '').trim();

  const lines = text.split('\n');
  const groupId = lines.shift().trim();
  const pesan = lines.join('\n').trim();

  if (!groupId || !pesan) {
    return bot.sendMessage(
      msg.chat.id,
      '❌ Format salah\n\n/send ID_GRUP\nISI PROMO'
    );
  }

  sendInterval = setInterval(() => {
    bot.sendMessage(groupId, pesan, {
      disable_web_page_preview: true
    }).catch(() => {
      bot.sendMessage(msg.chat.id, '❌ Gagal kirim. Bot belum admin / ID salah.');
      clearInterval(sendInterval);
      sendInterval = null;
    });
  }, 5000);

  bot.sendMessage(msg.chat.id, `🚀 Mulai kirim ke ${groupId} tiap 5 detik`);
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
  if (msg.from.username !== ADMIN_USERNAME) return;

  if (sendInterval) {
    clearInterval(sendInterval);
    sendInterval = null;
  }

  autoEnabled = false;
  stopBroadcast();

  bot.sendMessage(msg.chat.id, '🛑 Semua pengiriman & auto dihentikan');
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

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 Selamat datang!\n\nKlik tombol di bawah untuk melihat info promosi 👇',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🚀 LIHAT PROMOSI', callback_data: 'lihat_promo' }
          ]
        ]
      }
    }
  );
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;

  if (query.data === 'lihat_promo') {
    bot.sendMessage(chatId, PROMO_TEXT, {
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💬 Hubungi Admin', url: 'https://t.me/Imperiuslux' }
          ]
        ]
      }
    });

    bot.answerCallbackQuery(query.id);
  }
});

function inTimeRange(start, stop) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = stop.split(':').map(Number);

  const startMin = sh * 60 + sm;
  const stopMin = eh * 60 + em;

  // lewat tengah malam
  if (startMin > stopMin) {
    return nowMin >= startMin || nowMin < stopMin;
  }

  return nowMin >= startMin && nowMin < stopMin;
}




bot.onText(/\/autosendall/, (msg) => {
  if (msg.from.username !== ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Khusus admin');
  }

  if (autoEnabled) {
    return bot.sendMessage(msg.chat.id, '⚠️ Auto broadcast sudah aktif');
  }

  const raw = msg.text.replace('/autosendall', '').trim();
  const lines = raw.split('\n');

  const timeLine = lines.shift();
  const message = lines.join('\n').trim();

  if (!timeLine || !message) {
    return bot.sendMessage(
      msg.chat.id,
      '❌ Format salah\n\n/autosendall 09:00 03:00 10m\nISI PROMO'
    );
  }

  const parts = timeLine.split(' ');
  if (parts.length !== 3) {
    return bot.sendMessage(msg.chat.id, '❌ Format jam / delay salah');
  }

  autoStart = parts[0];
  autoStop = parts[1];

  const delay = parseDelay(parts[2]);
  if (!delay) {
    return bot.sendMessage(
      msg.chat.id,
      '❌ Delay tidak valid (contoh: 5s, 10m, 2h)'
    );
  }

  broadcastDelay = delay;
  broadcastMessage = message;

  db.query('SELECT chat_id FROM telegram_groups', (err, rows) => {
    if (err || rows.length === 0) {
      return bot.sendMessage(msg.chat.id, '❌ Tidak ada grup');
    }

    broadcastGroups = rows;
    broadcastIndex = 0;
    autoEnabled = true;

    // OPTIONAL: langsung jalan kalau masih di jam aktif
    if (inTimeRange(autoStart, autoStop)) {
      startBroadcast();
    }

    bot.sendMessage(
      msg.chat.id,
      `⏰ AUTO SENDALL AKTIF\n\nMulai: ${autoStart}\nStop: ${autoStop}\nDelay: ${parts[2]}\nGrup: ${rows.length}`
    );
  });
});


bot.onText(/\/stopauto/, (msg) => {
  if (msg.from.username !== ADMIN_USERNAME) return;

  autoEnabled = false;
  stopBroadcast();

  bot.sendMessage(msg.chat.id, '🛑 Auto sendall dihentikan');
});

function parseDelay(input) {
  const match = input.match(/^(\d+)(s|m|h)$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  let ms = 0;
  if (unit === 's') ms = value * 1000;
  if (unit === 'm') ms = value * 60 * 1000;
  if (unit === 'h') ms = value * 60 * 60 * 1000;

  const max = 24 * 60 * 60 * 1000; // 24 jam
  if (ms < 1000 || ms > max) return null;

  return ms;
}

bot.onText(/\/status/, (msg) => {
  if (!isAdmin(msg)) return;

  bot.sendMessage(
    msg.chat.id,
    `📊 *STATUS BOT*\n
Auto Sendall: ${autoEnabled ? 'ON ✅' : 'OFF ❌'}
Broadcast: ${broadcastTimer ? 'AKTIF 🚀' : 'STOP ⏹️'}
Jam Aktif: ${autoStart || '-'} – ${autoStop || '-'}
Delay: ${broadcastDelay / 1000}s
Grup Terdaftar: ${broadcastGroups.length}
`,
    { parse_mode: 'Markdown' }
  );
});

