import type { ReactNode } from 'react';
import { pageUser } from '@/lib/server/auth';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: ReactNode }) {
  const u = await pageUser();
  if (u.role === 'admin') redirect('/admin');
  return children;
}
