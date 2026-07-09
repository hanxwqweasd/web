import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/admin/players?page=1&limit=20&search=test
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100)
    const search = searchParams.get('search')?.trim() || ''

    const where: Prisma.PlayerWhereInput = {}
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { firstName: { contains: search } },
        { telegramUserId: { equals: search } },
      ].filter((clause) => clause !== undefined) as Prisma.PlayerWhereInput[]
    }

    const [players, total] = await Promise.all([
      db.player.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.player.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      players,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/admin/players error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}