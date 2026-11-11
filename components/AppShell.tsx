import type { ReactNode } from 'react';
import AppShellView, { type Role } from './AppShellView';
import { pageUser, initialsOf } from '@/lib/server/auth';
import { one } from '@/lib/server/db';

export type { Role };

/** Server wrapper: figures out who is signed in, then renders the (client) frame around the page. */
export default async function AppShell({ title, children }: { role?: Role; title: string; children: ReactNode }) {
  const u = await pageUser();
  let label = '';
  if (u.role === 'student') label = 'Student';
  else if (u.role === 'admin') label = `Staff, ${u.adminRole}`;
  else {
    const p = await one<{ status: string }>('select status from mentor_profiles where user_id = $1', [u.id]);
    label = p?.status === 'approved' ? 'Mentor, verified' : 'Mentor, verification in progress';
  }
  return (
    <AppShellView role={u.role} title={title} person={{ name: u.name, role: label, initials: initialsOf(u.name) }}>
      {children}
    </AppShellView>
  );
}
