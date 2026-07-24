import { useState, useEffect } from 'react';
import { onAuthStateChange, signInWithGoogle, signOut, APPROVED_EMAILS } from '../supabase/auth';
import type { AppUser } from '../types';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChange(async (profile) => {
      setAppUser(profile);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async () => {
    setError('');
    await signInWithGoogle();
    // Redirect happens — no return value needed
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setAppUser(null);
  };

  return { user, appUser, loading, error, signIn, signOut: handleSignOut };
}
