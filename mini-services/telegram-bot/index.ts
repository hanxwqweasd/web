import TelegramBot from "node-telegram-bot-api";
import express from "express";

// ─── Configuration ──────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || "8945065009:AAHqr6U-n11Mo48rKiL_Ib9DtAxJktQ4-B0";
// In production, set GAME_URL to your actual mini app URL
// For local testing, Telegram won't open local URLs, so use your public domain
const GAME_URL = process.env.GAME_URL || "https://t.me/StarDominionBot/StarDominion";
const PORT = parseInt(process.env.PORT || "3001", 10);
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/telegram-webhook";

// Use polling in development, webhook in production
const USE_WEBHOOK = process.env.USE_WEBHOOK === "true";
const WEBHOOK_URL = process.env.WEBHOOK_URL || ""; // e.g. https://yourdomain.com/telegram-webhook

// ─── Bot Initialization ──────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, {
  webHook: USE_WEBHOOK,
});

// ─── Welcome Message ────────────────────────────────────────────────────────
const WELCOME_MESSAGE = `🚀 *STAR DOMINION*

Добро пожаловать, Капитан!
Вы назначены командиром заброшенной космической станции в секторе Андромеда\\-7\\.

🏰 *Стройте и развивайте станцию*
⚗️ *Исследуйте технологии*
🚀 *Создавайте флот и побеждайте пиратов*
🗺️ *Исследуйте карту сектора*

Присоединяйтесь к тысячам капитанов, которые уже строят свою империю среди звёзд\\!`;

// ─── Help Message ───────────────────────────────────────────────────────────
const HELP_MESSAGE = `📖 *Справочник Star Dominion*

🎮 *Об игре:*
Star Dominion — это глубокая космическая стратегия и симулятор колонии\\. Управляйте космической станцией в загадочном секторе Андромеда\\-7\\.

🏗️ *Строительство:*
• Стройте модули: Генераторы, Майнеры, Лаборатории, Верфи и другие
• Улучшайте модули для увеличения эффективности
• Управляйте комнатами станции

🔬 *Исследования:*
• 4 ветки технологий: Военная, Инженерная, Биологическая, Психо\\-Энергетическая
• Открывайте новые модули и возможности
• Прокачивайте свою станцию

🚀 *Флот:*
• Стройте корабли разных классов
• Создавайте эскадры
• Сражайтесь с пиратами и другими игроками

🗺️ *Карта сектора:*
• Исследуйте узлы сектора Андромеда\\-7
• Находите ресурсы и артефакты
• Защищайте свои территории

💰 *Ресурсы:*
• ⚡ Энергия — питание станции
• 🪨 Минералы — строительные материалы
• 🧪 Данные — для исследований
• 💎 Кристаллы — премиум валюта

❓ *Команды бота:*
/start — Начать игру
/help — Эта справка

Играйте прямо в Telegram — никакого скачивания не требуется!`;

// ─── /start Command ─────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const webAppButton: TelegramBot.InlineKeyboardButton = {
    text: "🚀 Начать Играть",
    web_app: {
      url: GAME_URL,
    },
  };

  const inlineKeyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [[webAppButton]],
  };

  bot
    .sendMessage(chatId, WELCOME_MESSAGE, {
      parse_mode: "MarkdownV2",
      reply_markup: inlineKeyboard,
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to send /start to chat ${chatId}:`, err.message);
      // Fallback without MarkdownV2 if parsing fails
      const plainMessage = WELCOME_MESSAGE.replace(/[*_~`\\()!#\[\]{}|+.]/g, "");
      bot.sendMessage(chatId, plainMessage, {
        reply_markup: inlineKeyboard,
      }).catch(() => {});
    });
});

// ─── /help Command ───────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  bot
    .sendMessage(chatId, HELP_MESSAGE, {
      parse_mode: "MarkdownV2",
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to send /help to chat ${chatId}:`, err.message);
      // Fallback without MarkdownV2
      const plainMessage = HELP_MESSAGE.replace(/[*_~`\\()!#\[\]{}|+.]/g, "");
      bot.sendMessage(chatId, plainMessage).catch(() => {});
    });
});

// ─── Pre-Checkout Query (Telegram Stars) ────────────────────────────────────
bot.on("pre_checkout_query", (query) => {
  console.log(
    `[STARS] Pre-checkout query from user ${query.from.id}:`,
    `invoice_payload=${query.invoice_payload},`,
    `total_amount=${query.total_amount}`,
  );

  // Always answer OK for now — the game will validate purchases
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

  const confirmationMessage = `✅ *Оплата прошла успешно!*

Спасибо за покупку, Капитан!
${payment.invoice_payload ? `📦 Предмет: ${payment.invoice_payload}` : ""}

Ваquelı bolster продолжает развиваться благодаря вашей поддержке\\. Скоро увидимся в секторе Андромеда\\-7! ⭐`;

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
  // Ignore commands (handled above)
  if (msg.text?.startsWith("/")) return;

  const chatId = msg.chat.id;
  console.log(`[MSG] User ${msg.from?.id || "unknown"} (${chatId}): ${msg.text?.substring(0, 100) || "[non-text]"}`);

  // If user sends any text, show the game button again
  const webAppButton: TelegramBot.InlineKeyboardButton = {
    text: "🚀 Начать Играть",
    web_app: {
      url: GAME_URL,
    },
  };

  const inlineKeyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [[webAppButton]],
  };

  bot.sendMessage(chatId, "🎮 Чтобы начать играть, нажмите кнопку ниже:", {
    reply_markup: inlineKeyboard,
  }).catch(() => {});
});

// ─── Error Handling ─────────────────────────────────────────────────────────
bot.on("polling_error", (err) => {
  console.error(`[POLLING ERROR] ${err.code}: ${err.message}`);
});

bot.on("webhook_error", (err) => {
  console.error(`[WEBHOOK ERROR] ${err.code || "unknown"}: ${err.message}`);
});

// ─── Express Server (for webhook endpoint) ────────────────────────────────
const app = express();

app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", bot: "star-dominion", uptime: process.uptime() });
});

// Webhook endpoint for Telegram
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

// ─── Set Webhook if Enabled ──────────────────────────────────────────────────
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

// ─── Startup Log ────────────────────────────────────────────────────────────
console.log(`[BOT] Star Dominion Telegram Bot started successfully`);
console.log(`[BOT] Token: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`[BOT] Game URL: ${GAME_URL}`);
