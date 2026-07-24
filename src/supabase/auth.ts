import { supabase } from './client';
import type { AppUser } from '../types';

// ── Approved emails (hard gate) ───────────────────────────
export const APPROVED_EMAILS: string[] = [
  'abduljalal5785@gmail.com',
  'friend1@gmail.com', 'friend2@gmail.com', 'friend3@gmail.com',
  'friend4@gmail.com', 'friend5@gmail.com', 'friend6@gmail.com',
  'friend7@gmail.com', 'friend8@gmail.com', 'friend9@gmail.com',
];

// ── Google OAuth sign-in ──────────────────────────────────
export async function signInWithGoogle(): Promise<{ user: AppUser | null; error?: string }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: window.location.origin,
    },
  });

  if (error) return { user: null, error: error.message };
  // The redirect will bring us back — session is picked up by onAuthStateChange
  return { user: null }; // user is null here; the redirect handles it
}

// ── Sign out ──────────────────────────────────────────────
export async function signOut() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // Set presence to offline before signing out
    await supabase.from('profiles').update({ status: 'offline', last_seen: new Date().toISOString() }).eq('id', session.user.id);
  }
  await supabase.auth.signOut();
}

// ── Get current session user ──────────────────────────────
export async function getCurrentUser(): Promise<AppUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return await fetchProfile(session.user.id);
}

// ── Fetch profile from DB ─────────────────────────────────
export async function fetchProfile(uid: string): Promise<AppUser | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
  if (error || !data) return null;
  return mapProfile(data);
}

// ── Update profile (displayName, bio, fcmToken) ───────────
export async function updateProfile(uid: string, updates: Partial<Pick<AppUser, 'displayName' | 'bio' | 'fcmToken'>>) {
  const db: Record<string, any> = {};
  if (updates.displayName) db.display_name = updates.displayName;
  if (updates.bio !== undefined) db.bio = updates.bio;
  if (updates.fcmToken !== undefined) db.fcm_token = updates.fcmToken;
  await supabase.from('profiles').update(db).eq('id', uid);
}

// ── Subscribe to all profiles (for presence) ──────────────
export function subscribeProfiles(onProfiles: (users: AppUser[]) => void): () => void {
  const sub = supabase
    .channel('profiles-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      fetchAllProfiles().then((users) => onProfiles(users));
    })
    .subscribe();

  // Initial fetch
  fetchAllProfiles().then((users) => onProfiles(users));

  return () => { sub.unsubscribe(); };
}

async function fetchAllProfiles(): Promise<AppUser[]> {
  const { data } = await supabase.from('profiles').select('*');
  return (data || []).map(mapProfile);
}

// ── Auth state listener ───────────────────────────────────
export function onAuthStateChange(cb: (user: AppUser | null) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const email = session.user.email?.toLowerCase() || '';
      if (!APPROVED_EMAILS.includes(email)) {
        await supabase.auth.signOut();
        cb(null);
        return;
      }
      const profile = await ensureProfile(session.user);
      cb(profile);
    } else if (event === 'SIGNED_OUT') {
      cb(null);
    } else if (event === 'TOKEN_REFRESHED' && session) {
      const profile = await fetchProfile(session.user.id);
      cb(profile);
    }
  });

  return () => subscription.unsubscribe();
}

// ── Ensure profile row exists (triggers on first sign-in) ─
async function ensureProfile(supabaseUser: any): Promise<AppUser> {
  const email = supabaseUser.email?.toLowerCase() || '';
  const idx = APPROVED_EMAILS.indexOf(email);
  const initials = (supabaseUser.user_metadata?.full_name || '')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  // Upsert: insert if not exists, update if exists
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: supabaseUser.id,
      email,
      display_name: supabaseUser.user_metadata?.full_name || email.split('@')[0],
      avatar_seed: initials || email.slice(0, 2).toUpperCase(),
      status: 'online',
      last_seen: new Date().toISOString(),
      role: idx === 0 ? 'owner' : 'member',
    }, { onConflict: 'id' })
    .select()
    .single();

  return mapProfile(data!);
}

// ── Map DB snake_case → camelCase ─────────────────────────
function mapProfile(row: any): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarSeed: row.avatar_seed,
    bio: row.bio || '',
    status: row.status,
    lastSeen: row.last_seen,
    fcmToken: row.fcm_token,
    role: row.role,
    joinedAt: row.joined_at || row.last_seen,
  };
}
