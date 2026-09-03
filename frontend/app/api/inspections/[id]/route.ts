import { NextResponse } from 'next/server';

import { ensureDatabase, getDb, InspectionRow, presentInspection } from '@/lib/db';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    damageTypes?: string[];
    reviewLevel?: number;
    reviewNote?: string;
    reviewer?: string;
    feedbackStatus?: 'returned';
  };

  const db = getDb();
  await ensureDatabase(db);

  if (body.feedbackStatus === 'returned') {
    await db.prepare("UPDATE inspections SET feedback_status = 'returned', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), id).run();
    const updated = await db.prepare('SELECT * FROM inspections WHERE id = ?').bind(id).first<InspectionRow>();
    if (!updated) return NextResponse.json({ error: '检测记录不存在' }, { status: 404 });
    return NextResponse.json({ record: presentInspection(updated) });
  }

  if (!body.reviewLevel || body.reviewLevel < 1 || body.reviewLevel > 4) {
    return NextResponse.json({ error: '请选择有效的复核等级' }, { status: 400 });
  }

  const existing = await db.prepare('SELECT id FROM inspections WHERE id = ?').bind(id).first();
  if (!existing) return NextResponse.json({ error: '检测记录不存在' }, { status: 404 });

  await db
    .prepare(`UPDATE inspections SET
      damage_types = COALESCE(?, damage_types),
      review_level = ?,
      review_note = ?,
      reviewer = ?,
      status = 'reviewed',
      updated_at = ?
    WHERE id = ?`)
    .bind(
      body.damageTypes ? JSON.stringify(body.damageTypes) : null,
      body.reviewLevel,
      body.reviewNote?.trim() || null,
      body.reviewer?.trim() || '检测专员',
      new Date().toISOString(),
      id,
    )
    .run();

  const updated = await db.prepare('SELECT * FROM inspections WHERE id = ?').bind(id).first<InspectionRow>();
  return NextResponse.json({ record: presentInspection(updated!) });
}
