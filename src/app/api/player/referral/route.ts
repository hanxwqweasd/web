import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/player/referral?telegramUserId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramUserId = searchParams.get('telegramUserId');

    if (!telegramUserId) {
      return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 });
    }

    const player = await db.player.findUnique({
      where: { telegramUserId: String(telegramUserId) },
      include: { referrals: { select: { id: true, firstName: true, username: true, createdAt: true, level: true } } },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const referrer = player.referredByCode
      ? await db.player.findUnique({ where: { referralCode: player.referredByCode }, select: { firstName: true, username: true } })
      : null;

    return NextResponse.json({
      referralCode: player.referralCode,
      referralCount: player.referralCount,
      totalReferralReward: player.totalReferralReward,
      referredBy: referrer,
      referrals: player.referrals,
    });
  } catch (error) {
    console.error('[Referral API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/player/referral — Apply referral code
export async function POST(request: NextRequest) {
  try {
    const { telegramUserId: rawTgId, referralCode } = await request.json() as { telegramUserId: string | number; referralCode: string };
    const telegramUserId = String(rawTgId);

    if (!telegramUserId || !referralCode) {
      return NextResponse.json({ error: 'telegramUserId and referralCode are required' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramUserId } });
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (player.referredByCode) {
      return NextResponse.json({ error: 'Вы уже используете реферальный код' }, { status: 400 });
    }

    if (player.referralCode === referralCode) {
      return NextResponse.json({ error: 'Нельзя использовать свой собственный код' }, { status: 400 });
    }

    const referrer = await db.player.findUnique({ where: { referralCode } });
    if (!referrer) {
      return NextResponse.json({ error: 'Реферальный код не найден' }, { status: 404 });
    }

    if (referrer.telegramUserId === telegramUserId) {
      return NextResponse.json({ error: 'Нельзя использовать свой собственный код' }, { status: 400 });
    }

    // Apply referral
    const BONUS_MINERALS = 200;
    const BONUS_ENERGY = 100;
    const BONUS_SHARDS = 10;

    await db.$transaction([
      // Set referredBy on the new player and give bonus
      db.player.update({
        where: { telegramUserId },
        data: {
          referredByCode: referralCode,
          minerals: { increment: BONUS_MINERALS },
          energy: { increment: BONUS_ENERGY },
          starShards: { increment: BONUS_SHARDS },
        },
      }),
      // Increment referrer's count and give bonus
      db.player.update({
        where: { referralCode },
        data: {
          referralCount: { increment: 1 },
          minerals: { increment: BONUS_MINERALS },
          energy: { increment: BONUS_ENERGY },
          starShards: { increment: BONUS_SHARDS },
          totalReferralReward: { increment: BONUS_SHARDS + BONUS_MINERALS + BONUS_ENERGY },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Реферал применён! +${BONUS_MINERALS} минералов, +${BONUS_ENERGY} энергии, +${BONUS_SHARDS} осколков`,
      rewards: { minerals: BONUS_MINERALS, energy: BONUS_ENERGY, starShards: BONUS_SHARDS },
    });
  } catch (error) {
    console.error('[Referral API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}