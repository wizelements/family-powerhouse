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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths without any auth check
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if auth is configured
  if (!process.env.AUTH_SECRET) {
    // In development without auth, just allow everything
    console.warn('AUTH_SECRET not configured');
    return NextResponse.next();
  }

  // Dynamically import auth to avoid build-time errors
  const { auth } = await import('@/lib/auth/config');
  
  // Get session
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const hasFamilyId = !!session?.user?.familyId;

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
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health|api/webhooks|.*\\..*).*)',
  ],
};
