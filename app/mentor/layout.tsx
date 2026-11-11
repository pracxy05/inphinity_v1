import type { ReactNode } from 'react';
import { pageUser } from '@/lib/server/auth';

export default async function Layout({ children }: { children: ReactNode }) {
  await pageUser('mentor');
  return children;
}
