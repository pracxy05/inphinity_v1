import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Tells signed-out visitors' sign-in page where to send them back to. Overwrites any value a client tries to send. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/student/:path*', '/mentor/:path*', '/admin/:path*', '/sessions/:path*', '/session/:path*'],
};
