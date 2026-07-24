import React from 'react';
import type { AppUser } from '../types';

interface Props {
  user?: AppUser;
  dark: boolean;
  size?: number;
}

export default function Avatar({ user, dark, size = 40 }: Props) {
  const seed = user?.avatarSeed || '?';
  const status = user?.status;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className={`rounded-full flex items-center justify-center font-bold text-sm ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {seed}
      </div>
      {status && (
        <div
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 ${dark ? 'border-black' : 'border-white'} ${
            status === 'online' ? 'bg-green-500' : status === 'away' ? 'bg-amber-500' : 'bg-neutral-400'
          }`}
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      )}
    </div>
  );
}
