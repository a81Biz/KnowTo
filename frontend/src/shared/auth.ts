// src/shared/auth.ts
import { supabase } from './supabase.client';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(`Google sign-in failed: ${error.message}`);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem('knowto_auth_token');
  window.location.reload();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  localStorage.setItem('knowto_auth_token', session.access_token);

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    fullName: session.user.user_metadata?.['full_name'] as string | undefined,
    avatarUrl: session.user.user_metadata?.['avatar_url'] as string | undefined,
  };
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void): void {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      localStorage.setItem('knowto_auth_token', session.access_token);
      callback({
        id: session.user.id,
        email: session.user.email ?? '',
        fullName: session.user.user_metadata?.['full_name'] as string | undefined,
      });
    } else {
      localStorage.removeItem('knowto_auth_token');
      callback(null);
    }
  });
}
