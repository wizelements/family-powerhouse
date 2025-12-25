'use client';

import { useState } from 'react';
import { createFamilyAction, acceptInviteAction } from '@/server/actions/family';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function OnboardingPage() {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateFamily(formData: FormData) {
    setIsLoading(true);
    setError(null);
    
    const result = await createFamilyAction(formData);
    
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  async function handleJoinFamily(formData: FormData) {
    setIsLoading(true);
    setError(null);
    
    const token = formData.get('token') as string;
    const result = await acceptInviteAction(token);
    
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
            <CardTitle>Welcome to Family Powerhouse!</CardTitle>
            <CardDescription>How would you like to get started?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full h-16 text-base" 
              onClick={() => setMode('create')}
              size="lg"
            >
              🏠 Create a New Family
            </Button>
            <Button 
              className="w-full h-16 text-base" 
              variant="outline"
              onClick={() => setMode('join')}
              size="lg"
            >
              🔗 Join Existing Family
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <button 
              onClick={() => setMode('choose')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-3 flex items-center gap-1 transition-colors"
            >
              ← Back to Options
            </button>
            <div className="text-4xl mb-3">🏠</div>
            <CardTitle>Create Your Family</CardTitle>
            <CardDescription>You'll be the owner and can invite members later.</CardDescription>
          </CardHeader>
          <form action={handleCreateFamily}>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              <Input
                name="name"
                type="text"
                label="Family Name"
                placeholder="The Johnson Family"
                required
              />
              <Input
                name="description"
                type="text"
                label="Description (optional)"
                placeholder="A brief description of your family"
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                {isLoading ? 'Creating...' : 'Create Family'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <button 
            onClick={() => setMode('choose')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-3 flex items-center gap-1 transition-colors"
          >
            ← Back to Options
          </button>
          <div className="text-4xl mb-3">🔗</div>
          <CardTitle>Join a Family</CardTitle>
          <CardDescription>Enter the invite code you received from a family member.</CardDescription>
        </CardHeader>
        <form action={handleJoinFamily}>
          <CardContent className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            <Input
              name="token"
              type="text"
              label="Invite Code"
              placeholder="e.g., ABC123XYZ"
              required
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              {isLoading ? 'Joining...' : 'Join Family'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
