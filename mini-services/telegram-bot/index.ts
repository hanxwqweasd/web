import TelegramBot from "node-telegram-bot-api";
import express from "express";

// ─── Configuration ──────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || "8945065009:AAFFJYPVvw_8xt4be71mxGqk9WCDRqIDqII";
const GAME_URL = process.env.GAME_URL || "https://t.me/StarDominionBot/StarDominion";
const PORT = parseInt(process.env.PORT || "3001", 10);
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/telegram-webhook";

const USE_WEBHOOK = process.env.USE_WEBHOOK === "true";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";

// ─── Bot Initialization ──────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, {
  webHook: USE_WEBHOOK,
});

// ─── Messages ────────────────────────────────────────────────────────────────
const WELCOME_MESSAGE = `🚀 *STAR DOMINION*

Добро пожаловать, Капитан\!
Вы назначены командиром заброшенной космической станции в секторе Андромеда\-7\.

🏰 Стройте и развивайте станцию
⚗️ Исследуйте технологии
🚀 Создавайте флот и побеждайте пиратов
🗺️ Исследуйте карту сектора

Присоединяйтесь к тысячам капитанов, которые уже строят свою империю среди звёзд\!`;

const FULL_INFO_MESSAGE = `📖 *Полная информация — Star Dominion*

🎮 *Об игре:*
Star Dominion — это глубокая космическая стратегия и симулятор колонии\. Управляйте космической станцией в загадочном секторе Андромеда\-7\.

🏗️ *Строительство:*
• Стройте модули: Генераторы, Майнеры, Лаборатории, Верфи и другие
• Улучшайте модули для увеличения эффективности
• Управляйте комнатами станции

🔬 *Исследования:*
• 4 ветки технологий: Военная, Инженерная, Биологическая, Психо\-Энергетическая
• Открывайте новые модули и возможности
• Прокачивайте свою станцию

🚀 *Флот:*
• Стройте корабли разных классов
• Создавайте эскадры
• Сражайтесь с пиратами и другими игроками

🗺️ *Карта сектора:*
• Исследуйте узлы сектора Андромеда\-7
• Находите ресурсы и артефакты
• Защищайте свои территории

💰 *Ресурсы:*
• ⚡ Энергия — питание станции
• 🪨 Минералы — строительные материалы
• 🧪 Данные — для исследований
• 💎 Кристаллы — премиум валюта

🏆 *Профиль и Рейтинг:*
• Отслеживайте свои достижения
• Соревнуйтесь с другими капитанами
• Заходите в топ\-3 и получайте награды

👥 *Реферальная система:*
• Приглашайте друзей и получайте бонусы
• +200 минералов и \+100 энергии за каждого друга

❓ *Команды бота:*
/start — Начать игру
/help — Эта справка

Играйте прямо в Telegram — никакого скачивания не требуется\!`;

// ─── Keyboards ──────────────────────────────────────────────────────────────
function getStartKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "🚀 Начать Играть",
          web_app: { url: GAME_URL },
        },
        {
          text: "📖 Полная информация",
          callback_data: "show_full_info",
        },
      ],
    ],
  };
}

// ─── /start Command ─────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot
    .sendMessage(chatId, WELCOME_MESSAGE, {
      parse_mode: "MarkdownV2",
      reply_markup: getStartKeyboard(),
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to send /start to chat ${chatId}:`, err.message);
      const plainMessage = WELCOME_MESSAGE.replace(/[*_~`\\()!#\[\]{}|+.]/g, "");
      bot.sendMessage(chatId, plainMessage, {
        reply_markup: getStartKeyboard(),
      }).catch(() => {});
    });
});

// ─── /help Command ───────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  bot
    .sendMessage(chatId, FULL_INFO_MESSAGE, {
      parse_mode: "MarkdownV2",
      reply_markup: getStartKeyboard(),
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to send /help to chat ${chatId}:`, err.message);
      const plainMessage = FULL_INFO_MESSAGE.replace(/[*_~`\\()!#\[\]{}|+.]/g, "");
      bot.sendMessage(chatId, plainMessage, {
        reply_markup: getStartKeyboard(),
      }).catch(() => {});
    });
});

