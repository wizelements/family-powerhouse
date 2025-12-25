import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      familyId: string | null;
      role: Role | null;
    };
  }
  interface User {
    familyId?: string | null;
    role?: Role | null;
  }
}



export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              where: { status: 'ACTIVE' },
              take: 1,
              orderBy: { joinedAt: 'asc' },
            },
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        const membership = user.memberships[0];

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          familyId: membership?.familyId ?? null,
          role: membership?.role ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.familyId = user.familyId as string | null | undefined;
        token.role = user.role as Role | null | undefined;
      }
      
      if (trigger === 'update' && session) {
        token.familyId = (session as { familyId?: string }).familyId;
        token.role = (session as { role?: Role }).role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.familyId = (token.familyId as string | null) ?? null;
        session.user.role = (token.role as Role | null) ?? null;
      }
      return session;
    },
  },
});
