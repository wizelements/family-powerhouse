import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/api/auth',
  '/api/webhooks',
  '/invite',
];

const authOnlyPaths = ['/onboarding'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const hasFamilyId = !!req.auth?.user?.familyId;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth-only paths (no family required)
  if (authOnlyPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Redirect users without family to onboarding
  if (!hasFamilyId && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
