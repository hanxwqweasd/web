import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/admin/stats
export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalPlayers,
      activeToday,
      allPlayers,
    ] = await Promise.all([
      db.player.count(),
      db.player.count({
        where: { lastLoginAt: { gte: today } },
      }),
      db.player.findMany({
        select: {
          rating: true,
          level: true,
          pvpWins: true,
          pvpLosses: true,
          totalMineralsMined: true,
          faction: true,
          level: true,
        },
      }),
    ])

    const totalPvpBattles = allPlayers.reduce((sum, p) => sum + p.pvpWins + p.pvpLosses, 0)
    const totalMineralsMined = allPlayers.reduce((sum, p) => sum + p.totalMineralsMined, 0)
    const averageRating = allPlayers.length > 0
      ? Math.round(allPlayers.reduce((sum, p) => sum + p.rating, 0) / allPlayers.length)
      : 0
    const averageLevel = allPlayers.length > 0
      ? Math.round(allPlayers.reduce((sum, p) => sum + p.level, 0) / allPlayers.length * 10) / 10
      : 0

    // Count by faction
    const topFactions: Record<string, number> = {}
    for (const p of allPlayers) {
      const faction = p.faction || 'Не выбрана'
      topFactions[faction] = (topFactions[faction] || 0) + 1
    }

    // Count by level ranges
    const playersByLevel: Record<string, number> = {}
    for (const p of allPlayers) {
      const range = p.level <= 5 ? '1-5' : p.level <= 10 ? '6-10' : p.level <= 20 ? '11-20' : p.level <= 50 ? '21-50' : '51+'
      playersByLevel[range] = (playersByLevel[range] || 0) + 1
    }

    return NextResponse.json({
      totalPlayers,
      activeToday,
      totalPvpBattles,
      totalMineralsMined,
      averageRating,
      averageLevel,
      topFactions,
      playersByLevel,
    })
  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}