// ─── Callback Query Handler (Full Info Button) ─────────────────────────────
bot.on("callback_query", (query) => {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  if (query.data === "show_full_info") {
    // Acknowledge the callback
    bot.answerCallbackQuery(query.id).catch(() => {});

    // Send full info message
    bot
      .sendMessage(chatId, FULL_INFO_MESSAGE, {
        parse_mode: "MarkdownV2",
        reply_markup: getStartKeyboard(),
      })
      .catch((err) => {
        console.error(`[ERROR] Failed to send full info to chat ${chatId}:`, err.message);
        const plainMessage = FULL_INFO_MESSAGE.replace(/[*_~`\\()!#\[\]{}|+.]/g, "");
        bot.sendMessage(chatId, plainMessage, {
          reply_markup: getStartKeyboard(),
        }).catch(() => {});
      });
  }
});

// ─── Pre-Checkout Query (Telegram Stars) ────────────────────────────────────
bot.on("pre_checkout_query", (query) => {
  console.log(
    `[STARS] Pre-checkout query from user ${query.from.id}:`,
    `invoice_payload=${query.invoice_payload},`,
    `total_amount=${query.total_amount}`,
  );

  bot
    .answerPreCheckoutQuery(query.id, true)
    .catch((err) => {
      console.error(`[ERROR] Failed to answer pre_checkout_query ${query.id}:`, err.message);
    });
});

// ─── Successful Payment (Telegram Stars) ────────────────────────────────────
bot.on("successful_payment", (msg) => {
  const payment = msg.successful_payment;
  console.log(
    `[PAYMENT] Successful payment from user ${msg.from.id}:`,
    `invoice_payload=${payment.invoice_payload},`,
    `currency=${payment.currency},`,
    `total_amount=${payment.total_amount}`,
    `telegram_payment_charge_id=${payment.telegram_payment_charge_id}`,
  );

  const confirmationMessage = `✅ *Оплата прошла успешно\!*

Спасибо за покупку, Капитан\!
${payment.invoice_payload ? `📦 Предмет: ${payment.invoice_payload}` : ""}

Star Dominion продолжает развиваться благодаря вашей поддержке\. Скоро увидимся в секторе Андромеда\-7\! ⭐`;

  bot
    .sendMessage(msg.chat.id, confirmationMessage, {
      parse_mode: "MarkdownV2",
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to send payment confirmation:`, err.message);
      bot.sendMessage(msg.chat.id, "✅ Оплата прошла успешно! Спасибо за покупку, Капитан!").catch(() => {});
    });
});

// ─── Generic Message Handler ────────────────────────────────────────────────
bot.on("message", (msg) => {
  if (msg.text?.startsWith("/")) return;

  const chatId = msg.chat.id;
  console.log(`[MSG] User ${msg.from?.id || "unknown"} (${chatId}): ${msg.text?.substring(0, 100) || "[non-text]"}`);

  bot.sendMessage(chatId, "🎮 Чтобы начать играть, нажмите кнопку ниже:", {
    reply_markup: getStartKeyboard(),
  }).catch(() => {});
});

// ─── Error Handling ─────────────────────────────────────────────────────────
bot.on("polling_error", (err) => {
  console.error(`[POLLING ERROR] ${err.code}: ${err.message}`);
});

bot.on("webhook_error", (err) => {
  console.error(`[WEBHOOK ERROR] ${err.code || "unknown"}: ${err.message}`);
});

// ─── Express Server (for health check) ─────────────────────────────────────
const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", bot: "star-dominion", uptime: process.uptime() });
});

if (USE_WEBHOOK && WEBHOOK_URL) {
  app.post(WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}

const server = app.listen(PORT, () => {
  console.log(`═══════════════════════════════════════════════`);
  console.log(`  🤖 Star Dominion Telegram Bot`);
  console.log(`  Mode: ${USE_WEBHOOK ? "Webhook" : "Polling"}`);
  console.log(`  Port: ${PORT}`);
  console.log(`  GAME_URL: ${GAME_URL}`);
  console.log(`═══════════════════════════════════════════════`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  console.error(`[SERVER ERROR] Failed to bind port ${PORT}:`, err.message);
});

if (USE_WEBHOOK && WEBHOOK_URL) {
  bot
    .setWebHook(`${WEBHOOK_URL}${WEBHOOK_PATH}`)
    .then(() => {
      console.log(`[WEBHOOK] Set to ${WEBHOOK_URL}${WEBHOOK_PATH}`);
    })
    .catch((err) => {
      console.error(`[WEBHOOK] Failed to set webhook:`, err.message);
    });
}

console.log(`[BOT] Star Dominion Telegram Bot started successfully`);
console.log(`[BOT] Token: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`[BOT] Game URL: ${GAME_URL}`);

// ─── Heartbeat ──────────────────────────────────────────────────────────────
setInterval(() => {
  console.log(`[HEARTBEAT] alive, uptime=${Math.floor(process.uptime())}s`);
}, 30_000);

// ─── Global Error Handlers ──────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error(`[FATAL] Uncaught exception:`, err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(`[FATAL] Unhandled rejection at:`, promise, "reason:", reason);
});

process.on("SIGTERM", () => {
  console.log(`[BOT] Received SIGTERM, shutting down...`);
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log(`[BOT] Received SIGINT, shutting down...`);
  process.exit(0);
});