// Zero-dependency Telegram bot using native fetch
// Auto-restarts polling on any error

const TOKEN = "8945065009:AAHqr6U-n11Mo48rKiL_Ib9DtAxJktQ4-B0";
const GAME_URL = "https://t.me/StarDominionBot/StarDominion";
const API = `https://api.telegram.org/bot${TOKEN}`;

const WELCOME = `🚀 *STAR DOMINION*

Добро пожаловать, Капитан\\!
Вы назначены командиром заброшенной космической станции в секторе Андромеда\\-7\\.

🏰 Стройте и развивайте станцию
⚗️ Исследуйте технологии
🚀 Создавайте флот и побеждайте пиратов
🗺️ Исследуйте карту сектора

Присоединяйтесь к тысячам капитанов, которые уже строят свою империю среди звёзд\\!`;

const FULL_INFO = `📖 *Полная информация — Star Dominion*

🎮 *Об игре:*
Star Dominion — это глубокая космическая стратегия и симулятор колонии\\. Управляйте космической станцией в загадочном секторе Андромеда\\-7\\.

🏗️ *Строительство:*
• Стройте модули: Генераторы, Майнеры, Лаборатории, Верфи и другие
• Улучшайте модули для увеличения эффективности
• Управляйте комнатами станции

🔬 *Исследования:*
• 4 ветки технологий: Военная, Инженерная, Биологическая, Психо\\-Энергетическая
• Открывайте новые модули и возможности

🚀 *Флот:*
• Стройте корабли разных классов
• Создавайте эскадры
• Сражайтесь с пиратами и другими игроками

🗺️ *Карта сектора:*
• Исследуйте узлы сектора Андромеда\\-7
• Находите ресурсы и артефакты

💰 *Ресурсы:*
• ⚡ Энергия — питание станции
• 🪨 Минералы — строительные материалы
• 🧪 Данные — для исследований
• 💎 Кристаллы — премиум валюта

🏆 *Профиль и Рейтинг:*
• Отслеживайте свои достижения
• Соревнуйтесь с другими капитанами

👥 *Реферальная система:*
• Приглашайте друзей и получайте бонусы

❓ *Команды:*
/start — Начать игру
/help — Справка

Играйте прямо в Telegram\\!`;

const KEYBOARD = {
  inline_keyboard: [
    [
      { text: "🚀 Начать Играть", web_app: { url: GAME_URL } },
      { text: "📖 Полная информация", callback_data: "show_info" },
    ],
  ],
};

let offset = 0;

async function api(method, body = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(chatId, text, keyboard) {
  try {
    await api("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  } catch {
    // fallback plain text
    const plain = text.replace(/[*_~`\\()!#\[\]{}|+.]/g, "");
    await api("sendMessage", { chat_id: chatId, text: plain, reply_markup: keyboard });
  }
}

async function answerCallback(callbackQueryId) {
  await api("answerCallbackQuery", { callback_query_id: callbackQueryId });
}

function handleUpdate(update) {
  const msg = update.message;
  const cbq = update.callback_query;

  if (msg && msg.text) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === "/start" || text === "/start StarDominion") {
      sendMessage(chatId, WELCOME, KEYBOARD);
    } else if (text === "/help") {
      sendMessage(chatId, FULL_INFO, KEYBOARD);
    } else {
      sendMessage(chatId, "🎮 Чтобы начать играть, нажмите кнопку ниже:", KEYBOARD);
    }
  }

  if (cbq && cbq.data === "show_info") {
    const chatId = cbq.message?.chat?.id;
    if (chatId) {
      answerCallback(cbq.id);
      sendMessage(chatId, FULL_INFO, KEYBOARD);
    }
  }

  // Handle pre_checkout_query
  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    console.log(`[BOT] Pre-checkout: user=${q.from.id} payload=${q.invoice_payload} amount=${q.total_amount}`);
    api("answerPreCheckoutQuery", { pre_checkout_query_id: q.id, ok: true });
  }

  // Handle successful_payment
  if (msg?.successful_payment) {
    const p = msg.successful_payment;
    console.log(`[BOT] Payment: user=${msg.from.id} payload=${p.invoice_payload} amount=${p.total_amount}`);
    sendMessage(msg.chat.id,
      `✅ *Оплата прошла успешно\\!\n\nСпасибо за покупку, Капитан\\!\n\nStar Dominion продолжает развиваться благодаря вашей поддержке\\. Скоро увидимся в секторе Андромеда\\-7\\! ⭐`
    );
  }
}

async function poll() {
  while (true) {
    try {
      const result = await api("getUpdates", { offset, timeout: 30 });
      if (result.ok && result.result?.length > 0) {
        for (const update of result.result) {
          handleUpdate(update);
          offset = update.update_id + 1;
        }
      }
    } catch (err) {
      console.error(`[BOT] Poll error:`, err?.message || err);
      await new Promise((r) => setTimeout(r, 5000)); // wait before retry
    }
  }
}

// Start
console.log("[BOT] Star Dominion Bot starting (zero-dep mode)...");
console.log(`[BOT] Token: ${TOKEN.substring(0, 10)}...`);
console.log(`[BOT] Game URL: ${GAME_URL}`);
poll().catch((err) => {
  console.error("[BOT] Fatal poll error:", err);
  process.exit(1);
});