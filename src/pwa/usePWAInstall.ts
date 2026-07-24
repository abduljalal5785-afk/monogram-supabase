import { useEffect, useState, useCallback } from 'react';

/**
 * usePWAInstall — reactively expose install state + trigger the prompt.
 *
 * Returned:
 *   installable  : true on Android/Chrome/Edge when the browser has fired `beforeinstallprompt`
 *   isIOS        : true on iOS Safari (needs manual "Add to Home Screen" — show a hint UI)
 *   isStandalone : already installed & running from home screen
 *   promptInstall(): triggers the native browser install prompt (Android)
 */
export function usePWAInstall() {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS] = useState<boolean>(() => (window as any).__isIOS === true);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => (window as any).__isStandalone === true);

  useEffect(() => {
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => { setInstalled(true); setInstallable(false); setIsStandalone(true); };
    window.addEventListener('pwa:installable', onInstallable);
    window.addEventListener('pwa:installed', onInstalled);
    const mq = window.matchMedia('(display-mode: standalone)');
    const onMQ = () => setIsStandalone(mq.matches);
    mq.addEventListener?.('change', onMQ);
    return () => {
      window.removeEventListener('pwa:installable', onInstallable);
      window.removeEventListener('pwa:installed', onInstalled);
      mq.removeEventListener?.('change', onMQ);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const fn = (window as any).__pwaInstall;
    if (!fn) return { outcome: 'unavailable' as const };
    return fn();
  }, []);

  return { installable, installed, isIOS, isStandalone, promptInstall };
}
