import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-8 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
          <p className="text-blue-100 mt-2">Last updated: December 2024</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 space-y-8">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Welcome to Family Powerhouse. These Terms of Service (&quot;Terms&quot;) govern your use of our 
              family finance and collaboration platform. By creating an account or using our services, 
              you agree to be bound by these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              Family Powerhouse is a platform designed to help families manage shared finances, 
              track budgets, plan trips, pool money for common goals, and communicate through 
              family chat features. Our services include:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Money pooling and shared fund management</li>
              <li>Budget tracking and financial goal setting</li>
              <li>Trip planning and expense coordination</li>
              <li>Family communication channels</li>
              <li>Habit tracking and accountability features</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">3. User Obligations</h2>
            <p className="text-gray-600 leading-relaxed">
              By using Family Powerhouse, you agree to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Provide accurate and complete information when creating your account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 13 years of age (or 16 in the EU) to create an account</li>
              <li>Use the service only for lawful purposes</li>
              <li>Not share your account access with unauthorized individuals</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">4. Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed">
              You agree not to use Family Powerhouse to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Transmit harmful, offensive, or inappropriate content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Impersonate any person or entity</li>
              <li>Engage in any form of fraud or money laundering</li>
              <li>Harass, abuse, or harm other users</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">5. Data Handling</h2>
            <p className="text-gray-600 leading-relaxed">
              We take your data seriously. Financial information you enter into Family Powerhouse 
              is used solely to provide the service functionality. We do not sell your personal 
              data to third parties. For detailed information about how we collect, use, and 
              protect your data, please review our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          <section className="space-y-4 bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900">6. Not Financial Advice</h2>
            <p className="text-gray-600 leading-relaxed">
              <strong>Important:</strong> Family Powerhouse is a tool for tracking and organizing 
              your family&apos;s finances. The service does not provide financial, investment, tax, 
              or legal advice. Any financial decisions you make based on information displayed 
              in the app are solely your responsibility.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We strongly recommend consulting with qualified financial professionals before 
              making significant financial decisions. The budgets, goals, and projections shown 
              in the app are based on information you provide and should not be considered 
              professional financial guidance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">7. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              To the maximum extent permitted by law, Family Powerhouse and its operators shall 
              not be liable for any indirect, incidental, special, consequential, or punitive 
              damages, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Loss of profits, data, or other intangible losses</li>
              <li>Financial losses resulting from use of or inability to use the service</li>
              <li>Unauthorized access to or alteration of your data</li>
              <li>Any third-party conduct on the service</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              The service is provided &quot;as is&quot; without warranties of any kind, either express 
              or implied.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">8. Account Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              You may delete your account at any time through your account settings. We reserve 
              the right to suspend or terminate accounts that violate these Terms. Upon 
              termination, your right to use the service ceases immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">9. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these Terms from time to time. We will notify you of any material 
              changes by posting the new Terms on this page and updating the &quot;Last updated&quot; 
              date. Your continued use of the service after changes constitutes acceptance of 
              the modified Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">10. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:support@familypowerhouse.com" className="text-blue-600 hover:underline">
                support@familypowerhouse.com
              </a>.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-8 text-center space-x-4">
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
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
