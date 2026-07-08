import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/leaderboard/me?telegramUserId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramUserId = searchParams.get('telegramUserId')

    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'telegramUserId is required' },
        { status: 400 }
      )
    }

    const player = await db.player.findUnique({
      where: { telegramUserId: parseInt(telegramUserId, 10) },
      select: {
        rating: true,
        level: true,
        pvpWins: true,
        totalBattlesWon: true,
      },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    const totalPlayers = await db.player.count({ where: { isBanned: false } })

    // Calculate rank for each category by counting players with strictly higher values
    const [ratingRank, levelRank, pvpWinsRank, battlesRank] = await Promise.all([
      db.player.count({
        where: {
          isBanned: false,
          rating: { gt: player.rating },
        },
      }),
      db.player.count({
        where: {
          isBanned: false,
          level: { gt: player.level },
        },
      }),
      db.player.count({
        where: {
          isBanned: false,
          pvpWins: { gt: player.pvpWins },
        },
      }),
      db.player.count({
        where: {
          isBanned: false,
          totalBattlesWon: { gt: player.totalBattlesWon },
        },
      }),
    ])

    return NextResponse.json({
      rating: { rank: ratingRank + 1, total: totalPlayers },
      level: { rank: levelRank + 1, total: totalPlayers },
      pvpWins: { rank: pvpWinsRank + 1, total: totalPlayers },
      battles: { rank: battlesRank + 1, total: totalPlayers },
    })
  } catch (error) {
    console.error('GET /api/leaderboard/me error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}