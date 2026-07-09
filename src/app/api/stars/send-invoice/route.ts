import { NextRequest, NextResponse } from 'next/server';

const STARS_DONATION_ITEMS: Record<string, { name: string; description: string; cost: number }> = {
  support: { name: 'Поддержка', description: 'Спасибо за поддержку! +500 ресурсов +10 осколков', cost: 1 },
  ally: { name: 'Союзник', description: '+5000 минералов, +3000 энергии, +100 осколков', cost: 5 },
  patron: { name: 'Покровитель', description: 'Все ресурсы +5000, +100 кристаллов, +500 осколков', cost: 25 },
  legend: { name: 'Легенда', description: 'Мега-пакет: все ресурсы +10000, +500 кристаллов, +2000 осколков', cost: 100 },
};

const BOT_TOKEN = process.env.BOT_TOKEN || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, telegramUserId } = body as { itemId: string; telegramUserId: string };

    if (!itemId || !telegramUserId) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const item = STARS_DONATION_ITEMS[itemId];
    if (!item) {
      return NextResponse.json({ success: false, error: 'Unknown item' }, { status: 400 });
    }

    if (!BOT_TOKEN) {
      console.error('[Send Invoice] BOT_TOKEN not configured');
      return NextResponse.json({ success: false, error: 'Payment not configured' }, { status: 500 });
    }

    const tgId = String(telegramUserId);
    if (!tgId) {
      return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
    }

    // Call Telegram sendInvoice API
    // This sends an invoice message directly to the user's chat with the bot
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: Number(tgId),
        title: `Star Dominion — ${item.name}`,
        description: item.description,
        payload: `${itemId}:${telegramUserId}`,
        currency: 'XTR',
        prices: [{ label: 'Stars', amount: item.cost }],
        provider_token: '', // Empty for XTR (Telegram Stars)
      }),
    });

    const data = await response.json() as { ok: boolean; description?: string; error_code?: number };

    if (!data.ok) {
      console.error('[Send Invoice] Telegram API error:', data.description, data.error_code);
      return NextResponse.json({
        success: false,
        error: data.description || `Ошибка Telegram (код ${data.error_code || '?'})`,
      }, { status: 500 });
    }

    console.log(`[Send Invoice] Invoice sent to user ${tgId} for ${itemId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Send Invoice] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}