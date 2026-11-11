import { route, readJson, forbidden, notFound, bad } from '@/lib/server/http';
import { complianceBody } from '@/lib/server/validators';
import { apiRole } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { audit } from '@/lib/server/audit';

const CAN = ['Owner', 'Verification admin', 'Security admin'];

export const POST = route<{ id: string }>(async (req, { params }) => {
  const admin = await apiRole('admin');
  if (!admin.adminRole || !CAN.includes(admin.adminRole)) throw forbidden();
  const { action } = await readJson(req, complianceBody);
  const next = action === 'clear' ? 'cleared' : 'rejected';
  const r = await one<{ code: string }>(`update missions set compliance_status = $2, updated_at = now() where id = $1 and compliance_status = 'held' returning code`, [(await params).id, next]);
  if (!r) throw bad('That project is not waiting for review.');
  await audit(admin, action === 'clear' ? 'Defence project cleared' : 'Defence project rejected', { tone: action === 'clear' ? 'ok' : 'warn', detail: { mission: r.code } });
  return { ok: true };
});
