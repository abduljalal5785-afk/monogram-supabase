import React, { useState } from 'react';
import { Moon, Sun, Bell, Settings, LogOut, ChevronRight, Pin } from 'lucide-react';
import type { AppUser, Post } from '../types';
import { updateProfile } from '../supabase/auth';
import ProfileEditModal from './ProfileEditModal';

interface Props {
  currentUser: AppUser;
  myPosts: Post[];
  dark: boolean;
  setDark: (v: boolean) => void;
  onSignOut: () => void;
}

export default function Profile({ currentUser, myPosts, dark, setDark, onSignOut }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const cardBg = dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';

  const handleSaveProfile = async (displayName: string, bio: string) => {
    await updateProfile(currentUser.id, { displayName, bio });
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`sticky top-0 z-20 px-5 pt-3 pb-3 border-b flex items-center justify-between ${dark ? 'bg-black/60 backdrop-blur-xl border-white/10' : 'bg-white/70 backdrop-blur-xl border-black/5'}`}>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <button onClick={() => setDark(!dark)} className={`p-2 rounded-full ${dark ? 'bg-white/10' : 'bg-black/5'}`}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className={`rounded-3xl border p-5 ${cardBg} flex flex-col items-center text-center`}>
          <div className="relative">
            <div className={`w-24 h-24 rounded-[28px] flex items-center justify-center text-3xl font-bold ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
              {currentUser.avatarSeed || currentUser.displayName?.slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 ${dark ? 'border-neutral-950' : 'border-white'} ${currentUser.status === 'online' ? 'bg-green-500' : currentUser.status === 'away' ? 'bg-amber-500' : 'bg-neutral-400'}`} />
          </div>
          <p className="text-xl font-bold mt-3">{currentUser.displayName}</p>
          <p className={`text-xs ${dark ? 'text-white/50' : 'text-black/50'}`}>{currentUser.email}</p>
          <p className="text-sm mt-3">{currentUser.bio || 'No bio yet.'}</p>
          <button onClick={() => setEditOpen(true)}
            className={`mt-4 px-5 py-2 rounded-full text-xs font-semibold ${dark ? 'bg-white/10' : 'bg-black/5'}`}>Edit profile</button>
        </div>

        <div className={`rounded-3xl border p-2 ${cardBg}`}>
          <MenuRow icon={Bell} label="Push notifications" dark={dark} right={<Toggle on dark={dark} />} />
          <MenuRow icon={dark ? Sun : Moon} label="Dark mode" dark={dark} right={<Toggle on={dark} onChange={() => setDark(!dark)} dark={dark} />} />
          <MenuRow icon={Settings} label="Cloud storage" dark={dark} right={<span className={`text-xs ${dark ? 'text-white/50' : 'text-black/50'}`}>Supabase</span>} />
          <MenuRow icon={LogOut} label="Sign out" dark={dark} onClick={onSignOut} danger />
        </div>

        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-white/50' : 'text-black/50'}`}>Your posts · {myPosts.length}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {myPosts.map((p) => (
              <div key={p.id} className={`aspect-square rounded-2xl overflow-hidden ${cardBg} p-2 text-[10px] leading-tight relative`}>
                {p.mediaUrl ? <img src={p.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <p className="line-clamp-6">{p.content}</p>}
                {p.pinned && <Pin size={10} className="absolute top-1.5 right-1.5 text-amber-500 fill-amber-500" />}
              </div>
            ))}
            {myPosts.length === 0 && <p className={`col-span-3 text-xs text-center py-6 ${dark ? 'text-white/50' : 'text-black/50'}`}>No posts yet.</p>}
          </div>
        </div>

        <p className={`text-[10px] text-center ${dark ? 'text-white/30' : 'text-black/30'}`}>Monogram v1.0 · Supabase · PWA</p>
      </div>

      {editOpen && (
        <ProfileEditModal user={currentUser} dark={dark} onSave={handleSaveProfile} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}

function MenuRow({ icon: Icon, label, right, onClick, dark, danger }: { icon: any; label: string; right?: React.ReactNode; onClick?: () => void; dark: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl ${dark ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${danger ? 'text-red-500' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${danger ? 'bg-red-500/10' : (dark ? 'bg-white/10' : 'bg-black/5')}`}><Icon size={15} /></div>
      <p className="flex-1 text-left text-sm font-medium">{label}</p>
      {right || (onClick && !danger && <ChevronRight size={14} className={dark ? 'text-white/40' : 'text-black/40'} />)}
    </button>
  );
}

function Toggle({ on, onChange, dark }: { on: boolean; onChange?: () => void; dark: boolean }) {
  return (
    <button onClick={onChange} className={`w-10 h-6 rounded-full p-0.5 transition ${on ? (dark ? 'bg-white' : 'bg-black') : (dark ? 'bg-white/20' : 'bg-black/10')}`}>
      <div className={`w-5 h-5 rounded-full transition ${on ? (dark ? 'bg-black translate-x-4' : 'bg-white translate-x-4') : (dark ? 'bg-white' : 'bg-black')}`} />
    </button>
  );
}
