import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/admin/player/[id] — Edit player
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.player.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Handle special actions
    if (body.action) {
      switch (body.action) {
        case 'addResources': {
          const res = body.resources || {};
          const data: Record<string, number> = {};
          if (res.energy) data.energy = { increment: res.energy };
          if (res.minerals) data.minerals = { increment: res.minerals };
          if (res.bioMatter) data.bioMatter = { increment: res.bioMatter };
          if (res.crystals) data.crystals = { increment: res.crystals };
          if (res.starShards) data.starShards = { increment: res.starShards };
          const updated = await db.player.update({ where: { id }, data: data as any });
          return NextResponse.json({ player: updated, message: 'Ресурсы добавлены' });
        }
        case 'setRating':
          return NextResponse.json({
            player: await db.player.update({ where: { id }, data: { rating: body.value } }),
            message: `Рейтинг установлен: ${body.value}`,
          });
        case 'setLevel':
          return NextResponse.json({
            player: await db.player.update({ where: { id }, data: { level: body.value, stationLevel: body.value } }),
            message: `Уровень установлен: ${body.value}`,
          });
        case 'ban':
          return NextResponse.json({
            player: await db.player.update({ where: { id }, data: { isBanned: true, banReason: body.reason || 'Заблокирован администратором' } }),
            message: 'Игрок заблокирован',
          });
        case 'unban':
          return NextResponse.json({
            player: await db.player.update({ where: { id }, data: { isBanned: false, banReason: null } }),
            message: 'Игрок разблокирован',
          });
        case 'setAdmin':
          return NextResponse.json({
            player: await db.player.update({ where: { id }, data: { isAdmin: body.value } }),
            message: body.value ? 'Права администратора выданы' : 'Права администратора сняты',
          });
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    // Direct field update
    const {
      action: _a, resources: _r, value: _v, reason: _re,
      ...updateData
    } = body;

    const player = await db.player.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ player, message: 'Игрок обновлён' });
  } catch (error) {
    console.error('[Admin Player API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/player/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.player.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Soft delete via ban
    await db.player.update({
      where: { id },
      data: { isBanned: true, banReason: 'Удалён администратором' },
    });

    return NextResponse.json({ message: 'Игрок удалён (заблокирован)' });
  } catch (error) {
    console.error('[Admin Player API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}