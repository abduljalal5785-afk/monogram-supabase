import { useState, useEffect } from 'react';

/** Detects whether the browser is online. Simple wrapper around navigator.onLine. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const go = () => setOnline(true);
    const gone = () => setOnline(false);
    window.addEventListener('online', go);
    window.addEventListener('offline', gone);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', gone); };
  }, []);

  return online;
}
