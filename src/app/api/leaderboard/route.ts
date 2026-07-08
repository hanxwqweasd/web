import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

type SortField = 'rating' | 'level' | 'pvpWins' | 'totalBattlesWon';

const TOP3_REWARDS: Record<number, { crystals: number; starShards: number; description: string }> = {
  1: { crystals: 5000, starShards: 1000, description: '💎 5000 кристаллов + ⭐ 1000 осколков' },
  2: { crystals: 2000, starShards: 500, description: '💎 2000 кристаллов + ⭐ 500 осколков' },
  3: { crystals: 1000, starShards: 200, description: '💎 1000 кристаллов + ⭐ 200 осколков' },
};

const SORT_FIELDS: Record<SortField, Prisma.PlayerOrderByWithRelationInput> = {
  rating: { rating: 'desc' },
  level: { level: 'desc' },
  pvpWins: { pvpWins: 'desc' },
  totalBattlesWon: { totalBattlesWon: 'desc' },
};

// GET /api/leaderboard?type=rating&limit=50
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'rating') as SortField;
    const limit = parseInt(searchParams.get('limit') || '50');

    const orderBy = SORT_FIELDS[type] || SORT_FIELDS.rating;

    const players = await db.player.findMany({
      where: { isBanned: false },
      select: {
        telegramUserId: true,
        username: true,
        firstName: true,
        rating: true,
        level: true,
        stationLevel: true,
        faction: true,
        pvpWins: true,
        totalBattlesWon: true,
        createdAt: true,
      },
      orderBy,
      take: limit,
    });

    // Map to leaderboard format with the "value" field matching the sort type
    const playersWithRank = players.map((p, i) => {
      let value: number;
      switch (type) {
        case 'rating': value = p.rating; break;
        case 'level': value = p.level; break;
        case 'pvpWins': value = p.pvpWins; break;
        case 'totalBattlesWon': value = p.totalBattlesWon; break;
      }

      return {
        rank: i + 1,
        name: p.username ? `@${p.username}` : p.firstName,
        value,
        faction: (p.faction as 'traders' | 'military' | 'scientists') || 'military',
        level: p.level,
        telegramUserId: p.telegramUserId,
      };
    });

    return NextResponse.json({
      players: playersWithRank,
      top3Rewards: TOP3_REWARDS,
    });
  } catch (error) {
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json({ error: 'Internal server error', players: [] }, { status: 500 });
  }
}