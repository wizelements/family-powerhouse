import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600">Family Powerhouse</div>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Bring Your Family Together
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Pool money for trips, track budgets, plan adventures, and build wealth together. 
            One platform for your family's financial and lifestyle goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Today
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                See Features
              </Button>
            </Link>
          </div>
        </div>

        <div id="features" className="mt-32 grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="💰"
            title="Money Pooling"
            description="Create pools for trips, emergencies, or ventures. Track contributions and manage approvals."
          />
          <FeatureCard
            icon="💬"
            title="Family Chat"
            description="Stay connected with real-time messaging, channels, mentions, and file sharing."
          />
          <FeatureCard
            icon="✈️"
            title="Trip Planning"
            description="Plan trips collaboratively with itineraries, budgets, voting, and task assignments."
          />
          <FeatureCard
            icon="📊"
            title="Budget Tracker"
            description="Track household and personal budgets with categories, rules, and spending insights."
          />
          <FeatureCard
            icon="🚀"
            title="Ventures"
            description="Track family business ventures with milestones, OKRs, and revenue tracking."
          />
          <FeatureCard
            icon="🎯"
            title="Accountability"
            description="Build habits, track goals, and keep each other accountable with scoreboards."
          />
        </div>

        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Power Up Your Family?
          </h2>
          <p className="text-gray-600 mb-8">
            Join families building wealth and memories together.
          </p>
          <Link href="/signup">
            <Button size="lg">Create Your Family Account</Button>
          </Link>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-12 mt-20 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Family Powerhouse. All rights reserved.</p>
          <p className="mt-2 text-sm">
            This is a budgeting and planning tool. We do not provide financial, investment, or legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
