import { route } from '@/lib/server/http';
import { getUser } from '@/lib/server/auth';

export const GET = route(async () => {
  const u = await getUser();
  return { user: u ? { name: u.name, role: u.role, adminRole: u.adminRole } : null };
});
