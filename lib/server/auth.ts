import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';
import { one } from './db';
import { forbidden, unauthorized } from './http';

export type Role = 'student' | 'mentor' | 'admin';
export type AdminRole = 'Owner' | 'Operations lead' | 'Verification admin' | 'Finance admin' | 'Security admin' | 'Support agent';

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  adminRole: AdminRole | null;
  dob: string;
};

const COOKIE = 'inphinity_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

const key = () => new TextEncoder().encode(env.authSecret);

export async function startSession(userId: string) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
}

export async function endSession() {
  (await cookies()).set(COOKIE, '', { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/', maxAge: 0 });
}

type Row = { id: string; email: string; name: string; role: Role; admin_role: AdminRole | null; dob: Date | string };

/** The signed-in user, or null. Always re-reads the database, so a removed or changed account takes effect at once. */
export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let sub: string | undefined;
  try { ({ payload: { sub } } = await jwtVerify(token, key(), { algorithms: ['HS256'] })); } catch { return null; }
  if (!sub) return null;
  const r = await one<Row>('select id, email, name, role, admin_role, dob from users where id = $1', [sub]);
  if (!r) return null;
  const dob = r.dob instanceof Date ? r.dob.toISOString().slice(0, 10) : String(r.dob).slice(0, 10);
  return { id: r.id, email: r.email, name: r.name, role: r.role, adminRole: r.admin_role, dob };
});

/** For API routes: throws 401. */
export async function apiUser(): Promise<User> {
  const u = await getUser();
  if (!u) throw unauthorized();
  return u;
}
export async function apiRole(...roles: Role[]): Promise<User> {
  const u = await apiUser();
  if (!roles.includes(u.role)) throw forbidden();
  return u;
}

export function homeFor(role: Role) {
  return role === 'student' ? '/student' : role === 'mentor' ? '/mentor' : '/admin';
}

/** For pages: sends visitors to sign in, and people with the wrong role to their own workspace. */
export async function pageUser(role?: Role): Promise<User> {
  const u = await getUser();
  if (!u) {
    const here = (await headers()).get('x-pathname');
    redirect(`/sign-in${here && here.startsWith('/') && !here.startsWith('//') ? `?next=${encodeURIComponent(here)}` : ''}`);
  }
  if (role && u.role !== role) redirect(homeFor(u.role));
  return u;
}

export function initialsOf(name: string) {
  const parts = name.replace(/^(dr|prof)\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function ageFromIso(dob: string, now = new Date()): number {
  const d = new Date(`${dob}T00:00:00Z`);
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}
