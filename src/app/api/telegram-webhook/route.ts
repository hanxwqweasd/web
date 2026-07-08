import { NextRequest, NextResponse } from "next/server";

const TOKEN = "8945065009:AAHqr6U-n11Mo48rKiL_Ib9DtAxJktQ4-B0";
const API = `https://api.telegram.org/bot${TOKEN}`;
const GAME_URL = "https://t.me/StarDominionBot/StarDominion";

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

async function tgApi(method: string, body: Record<string, unknown>) {
  return fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendMarkdown(chatId: number, text: string, keyboard?: object) {
  try {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  } catch {
    const plain = text.replace(/[*_~`\\()!#\[\]{}|+.]/g, "");
    await tgApi("sendMessage", { chat_id: chatId, text: plain, reply_markup: keyboard });
  }
}

function handleUpdate(update: any) {
  const msg = update.message;
  const cbq = update.callback_query;

  if (msg?.text) {
    const chatId = msg.chat.id;
    if (msg.text === "/start" || msg.text.startsWith("/start ")) {
      sendMarkdown(chatId, WELCOME, KEYBOARD);
    } else if (msg.text === "/help") {
      sendMarkdown(chatId, FULL_INFO, KEYBOARD);
    } else {
      sendMarkdown(chatId, "🎮 Чтобы начать играть, нажмите кнопку ниже:", KEYBOARD);
    }
  }

  if (cbq?.data === "show_info") {
    const chatId = cbq.message?.chat?.id;
    if (chatId) {
      tgApi("answerCallbackQuery", { callback_query_id: cbq.id });
      sendMarkdown(chatId, FULL_INFO, KEYBOARD);
    }
  }

  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    console.log(`[WEBHOOK] Pre-checkout: user=${q.from.id} payload=${q.invoice_payload}`);
    tgApi("answerPreCheckoutQuery", { pre_checkout_query_id: q.id, ok: true });
  }

  if (msg?.successful_payment) {
    const p = msg.successful_payment;
    console.log(`[WEBHOOK] Payment: user=${msg.from.id} amount=${p.total_amount}`);
    sendMarkdown(
      msg.chat.id,
      "✅ *Оплата прошла успешно\\!\n\nСпасибо за покупку, Капитан\\!\n\nStar Dominion продолжает развиваться\\. Увидимся в секторе Андромеда\\-7\\! ⭐",
    );
  }
}

// POST — Telegram sends updates here
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    console.log("[WEBHOOK] Received update:", update.update_id);
    handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WEBHOOK] Error:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// GET — Setup webhook (call from browser to configure)
export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "unknown";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const webhookUrl = `${proto}://${host}/api/telegram-webhook`;

  const res = await fetch(
    `https://api.telegram.org/bot${TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
  );
  const data = (await res.json()) as Record<string, unknown>;

  return NextResponse.json({
    webhookUrl,
    telegramResponse: data,
    message: data.ok
      ? `Webhook set to ${webhookUrl}`
      : `Failed: ${data.description}`,
  });
}