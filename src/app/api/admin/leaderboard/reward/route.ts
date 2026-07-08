import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const REWARDS = [
  { rank: 1, crystals: 5000, starShards: 1000 },
  { rank: 2, crystals: 2000, starShards: 500 },
  { rank: 3, crystals: 1000, starShards: 200 },
];

// POST /api/admin/leaderboard/reward — Distribute top 3 rewards
export async function POST() {
  try {
    const top3 = await db.player.findMany({
      orderBy: { rating: 'desc' },
      take: 3,
      select: { id: true, firstName: true, username: true, rating: true },
    });

    if (top3.length < 3) {
      return NextResponse.json({ error: 'Недостаточно игроков для награждения (минимум 3)' }, { status: 400 });
    }

    const rewarded = [];

    for (let i = 0; i < 3; i++) {
      const player = top3[i];
      const reward = REWARDS[i];

      await db.player.update({
        where: { id: player.id },
        data: {
          crystals: { increment: reward.crystals },
          starShards: { increment: reward.starShards },
        },
      });

      rewarded.push({
        rank: reward.rank,
        playerId: player.id,
        playerName: player.username || player.firstName,
        rating: player.rating,
        rewards: {
          crystals: reward.crystals,
          starShards: reward.starShards,
        },
      });
    }

    return NextResponse.json({
      message: 'Награды ТОП-3 распределены!',
      rewarded,
    });
  } catch (error) {
    console.error('[Admin Reward API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}