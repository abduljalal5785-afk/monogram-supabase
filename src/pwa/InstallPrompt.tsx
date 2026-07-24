import React, { useState, useEffect } from 'react';
import { Pen, X, Share } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

/**
 * InstallPrompt — Native-feeling "Add to Home Screen" banner.
 * - Android/Chrome/Edge: triggers the real browser install prompt.
 * - iOS Safari: shows a friendly instructional card (Share ➜ Add to Home Screen).
 * - Hidden once installed (standalone) or dismissed for 7 days.
 */
const DISMISS_KEY = 'monogram:install-dismissed-until';

export function InstallPrompt({ dark = true }: { dark?: boolean }) {
  const { installable, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);

  useEffect(() => {
    if (isStandalone) return;
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() < until) return;
    if (installable || isIOS) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
  }, [installable, isIOS, isStandalone]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 3600 * 1000));
    setVisible(false);
  };

  const handleInstall = async () => {
    if (isIOS) { setShowIOSSheet(true); return; }
    const res = await promptInstall();
    if (res.outcome === 'accepted' || res.outcome === 'dismissed') setVisible(false);
  };

  if (!visible || isStandalone) return null;

  return (
    <>
      <div className={`fixed bottom-24 left-4 right-4 z-40 rounded-3xl p-4 flex items-center gap-3 shadow-2xl animate-[pwa-slide_400ms_ease-out] ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${dark ? 'bg-black text-white' : 'bg-white text-black'}`}>
          <Pen size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Install Monogram</p>
          <p className="text-[11px] opacity-70">Add to Home Screen for the full app experience</p>
        </div>
        <button onClick={handleInstall} className={`px-4 py-2 rounded-full text-xs font-semibold ${dark ? 'bg-black text-white' : 'bg-white text-black'}`}>Install</button>
        <button onClick={dismiss} className={`p-1.5 rounded-full ${dark ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}><X size={14} /></button>
      </div>

      {showIOSSheet && (
        <div className="fixed inset-0 z-50 flex items-end animate-[pwa-fade_200ms_ease-out]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIOSSheet(false)} />
          <div className={`relative w-full rounded-t-[28px] p-6 pb-8 ${dark ? 'bg-neutral-900 text-white' : 'bg-white text-black'} animate-[pwa-slide_250ms_ease-out]`}>
            <div className={`w-10 h-1 rounded-full mx-auto mb-5 ${dark ? 'bg-white/20' : 'bg-black/10'}`} />
            <h3 className="text-lg font-bold mb-2">Add Monogram to your Home Screen</h3>
            <p className={`text-sm mb-5 ${dark ? 'text-white/60' : 'text-black/60'}`}>Get the full-screen app experience with offline access and push notifications.</p>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dark ? 'bg-white/10' : 'bg-black/5'}`}>1</span>
                <span>Tap the <Share size={14} className="inline mx-1" /> <b>Share</b> button in Safari</span>
              </li>
              <li className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dark ? 'bg-white/10' : 'bg-black/5'}`}>2</span>
                <span>Choose <b>"Add to Home Screen"</b></span>
              </li>
              <li className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dark ? 'bg-white/10' : 'bg-black/5'}`}>3</span>
                <span>Tap <b>"Add"</b> in the top-right</span>
              </li>
            </ol>
            <button onClick={() => setShowIOSSheet(false)} className={`w-full mt-6 py-3 rounded-full text-sm font-semibold ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>Got it</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pwa-slide { from{transform:translateY(140%)} to{transform:translateY(0)} }
        @keyframes pwa-fade { from{opacity:0} to{opacity:1} }
      `}} />
    </>
  );
}
