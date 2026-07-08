import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

type SortField = 'rating' | 'level' | 'pvpWins' | 'totalBattlesWon';

const TOP3_REWARDS: Record<number, { crystals: number; starShards: string; description: string }> = {
  1: { crystals: 5000, starShards: '1000', description: '💎 5000 кристаллов + ⭐ 1000 осколков' },
  2: { crystals: 2000, starShards: '500', description: '💎 2000 кристаллов + ⭐ 500 осколков' },
  3: { crystals: 1000, starShards: '200', description: '💎 1000 кристаллов + ⭐ 200 осколков' },
};

const SORT_FIELDS: Record<SortField, Prisma.PlayerOrderByWithRelationInput> = {
  rating: { rating: 'desc' },
  level: { level: 'desc' },
  pvpWins: { pvpWins: 'desc' },
  totalBattlesWon: { totalBattlesWon: 'desc' },
};

// GET /api/leaderboard?type=rating&limit=50
// GET /api/leaderboard/me?telegramUserId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isMe = searchParams.get('me') !== null;
    const telegramUserId = searchParams.get('telegramUserId');

    if (isMe && telegramUserId) {
      // Return player's rank across all categories
      const results: Record<string, { rank: number; total: number }> = {};

      for (const [key, orderBy] of Object.entries(SORT_FIELDS) as [SortField, Prisma.PlayerOrderByWithRelationInput][]) {
        const allPlayers = await db.player.findMany({
          select: { id: true },
          orderBy,
        });

        const total = allPlayers.length;
        const rank = allPlayers.findIndex(p => {
          // We need the telegramUserId, so let's do it differently
          return true; // placeholder
        }) + 1;

        // Better approach: count players with better score
        const player = await db.player.findUnique({ where: { telegramUserId: parseInt(telegramUserId) } });
        if (!player) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        let betterCount: number;
        if (key === 'rating') {
          betterCount = await db.player.count({ where: { rating: { gt: player.rating } } });
        } else if (key === 'level') {
          betterCount = await db.player.count({ where: { level: { gt: player.level } } });
        } else if (key === 'pvpWins') {
          betterCount = await db.player.count({ where: { pvpWins: { gt: player.pvpWins } } });
        } else {
          betterCount = await db.player.count({ where: { totalBattlesWon: { gt: player.totalBattlesWon } } });
        }
        const totalPlayers = await db.player.count();

        const labelMap: Record<string, string> = { rating: 'Рейтинг', level: 'Уровень', pvpWins: 'PvP победы', totalBattlesWon: 'Всего битв' };
        results[labelMap[key]] = { rank: betterCount + 1, total: totalPlayers };
      }

      return NextResponse.json({ ranks: results });
    }

    // Regular leaderboard
    const type = (searchParams.get('type') || 'rating') as SortField;
    const limit = parseInt(searchParams.get('limit') || '50');

    const orderBy = SORT_FIELDS[type] || SORT_FIELDS.rating;

    const players = await db.player.findMany({
      select: {
        id: true,
        telegramUserId: true,
        username: true,
        firstName: true,
        rating: true,
        level: true,
        stationLevel: true,
        faction: true,
        pvpWins: true,
        totalBattlesWon: true,
        achievementCount: true,
        createdAt: true,
      },
      orderBy,
      take: limit,
    });

    const leaderboard = players.map((p, i) => ({
      rank: i + 1,
      ...p,
    }));

    return NextResponse.json({ leaderboard, top3Rewards: TOP3_REWARDS });
  } catch (error) {
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}