import { useState, useEffect } from 'react';
import { updateProfile } from '../supabase/auth';
import type { AppUser } from '../types';

/** Registers the browser for web-push notifications via VAPID + service worker. */
export function usePush(currentUser: AppUser | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
    if (ok && Notification.permission === 'granted') setEnabled(true);
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!supported) return 'denied';
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') setEnabled(true);
    return perm;
  };

  const registerPush = async () => {
    if (!currentUser || !supported) return;
    try {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) { console.info('[Push] No VAPID key set — skipping'); return; }

      const sw = await navigator.serviceWorker.ready;
      const sub: PushSubscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Store subscription object as JSON in profile
      await updateProfile(currentUser.id, { fcmToken: JSON.stringify(sub) });
      console.info('[Push] Registered');
    } catch (err) {
      console.info('[Push] Not available:', err);
    }
  };

  return { permission, supported, enabled, requestPermission, registerPush };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}
