import { route, readJson, forbidden, notFound } from '@/lib/server/http';
import { contactStatusBody } from '@/lib/server/validators';
import { apiRole } from '@/lib/server/auth';
import { one } from '@/lib/server/db';

const CAN = ['Owner', 'Operations lead', 'Support agent'];

export const POST = route<{ id: string }>(async (req, { params }) => {
  const admin = await apiRole('admin');
  if (!admin.adminRole || !CAN.includes(admin.adminRole)) throw forbidden();
  const { status } = await readJson(req, contactStatusBody);
  if (!(await one('update contact_messages set status = $2 where id = $1 returning id', [(await params).id, status]))) throw notFound();
  return { ok: true };
});
