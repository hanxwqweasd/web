import { NextRequest, NextResponse } from 'next/server';

// Telegram Stars donation items (not the same as in-game shop items)
const STARS_DONATION_ITEMS: Record<string, { name: string; description: string; cost: number }> = {
  support: {
    name: 'Поддержка',
    description: 'Спасибо за поддержку!',
    cost: 1,
  },
  ally: {
    name: 'Союзник',
    description: 'Вы получаете 5000 минералов',
    cost: 5,
  },
  patron: {
    name: 'Покровитель',
    description: '5000 энергии + 5000 минералов + 100 кристаллов',
    cost: 25,
  },
  legend: {
    name: 'Легенда',
    description: 'Премиум на 7 дней + все ресурсы по 10000',
    cost: 100,
  },
};

const BOT_TOKEN = '8945065009:AAHqr6U-n11Mo48rKiL_Ib9DtAxJktQ4-B0';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, telegramUserId } = body as { itemId: string; telegramUserId: string };

    // Validate required fields
    if (!itemId || !telegramUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, telegramUserId' },
        { status: 400 }
      );
    }

    // Look up the donation item
    const item = STARS_DONATION_ITEMS[itemId];
    if (!item) {
      return NextResponse.json(
        { error: `Unknown donation item: ${itemId}` },
        { status: 404 }
      );
    }

    // Call Telegram's createInvoiceLink API
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Star Donation — ${item.name}`,
        description: item.description,
        payload: `${itemId}:${telegramUserId}`,
        currency: 'XTR', // Telegram Stars
        prices: [{ label: 'Stars', amount: item.cost }],
      }),
    });

    const data = await response.json() as { ok: boolean; result?: { url: string }; description?: string };

    if (!data.ok || !data.result?.url) {
      console.error('[Stars Invoice] Telegram API error:', data.description);
      return NextResponse.json(
        { error: data.description || 'Failed to create invoice link' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.result.url });
  } catch (error) {
    console.error('[Stars Invoice] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}