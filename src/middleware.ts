import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/api/auth',
  '/api/webhooks',
  '/api/health',
  '/invite',
];

const authOnlyPaths = ['/onboarding'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const hasFamilyId = !!req.auth?.user?.familyId;

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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health|api/webhooks|.*\\..*).*)',
  ],
};
