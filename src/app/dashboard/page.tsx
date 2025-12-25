import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

async function getDashboardData(familyId: string) {
  const [pools, trips, tasks, habits] = await Promise.all([
    prisma.pool.findMany({
      where: { familyId, status: 'ACTIVE' },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trip.findMany({
      where: { familyId, status: { in: ['PLANNING', 'BOOKED'] } },
      take: 3,
      orderBy: { startDate: 'asc' },
    }),
    prisma.task.findMany({
      where: { familyId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      take: 5,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.habit.findMany({
      where: { familyId, isActive: true },
      take: 5,
    }),
  ]);

  return { pools, trips, tasks, habits };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  const { pools, trips, tasks, habits } = await getDashboardData(session.user.familyId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your family.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Pools" value={pools.length.toString()} icon="💰" />
        <StatCard title="Upcoming Trips" value={trips.length.toString()} icon="✈️" />
        <StatCard title="Open Tasks" value={tasks.length.toString()} icon="✅" />
        <StatCard title="Active Habits" value={habits.length.toString()} icon="🎯" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pool Progress</CardTitle>
            <Link href="/dashboard/pools" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {pools.length === 0 ? (
              <p className="text-gray-500 text-sm">No active pools yet.</p>
            ) : (
              pools.map((pool) => {
                const progress = pool.targetAmount.isZero() 
                  ? 0 
                  : Number(pool.currentAmount) / Number(pool.targetAmount) * 100;
                return (
                  <div key={pool.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{pool.name}</span>
                      <span className="text-gray-600">
                        ${Number(pool.currentAmount).toLocaleString()} / ${Number(pool.targetAmount).toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={progress} 
                      variant={progress >= 100 ? 'success' : progress >= 75 ? 'warning' : 'default'}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Trips</CardTitle>
            <Link href="/dashboard/trips" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {trips.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming trips planned.</p>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <Link 
                    key={trip.id} 
                    href={`/dashboard/trips/${trip.id}`}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium">{trip.name}</div>
                    <div className="text-sm text-gray-600">
                      {trip.destination} • {new Date(trip.startDate).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tasks Due</CardTitle>
            <Link href="/dashboard/tasks" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending tasks.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-2 rounded bg-gray-50"
                  >
                    <span className="text-sm">{task.title}</span>
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Link 
              href="/dashboard/pools/new"
              className="p-4 rounded-lg bg-blue-50 text-blue-700 text-center text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              💰 New Pool
            </Link>
            <Link 
              href="/dashboard/trips/new"
              className="p-4 rounded-lg bg-green-50 text-green-700 text-center text-sm font-medium hover:bg-green-100 transition-colors"
            >
              ✈️ Plan Trip
            </Link>
            <Link 
              href="/dashboard/chat"
              className="p-4 rounded-lg bg-purple-50 text-purple-700 text-center text-sm font-medium hover:bg-purple-100 transition-colors"
            >
              💬 Open Chat
            </Link>
            <Link 
              href="/dashboard/members"
              className="p-4 rounded-lg bg-orange-50 text-orange-700 text-center text-sm font-medium hover:bg-orange-100 transition-colors"
            >
              👥 Invite Member
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center">
          <div className="text-3xl mr-4">{icon}</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
