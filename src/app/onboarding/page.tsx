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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Family Powerhouse!</CardTitle>
            <CardDescription>How would you like to get started?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full h-20 text-lg" 
              onClick={() => setMode('create')}
            >
              🏠 Create a New Family
            </Button>
            <Button 
              className="w-full h-20 text-lg" 
              variant="outline"
              onClick={() => setMode('join')}
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <button 
              onClick={() => setMode('choose')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              ← Back
            </button>
            <CardTitle className="text-2xl">Create Your Family</CardTitle>
            <CardDescription>You'll be the owner and can invite members later.</CardDescription>
          </CardHeader>
          <form action={handleCreateFamily}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
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
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Create Family
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <button 
            onClick={() => setMode('choose')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            ← Back
          </button>
          <CardTitle className="text-2xl">Join a Family</CardTitle>
          <CardDescription>Enter the invite code you received.</CardDescription>
        </CardHeader>
        <form action={handleJoinFamily}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <Input
              name="token"
              type="text"
              label="Invite Code"
              placeholder="Enter your invite code"
              required
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Join Family
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
