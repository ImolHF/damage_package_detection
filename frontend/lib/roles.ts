import { redirect } from 'next/navigation';
import { requireChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';
import { ensureDatabase, getDb } from '@/lib/db';

export type AppRole = 'user' | 'staff';

export async function getAssignedRole(userId: string): Promise<AppRole | null> {
  const db = getDb();
  await ensureDatabase(db);
  const row = await db.prepare('SELECT role FROM app_users WHERE auth_user_id = ?').bind(userId).first<{ role: AppRole }>();
  return row?.role ?? null;
}

export async function assignRole(user: ChatGPTUser, requested: AppRole): Promise<AppRole> {
  const db = getDb();
  await ensureDatabase(db);
  await db.prepare(`INSERT OR IGNORE INTO app_users (id, auth_user_id, email, display_name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), user.userId, user.email, user.displayName, requested, new Date().toISOString(), new Date().toISOString()).run();
  return (await getAssignedRole(user.userId)) ?? requested;
}

export async function requireRole(role: AppRole, returnTo: string) {
  const user = await requireChatGPTUser(returnTo);
  const assigned = await getAssignedRole(user.userId);
  if (!assigned) redirect(`/?choose=${role}`);
  if (assigned !== role) redirect(assigned === 'staff' ? '/staff' : '/user');
  return user;
}
