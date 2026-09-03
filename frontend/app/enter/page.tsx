import { redirect } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { assignRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function EnterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const requestedRole = (await searchParams).role === 'staff' ? 'staff' : 'user';
  const user = await requireChatGPTUser(`/enter?role=${requestedRole}`);
  const assigned = await assignRole(user, requestedRole);
  redirect(assigned === 'staff' ? '/staff' : '/user');
}
