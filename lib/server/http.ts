import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { env } from './env';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const bad = (m: string) => new HttpError(400, m);
export const unauthorized = (m = 'Please sign in.') => new HttpError(401, m);
export const forbidden = (m = 'You do not have access to this.') => new HttpError(403, m);
export const notFound = (m = 'Not found.') => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);
export const tooMany = (m = 'Too many attempts. Please wait and try again.') => new HttpError(429, m);

/**
 * Browsers always send an Origin header on POST/PUT/PATCH/DELETE. We require it to match this site,
 * which blocks other websites from making a signed-in user's browser change data (CSRF).
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) throw forbidden('Missing origin.');
  let host: string;
  try { host = new URL(origin).host; } catch { throw forbidden('Bad origin.'); }
  const allowed = new Set<string>();
  const reqHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (reqHost) allowed.add(reqHost);
  if (env.appUrl) { try { allowed.add(new URL(env.appUrl).host); } catch { /* ignore */ } }
  if (!allowed.has(host)) throw forbidden('Cross-site request blocked.');
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw bad('Send a JSON body.'); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw bad(firstIssue(parsed.error));
  return parsed.data;
}

function firstIssue(e: ZodError): string {
  const i = e.issues[0];
  const where = i.path.length ? `${i.path.join('.')}: ` : '';
  return `${where}${i.message}`;
}

export function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  return (xf ? xf.split(',')[0].trim() : req.headers.get('x-real-ip')) || 'unknown';
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler: same-origin check on writes, and one place that turns errors into JSON. */
export function route<P = Record<string, string>>(handler: (req: Request, ctx: Ctx<P>) => Promise<Response | object>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') assertSameOrigin(req);
      const out = await handler(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error('Unhandled API error', e);
      return NextResponse.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
    }
  };
}
