import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { UserPortal } from '@/components/user-portal';
import { requireRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export default async function UserPage() {
  const user = await requireRole('user', '/user');
  return <UserPortal displayName={user.displayName} signOutHref={chatGPTSignOutPath('/')} />;
}
