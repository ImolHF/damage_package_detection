import { env } from 'cloudflare:workers';

export type InspectionRow = {
  id: string;
  task_no: string;
  waybill: string;
  order_no: string | null;
  scene: string;
  damage_types: string;
  confidence: number;
  ai_level: number;
  review_level: number | null;
  review_note: string | null;
  reviewer: string | null;
  status: string;
  is_demo: number;
  created_at: string;
  updated_at: string;
};

export function getDb() {
  return (env as unknown as { DB: D1Database }).DB;
}

export async function ensureDatabase(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY NOT NULL,
      task_no TEXT NOT NULL UNIQUE,
      waybill TEXT NOT NULL,
      order_no TEXT,
      scene TEXT NOT NULL DEFAULT 'warehouse',
      damage_types TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      ai_level INTEGER NOT NULL,
      review_level INTEGER,
      review_note TEXT,
      reviewer TEXT,
      status TEXT NOT NULL DEFAULT 'pending_review',
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS inspections_task_no_unique ON inspections(task_no)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status)'),
  ]);

  const count = await db.prepare('SELECT COUNT(*) AS count FROM inspections').first<{ count: number }>();
  if ((count?.count ?? 0) === 0) {
    const samples = [
      ['demo-001', 'JC20260902-001', 'JDVA20260902001', 'TH20260902001', 'warehouse', '["破洞","撕裂"]', 95, 3, null, null, null, 'pending_review', 1, '2026-09-02T09:18:00.000Z', '2026-09-02T09:18:00.000Z'],
      ['demo-002', 'JC20260902-002', 'JDVA20260902002', 'TH20260902002', 'courier', '["浸湿"]', 91, 2, 2, '浸湿面积较小，内部商品完好，调整为二级。', '李明', 'reviewed', 1, '2026-09-02T08:36:00.000Z', '2026-09-02T08:55:00.000Z'],
      ['demo-003', 'JC20260902-003', 'JDVA20260902003', 'TH20260902003', 'customer', '["压瘪","胶带异常"]', 87, 2, null, null, null, 'pending_review', 1, '2026-09-01T15:22:00.000Z', '2026-09-01T15:22:00.000Z'],
    ] as const;

    await db.batch(
      samples.map((sample) =>
        db.prepare(`INSERT OR IGNORE INTO inspections (
          id, task_no, waybill, order_no, scene, damage_types, confidence, ai_level,
          review_level, review_note, reviewer, status, is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...sample),
      ),
    );
  }

  await db.prepare('PRAGMA optimize').run();
}

export function presentInspection(row: InspectionRow) {
  return {
    id: row.id,
    taskNo: row.task_no,
    waybill: row.waybill,
    orderNo: row.order_no ?? '',
    scene: row.scene,
    damageTypes: JSON.parse(row.damage_types) as string[],
    confidence: row.confidence,
    aiLevel: row.ai_level,
    reviewLevel: row.review_level,
    reviewNote: row.review_note ?? '',
    reviewer: row.reviewer ?? '',
    status: row.status,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
