import { route } from '@/lib/server/http';
import { endSession } from '@/lib/server/auth';

export const POST = route(async () => {
  await endSession();
  return { ok: true };
});
