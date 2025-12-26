import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-purple-100 hover:text-white mb-8 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="text-purple-100 mt-2">Last updated: December 2024</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 space-y-8">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              At Family Powerhouse, we are committed to protecting your privacy. This Privacy 
              Policy explains how we collect, use, store, and protect your personal information 
              when you use our family finance and collaboration platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">2. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed">
              We collect the following types of information to provide and improve our services:
            </p>
            
            <div className="space-y-4 mt-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                  <li><strong>Email address:</strong> Used for account login, notifications, and communication</li>
                  <li><strong>Full name:</strong> Used to personalize your experience and identify you to family members</li>
                  <li><strong>Password:</strong> Stored as a secure hash (we never store plain-text passwords)</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Financial Data</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                  <li><strong>Budget entries:</strong> Income, expenses, and categories you track</li>
                  <li><strong>Money pool contributions:</strong> Shared fund transactions and goals</li>
                  <li><strong>Trip expenses:</strong> Travel-related financial planning data</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Usage Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                  <li>Chat messages within your family groups</li>
                  <li>Habit tracking and goal progress data</li>
                  <li>Login timestamps and session information</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">3. How We Store Your Data</h2>
            <p className="text-gray-600 leading-relaxed">
              Your data is stored securely using industry-standard practices:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Database:</strong> We use MongoDB to store your data with encryption at rest</li>
              <li><strong>Passwords:</strong> All passwords are hashed using bcrypt before storage</li>
              <li><strong>Transmission:</strong> All data is transmitted over HTTPS/TLS encryption</li>
              <li><strong>Access controls:</strong> Strict authentication and authorization protect your data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">4. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We use your information solely to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Provide and maintain the Family Powerhouse service</li>
              <li>Authenticate your identity and secure your account</li>
              <li>Enable family collaboration and shared financial features</li>
              <li>Send important account and security notifications</li>
              <li>Improve our service based on usage patterns (aggregated, anonymized data)</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              <strong>We do not sell your personal data to third parties.</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">5. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide 
              services. Specifically:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Account data:</strong> Retained until you delete your account</li>
              <li><strong>Financial entries:</strong> Retained until you delete them or your account</li>
              <li><strong>Chat messages:</strong> Retained with your family group data</li>
              <li><strong>Deleted accounts:</strong> Data is permanently deleted within 30 days of account deletion</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">6. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Withdraw consent:</strong> Opt out of non-essential data processing</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              To exercise any of these rights, please contact us using the information below.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">7. Data Sharing</h2>
            <p className="text-gray-600 leading-relaxed">
              We only share your data in the following limited circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Family members:</strong> Data you choose to share within your family group</li>
              <li><strong>Service providers:</strong> Trusted third parties that help us operate (hosting, email)</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">8. Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed">
              We use essential cookies to maintain your login session and remember your preferences. 
              We do not use third-party advertising cookies or tracking pixels.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">9. Children&apos;s Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Family Powerhouse is not intended for children under 13 years of age (or 16 in the EU). 
              We do not knowingly collect personal information from children. If you believe a child 
              has provided us with personal information, please contact us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">10. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. 
              We encourage you to review this policy periodically.
            </p>
          </section>

          <section className="space-y-4 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900">11. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy, your data, or wish to exercise 
              your rights, please contact us at:
            </p>
            <div className="mt-4">
              <a 
                href="mailto:privacy@familypowerhouse.com" 
                className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                privacy@familypowerhouse.com
              </a>
            </div>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-8 text-center space-x-4">
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign In
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/signup" className="text-blue-600 hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
