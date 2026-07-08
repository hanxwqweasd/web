import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/player/reset — Delete player from DB (full reset)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramUserId } = body;

    if (!telegramUserId) {
      return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 });
    }

    const tgId = parseInt(telegramUserId, 10);
    if (isNaN(tgId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await db.player.deleteMany({ where: { telegramUserId: tgId } });

    console.log(`[Player Reset] Deleted player ${tgId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Player Reset] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}