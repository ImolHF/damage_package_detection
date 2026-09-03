import { NextResponse } from 'next/server';

import { ensureDatabase, getDb, InspectionRow, presentInspection } from '@/lib/db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getAssignedRole } from '@/lib/roles';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const role = await getAssignedRole(user.userId);
  if (!role) return NextResponse.json({ error: '请先选择身份' }, { status: 403 });
  const db = getDb();
  await ensureDatabase(db);
  const query = role === 'staff'
    ? db.prepare('SELECT * FROM inspections ORDER BY created_at DESC LIMIT 100')
    : db.prepare('SELECT * FROM inspections WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 100').bind(user.userId);
  const { results } = await query.all<InspectionRow>();
  return NextResponse.json({ records: results.map(presentInspection) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const role = await getAssignedRole(user.userId);
  if (role !== 'user') return NextResponse.json({ error: '仅使用者可以提交检测任务' }, { status: 403 });
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
      status, is_demo, created_at, updated_at, owner_user_id, inference_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 0, ?, ?, ?, ?)`) 
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
      user.userId,
      140 + Math.floor(Math.random() * 90),
    )
    .run();

  const saved = await db.prepare('SELECT * FROM inspections WHERE id = ?').bind(id).first<InspectionRow>();
  return NextResponse.json({ record: presentInspection(saved!) }, { status: 201 });
}
