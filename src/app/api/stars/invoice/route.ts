import { NextRequest, NextResponse } from 'next/server';

const STARS_DONATION_ITEMS: Record<string, { name: string; description: string; cost: number }> = {
  support: { name: 'Поддержка', description: 'Спасибо за поддержку!', cost: 1 },
  ally: { name: 'Союзник', description: '5000 минералов + бонусы', cost: 5 },
  patron: { name: 'Покровитель', description: 'Все ресурсы + 500 осколков', cost: 25 },
  legend: { name: 'Легенда', description: 'Мега-пакет ресурсов', cost: 100 },
};

const BOT_TOKEN = process.env.BOT_TOKEN || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, telegramUserId } = body as { itemId: string; telegramUserId: string };

    if (!itemId || !telegramUserId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const item = STARS_DONATION_ITEMS[itemId];
    if (!item) {
      return NextResponse.json({ error: `Unknown item: ${itemId}` }, { status: 404 });
    }

    if (!BOT_TOKEN) {
      console.error('[Stars Invoice] BOT_TOKEN not configured');
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Star Dominion — ${item.name}`,
        description: item.description,
        payload: `${itemId}:${telegramUserId}`,
        currency: 'XTR',
        prices: [{ label: 'Stars', amount: item.cost }],
      }),
    });

    const data = await response.json() as { ok: boolean; result?: { url: string }; description?: string };

    if (!data.ok || !data.result?.url) {
      console.error('[Stars Invoice] API error:', data.description);
      return NextResponse.json({ error: data.description || 'Invoice creation failed' }, { status: 500 });
    }

    return NextResponse.json({ url: data.result.url });
  } catch (error) {
    console.error('[Stars Invoice] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}