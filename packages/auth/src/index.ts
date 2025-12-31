// Export auth configuration and helpers
export { authOptions, auth, getServerSession } from './auth';

// Export types from next-auth.d.ts
export type { AuthOptions, Account, Profile } from './next-auth';

// Re-export next-auth for convenience
export { default as NextAuth } from 'next-auth';

// Server-side helpers - re-export from next-auth
export { getServerSession as getSession } from 'next-auth/next';

// =========================================================
// IMPORTANT: Separate imports for different runtime contexts
// =========================================================
// For MIDDLEWARE (Edge Runtime):
//   import { withAuth, type NextRequestWithAuth } from '@repo/auth/middleware';
//
// For CLIENT components (React):
//   import { signIn, signOut, useSession, SessionProvider } from '@repo/auth/client';
// =========================================================