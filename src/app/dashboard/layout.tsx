import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOutAction } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import GuestBanner from '@/components/guest-banner';
import { prisma } from '@/lib/db';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Pools', href: '/dashboard/pools', icon: '💰' },
  { name: 'Budget', href: '/dashboard/budget', icon: '📊' },
  { name: 'Trips', href: '/dashboard/trips', icon: '✈️' },
  { name: 'Ventures', href: '/dashboard/ventures', icon: '🚀' },
  { name: 'Chat', href: '/dashboard/chat', icon: '💬' },
  { name: 'Members', href: '/dashboard/members', icon: '👥' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  if (!session.user.familyId) {
    redirect('/onboarding');
  }

  // Get guest expiry info if guest user
  let guestExpiresAt: string | null = null;
  if (session.user.isGuest) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { guestExpiresAt: true },
    });
    guestExpiresAt = user?.guestExpiresAt?.toISOString() || null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Guest Banner */}
      <GuestBanner isGuest={session.user.isGuest || false} guestExpiresAt={guestExpiresAt} />
      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-blue-600">Family Powerhouse</span>
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center h-16 px-4 border-b border-gray-200">
              <span className="text-xl font-bold text-blue-600">Family Powerhouse</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${session.user.isGuest ? 'bg-purple-600' : 'bg-blue-600'}`}>
                  {session.user.isGuest ? '🎭' : (session.user.name?.[0] || session.user.email[0].toUpperCase())}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user.name || 'User'}
                    {session.user.isGuest && <span className="ml-1 text-xs text-purple-600">(Demo)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{session.user.role}</p>
                </div>
              </div>
              {session.user.isGuest ? (
                <div className="space-y-2">
                  <Link href="/upgrade">
                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                      Upgrade Account
                    </Button>
                  </Link>
                  <form action={signOutAction}>
                    <Button variant="outline" size="sm" className="w-full" type="submit">
                      End Demo
                    </Button>
                  </form>
                </div>
              ) : (
                <form action={signOutAction}>
                  <Button variant="outline" size="sm" className="w-full" type="submit">
                    Sign out
                  </Button>
                </form>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50">
          {navigation.slice(0, 5).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center px-3 py-1 text-xs text-gray-600 hover:text-blue-600"
            >
              <span className="text-xl mb-1">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <main className="lg:pl-64 flex-1 pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
