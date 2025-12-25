'use server';

import { prisma } from '@/lib/db';
import { signIn, signOut } from '@/lib/auth/config';
import { signUpSchema, signInSchema } from '@/lib/validation/schemas';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import type { ActionResult } from '@/types';

export async function signUpAction(formData: FormData): Promise<ActionResult<{ userId: string }>> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  };

  const result = signUpSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { email, password, name } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { success: false, error: 'Email already registered' };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  await signIn('credentials', {
    email,
    password,
    redirect: false,
  });

  redirect('/onboarding');
}

export async function signInAction(formData: FormData): Promise<ActionResult<void>> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const result = signInSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    await signIn('credentials', {
      email: result.data.email,
      password: result.data.password,
      redirect: false,
    });
  } catch {
    return { success: false, error: 'Invalid email or password' };
  }

  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirect: false });
  redirect('/');
}
