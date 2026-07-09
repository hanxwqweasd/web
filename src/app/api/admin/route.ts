import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/admin/stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    // Stats endpoint
    if (path === 'stats') {
      const totalPlayers = await db.player.count();
      const avgRating = await db.player.aggregate({ _avg: { rating: true } });
      const avgLevel = await db.player.aggregate({ _avg: { level: true } });
      const totalPvp = await db.player.aggregate({ _sum: { pvpWins: true, pvpLosses: true } });
      const totalMined = await db.player.aggregate({ _sum: { totalMineralsMined: true } });

      // Faction distribution
      const factions = await db.player.groupBy({ by: ['faction'], _count: { faction: true } });
      const topFactions: Record<string, number> = {};
      for (const f of factions) {
        if (f.faction) topFactions[f.faction] = f._count.faction;
      }

      return NextResponse.json({
        totalPlayers,
        averageRating: Math.round(avgRating._avg.rating || 0),
        averageLevel: Math.round((avgLevel._avg.level || 0) * 10) / 10,
        totalPvpBattles: (totalPvp._sum.pvpWins || 0) + (totalPvp._sum.pvpLosses || 0),
        totalPvpWins: totalPvp._sum.pvpWins || 0,
        totalMineralsMined: totalMined._sum.totalMineralsMined || 0,
        topFactions,
      });
    }

    // Players list endpoint
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const where: Prisma.PlayerWhereInput = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { firstName: { contains: search } },
        { captainName: { contains: search } },
        { telegramUserId: { equals: search } },
      ];
    }

    const [players, total] = await Promise.all([
      db.player.findMany({
        where,
        select: {
          id: true, telegramUserId: true, username: true, firstName: true, lastName: true,
          faction: true, rating: true, level: true, stationLevel: true, captainName: true,
          pvpWins: true, pvpLosses: true, energy: true, minerals: true, crystals: true,
          starShards: true, isAdmin: true, isBanned: true, createdAt: true, lastLoginAt: true,
        },
        orderBy: { rating: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.player.count({ where }),
    ]);

    return NextResponse.json({
      players,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[Admin API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}