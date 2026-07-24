import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { subscribeProfiles } from '../supabase/auth';
import type { AppUser } from '../types';

export function usePresence(currentUser: AppUser | null) {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    return subscribeProfiles(setAllUsers);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const ping = () => {
      supabase.from('profiles').update({ status: 'online', last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    };
    ping();
    const i = setInterval(ping, 60000);
    return () => clearInterval(i);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const away = () => supabase.from('profiles').update({ status: 'away', last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    const online = () => supabase.from('profiles').update({ status: 'online', last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    window.addEventListener('blur', away);
    window.addEventListener('focus', online);
    return () => { window.removeEventListener('blur', away); window.removeEventListener('focus', online); };
  }, [currentUser]);

  return allUsers;
}
