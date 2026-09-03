import { NextResponse } from 'next/server';

import { ensureDatabase, getDb, InspectionRow, presentInspection } from '@/lib/db';

export async function GET() {
  const db = getDb();
  await ensureDatabase(db);
  const { results } = await db
    .prepare('SELECT * FROM inspections ORDER BY created_at DESC LIMIT 100')
    .all<InspectionRow>();
  return NextResponse.json({ records: results.map(presentInspection) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    waybill?: string;
    orderNo?: string;
    scene?: string;
    damageTypes?: string[];
    confidence?: number;
    aiLevel?: number;
  };

  if (!body.waybill?.trim()) {
    return NextResponse.json({ error: '运单号不能为空' }, { status: 400 });
  }

  const db = getDb();
  await ensureDatabase(db);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const taskNo = `JC${Date.now().toString().slice(-10)}`;

  await db
    .prepare(`INSERT INTO inspections (
      id, task_no, waybill, order_no, scene, damage_types, confidence, ai_level,
      status, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 0, ?, ?)`) 
    .bind(
      id,
      taskNo,
      body.waybill.trim(),
      body.orderNo?.trim() || null,
      body.scene || 'warehouse',
      JSON.stringify(body.damageTypes ?? ['破洞', '撕裂']),
      body.confidence ?? 95,
      body.aiLevel ?? 3,
      now,
      now,
    )
    .run();

  const saved = await db.prepare('SELECT * FROM inspections WHERE id = ?').bind(id).first<InspectionRow>();
  return NextResponse.json({ record: presentInspection(saved!) }, { status: 201 });
}
