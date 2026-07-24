import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AppUser } from '../types';

interface Props {
  user: AppUser;
  dark: boolean;
  onSave: (displayName: string, bio: string) => Promise<void>;
  onClose: () => void;
}

export default function ProfileEditModal({ user, dark, onSave, onClose }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      await onSave(displayName.trim(), bio.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end animate-[slideUp_250ms_ease-out]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full rounded-t-[28px] p-5 pb-8 ${dark ? 'bg-neutral-900 text-white' : 'bg-white text-black'} animate-[slideUp_250ms_ease-out]`}>
        {/* Handle */}
        <div className={`w-10 h-1 rounded-full mx-auto mb-4 ${dark ? 'bg-white/20' : 'bg-black/10'}`} />

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Edit profile</h3>
          <button onClick={onClose} className={`p-2 rounded-full ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><X size={18} /></button>
        </div>

        {/* Avatar preview */}
        <div className="flex items-center justify-center mb-6">
          <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center text-2xl font-bold ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
            {displayName.slice(0, 2).toUpperCase() || user.avatarSeed || '?'}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-2 opacity-60">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className={`w-full px-4 py-3 rounded-2xl text-sm outline-none ${dark ? 'bg-white/10 placeholder:text-white/30' : 'bg-black/5 placeholder:text-black/30'}`}
              maxLength={40}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-2 opacity-60">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Something about you…"
              rows={3}
              className={`w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none ${dark ? 'bg-white/10 placeholder:text-white/30' : 'bg-black/5 placeholder:text-black/30'}`}
              maxLength={160}
            />
            <p className="text-[10px] opacity-40 text-right mt-1">{bio.length}/160</p>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim()}
          className={`w-full mt-6 py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-40 transition active:scale-[0.98] ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
