import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths without auth check
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if auth is configured before using it
  if (!process.env.AUTH_SECRET) {
    console.warn('AUTH_SECRET not configured, allowing request');
    return NextResponse.next();
  }

  // Use auth middleware for protected routes
  return auth((authReq) => {
    const isLoggedIn = !!authReq.auth;
    const hasFamilyId = !!authReq.auth?.user?.familyId;

    // Redirect unauthenticated users to login
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', authReq.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Auth-only paths (no family required)
    if (authOnlyPaths.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Redirect users without family to onboarding
    if (!hasFamilyId && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/onboarding', authReq.url));
    }

    return NextResponse.next();
  })(req, {});
}

export default middleware;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
