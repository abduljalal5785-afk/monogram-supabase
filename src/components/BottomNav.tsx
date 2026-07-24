import React from 'react';
import { Home, MessageCircle, Pen, User } from 'lucide-react';

interface Props {
  tab: string;
  onChange: (tab: string) => void;
  dark: boolean;
}

const TABS = [
  { id: 'feed', icon: Home, label: 'Feed' },
  { id: 'chat', icon: MessageCircle, label: 'Chat' },
  { id: 'draw', icon: Pen, label: 'Draw' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export default function BottomNav({ tab, onChange, dark }: Props) {
  return (
    <div className={`border-t px-2 pt-1.5 pb-3 flex items-center justify-around safe-bottom ${dark ? 'bg-black/80 backdrop-blur-2xl border-white/10' : 'bg-white/80 backdrop-blur-2xl border-black/5'}`}>
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl transition active:scale-95 ${
              active ? (dark ? 'text-white' : 'text-black') : dark ? 'text-white/40' : 'text-black/40'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
