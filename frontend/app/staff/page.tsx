import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { StaffPortal } from '@/components/staff-portal';
import { requireRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export default async function StaffPage() {
  const user = await requireRole('staff', '/staff');
  return <StaffPortal displayName={user.displayName} signOutHref={chatGPTSignOutPath('/')} />;
}
