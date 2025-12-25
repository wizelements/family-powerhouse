'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUpAction } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    
    const result = await signUpAction(formData);
    
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  const passwordChecks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-3xl">🏠</span>
              <span className="text-xl font-bold text-gray-900">Family Powerhouse</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
              <p className="text-gray-500 mt-2">Start your family&apos;s journey to success</p>
            </div>

            <form action={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <Input
                name="name"
                type="text"
                label="Full Name"
                placeholder="John Doe"
                required
                autoComplete="name"
              />

              <Input
                name="email"
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <div>
                <Input
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            passwordStrength >= level
                              ? passwordStrength <= 2
                                ? 'bg-red-400'
                                : passwordStrength === 3
                                ? 'bg-yellow-400'
                                : 'bg-green-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <PasswordCheck passed={passwordChecks.length} text="12+ characters" />
                      <PasswordCheck passed={passwordChecks.uppercase} text="Uppercase letter" />
                      <PasswordCheck passed={passwordChecks.lowercase} text="Lowercase letter" />
                      <PasswordCheck passed={passwordChecks.number} text="Number" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </div>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/login">
                  <Button variant="outline" className="w-full" size="lg">
                    Sign In Instead
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-8">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏠</span>
            </div>
            <span className="text-2xl font-bold text-white">Family Powerhouse</span>
          </Link>
        </div>
        
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Everything your family needs in one place
            </h1>
            <p className="text-purple-100 text-lg">
              Join thousands of families building wealth, planning adventures, and staying connected.
            </p>
          </div>
          
          <div className="space-y-4">
            <BenefitItem 
              icon="✨" 
              title="Pool Money Together"
              description="Create shared funds for trips, emergencies, and ventures"
            />
            <BenefitItem 
              icon="📱" 
              title="Stay Connected"
              description="Real-time chat with channels, mentions, and file sharing"
            />
            <BenefitItem 
              icon="🎯" 
              title="Track Goals"
              description="Build habits and hold each other accountable"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {['👨', '👩', '👧', '👦'].map((emoji, i) => (
              <div key={i} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border-2 border-purple-600">
                <span className="text-sm">{emoji}</span>
              </div>
            ))}
          </div>
          <span className="text-purple-100 text-sm">Join families already thriving together</span>
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ passed, text }: { passed: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${passed ? 'text-green-600' : 'text-gray-400'}`}>
      {passed ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 112 0v4a1 1 0 11-2 0V7zm1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      )}
      <span>{text}</span>
    </div>
  );
}

function BenefitItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 bg-white/10 rounded-xl p-4">
      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-purple-100 text-sm">{description}</p>
      </div>
    </div>
  );
}
