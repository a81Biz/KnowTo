// frontend/core/src/auth.ts
import { supabase } from './supabase.client';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

// ============================================================================
// DEV BYPASS
// En desarrollo local (import.meta.env.DEV) se omite Google OAuth.
// En producción este bloque es eliminado por Vite en el build (tree-shaking).
// ============================================================================
const DEV_USER: AuthUser = {
  id: 'dev-user-local',
  email: 'dev@knowto.local',
  fullName: 'Dev Local',
};
const DEV_TOKEN = 'dev-local-bypass';

function isDevMode(): boolean {
  return import.meta.env.DEV === true;
}

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================
export async function signInWithGoogle(): Promise<void> {
  if (isDevMode()) {
    localStorage.setItem('knowto_auth_token', DEV_TOKEN);
    window.location.reload();
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(`Google sign-in failed: ${error.message}`);
}

export async function signOut(): Promise<void> {
  if (isDevMode()) {
    localStorage.removeItem('knowto_auth_token');
    window.location.reload();
    return;
  }

  await supabase.auth.signOut();
  localStorage.removeItem('knowto_auth_token');
  window.location.reload();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isDevMode()) {
    if (localStorage.getItem('disable_dev_bypass') === 'true') {
      const hasToken = localStorage.getItem('knowto_auth_token');
      if (!hasToken) return null;
    }
    localStorage.setItem('knowto_auth_token', DEV_TOKEN);
    return DEV_USER;
  }

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
  if (isDevMode()) {
    if (localStorage.getItem('disable_dev_bypass') === 'true') {
      const hasToken = localStorage.getItem('knowto_auth_token');
      if (hasToken) {
        callback(DEV_USER);
      } else {
        callback(null);
      }
      return;
    }
    localStorage.setItem('knowto_auth_token', DEV_TOKEN);
    callback(DEV_USER);
    return;
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
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
