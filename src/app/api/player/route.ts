import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';

// POST /api/player — Create or update player (upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tgId = String(body.telegramUserId);

    if (!tgId) {
      return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 });
    }

    const existing = await db.player.findUnique({ where: { telegramUserId: tgId } });

    if (existing) {
      // Update existing player
      const updated = await db.player.update({
        where: { telegramUserId: tgId },
        data: {
          username: body.username ?? existing.username,
          firstName: body.firstName ?? existing.firstName,
          lastName: body.lastName ?? existing.lastName,
          languageCode: body.languageCode ?? existing.languageCode,
          faction: body.faction ?? existing.faction,
          rating: body.rating ?? existing.rating,
          level: body.level ?? existing.level,
          stationLevel: body.stationLevel ?? existing.stationLevel,
          captainName: body.captainName ?? existing.captainName,
          energy: body.energy ?? existing.energy,
          minerals: body.minerals ?? existing.minerals,
          bioMatter: body.bioMatter ?? existing.bioMatter,
          crystals: body.crystals ?? existing.crystals,
          starShards: body.starShards ?? existing.starShards,
          sciencePoints: body.sciencePoints ?? existing.sciencePoints,
          pvpWins: body.pvpWins ?? existing.pvpWins,
          pvpLosses: body.pvpLosses ?? existing.pvpLosses,
          totalBattlesWon: body.totalBattlesWon ?? existing.totalBattlesWon,
          totalEnemiesDefeated: body.totalEnemiesDefeated ?? existing.totalEnemiesDefeated,
          totalMineralsMined: body.totalMineralsMined ?? existing.totalMineralsMined,
          researchedTechCount: body.researchedTechCount ?? existing.researchedTechCount,
          moduleCount: body.moduleCount ?? existing.moduleCount,
          shipCount: body.shipCount ?? existing.shipCount,
          achievementCount: body.achievementCount ?? existing.achievementCount,
          gameStateSnapshot: body.gameStateSnapshot ?? existing.gameStateSnapshot,
          lastLoginAt: new Date(),
          lastSaveAt: new Date(),
        },
      });
      return NextResponse.json({ player: updated, isNew: false });
    }

    // Create new player
    const referralCode = `SD-${uuid().substring(0, 6).toUpperCase()}`;
    const player = await db.player.create({
      data: {
        telegramUserId: tgId,
        username: body.username,
        firstName: body.firstName || 'Капитан',
        lastName: body.lastName,
        languageCode: body.languageCode,
        faction: body.faction,
        captainName: body.captainName || 'Капитан',
        rating: body.rating ?? 1000,
        level: body.level ?? 1,
        stationLevel: body.stationLevel ?? 1,
        energy: body.energy ?? 500,
        minerals: body.minerals ?? 500,
        bioMatter: body.bioMatter ?? 200,
        crystals: body.crystals ?? 50,
        starShards: body.starShards ?? 0,
        sciencePoints: body.sciencePoints ?? 0,
        referralCode,
        gameStateSnapshot: body.gameStateSnapshot,
      },
    });
    return NextResponse.json({ player, isNew: true });
  } catch (error) {
    console.error('[Player API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/player?telegramUserId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramUserId = searchParams.get('telegramUserId');

    if (!telegramUserId) {
      return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 });
    }

    const player = await db.player.findUnique({
      where: { telegramUserId: String(telegramUserId) },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (error) {
    console.error('[Player API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}