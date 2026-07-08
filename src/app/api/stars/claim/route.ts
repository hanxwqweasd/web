import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DONATION_REWARDS: Record<string, {
  minerals: number; energy: number; bioMatter: number; crystals: number; starShards: number;
  message: string;
}> = {
  support: {
    minerals: 500, energy: 500, bioMatter: 200, crystals: 0, starShards: 10,
    message: '🌟 Спасибо за поддержку! +500 ресурсов и 10 осколков',
  },
  ally: {
    minerals: 5000, energy: 3000, bioMatter: 1000, crystals: 0, starShards: 100,
    message: '🚀 Союзник! +5000 минералов, +100 осколков',
  },
  patron: {
    minerals: 5000, energy: 5000, bioMatter: 2000, crystals: 100, starShards: 500,
    message: '💎 Покровитель! Все ресурсы +5000, +100 кристаллов, +500 осколков',
  },
  legend: {
    minerals: 10000, energy: 10000, bioMatter: 5000, crystals: 500, starShards: 2000,
    message: '👑 Легенда! Мега-пакет: все ресурсы +10000, +500 кристаллов, +2000 осколков',
  },
};

// Simple rate-limit: prevent claiming same tier more than once per minute per user
const recentClaims = new Map<string, number>();
const CLAIM_COOLDOWN = 60_000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, telegramUserId } = body as { itemId: string; telegramUserId: string };

    if (!itemId || !telegramUserId) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const rewards = DONATION_REWARDS[itemId];
    if (!rewards) {
      return NextResponse.json({ success: false, error: 'Unknown tier' }, { status: 400 });
    }

    // Rate limit check
    const claimKey = `${telegramUserId}:${itemId}`;
    const lastClaim = recentClaims.get(claimKey);
    if (lastClaim && Date.now() - lastClaim < CLAIM_COOLDOWN) {
      return NextResponse.json({ success: false, error: 'Слишком частый запрос, подождите' }, { status: 429 });
    }
    recentClaims.set(claimKey, Date.now());

    // Clean old entries periodically
    if (recentClaims.size > 500) {
      const now = Date.now();
      for (const [key, time] of recentClaims) {
        if (now - time > CLAIM_COOLDOWN) recentClaims.delete(key);
      }
    }

    // Find or create player and grant rewards
    const tgId = parseInt(telegramUserId, 10);
    if (isNaN(tgId)) {
      return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
    }

    try {
      await db.player.upsert({
        where: { telegramUserId: tgId },
        update: {
          energy: { increment: rewards.energy },
          minerals: { increment: rewards.minerals },
          bioMatter: { increment: rewards.bioMatter },
          crystals: { increment: rewards.crystals },
          starShards: { increment: rewards.starShards },
        },
        create: {
          telegramUserId: tgId,
          captainName: `Captain-${tgId}`,
          energy: rewards.energy + 500,
          minerals: rewards.minerals + 300,
          bioMatter: rewards.bioMatter + 100,
          crystals: rewards.crystals + 50, // base 50 + reward
          starShards: rewards.starShards, // base 0 + reward
        },
      });

      console.log(`[Stars Claim] Granted ${itemId} to user ${tgId}`);
      return NextResponse.json({ success: true, message: rewards.message });
    } catch (dbError) {
      console.error('[Stars Claim] DB error:', dbError);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Stars Claim] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}