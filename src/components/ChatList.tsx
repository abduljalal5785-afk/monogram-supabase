import React, { useState, useMemo } from 'react';
import { Search, Plus, ChevronRight, Users, MessageCircle, Check } from 'lucide-react';
import Avatar from './Avatar';
import { timeAgo } from '../utils/time';
import type { AppUser, FireChat, FireMessage } from '../types';

interface Props {
  currentUser: AppUser;
  allUsers: AppUser[];
  chats: FireChat[];
  allMessages: FireMessage[];
  dark: boolean;
  onOpenChat: (chatId: string) => void;
  onStartDM: (otherUid: string) => Promise<string>;
  onCreateGroup: (name: string, memberUids: string[]) => Promise<string>;
}

export default function ChatList({ currentUser, allUsers, chats, allMessages, dark, onOpenChat, onStartDM, onCreateGroup }: Props) {
  const [search, setSearch] = useState('');
  const [sheetMode, setSheetMode] = useState<'closed' | 'dm' | 'group'>('closed');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const userMap = useMemo(() => Object.fromEntries(allUsers.map((u) => [u.id, u])), [allUsers]);
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);

  const chatsWithMeta = chats.map((c) => {
    const msgs = allMessages.filter((m) => m.chatId === c.id);
    const last = msgs[msgs.length - 1];
    const unread = msgs.filter(
      (m) => m.senderUid !== currentUser.id && !(m.readBy || []).includes(currentUser.id),
    ).length;
    let title = c.name;
    let subUser: AppUser | undefined;
    if (c.type === 'direct') {
      const otherId = c.memberUids.find((id) => id !== currentUser.id);
      subUser = otherId ? userMap[otherId] : undefined;
      title = subUser?.displayName || 'Direct';
    }
    return { ...c, last, unread, title, subUser };
  }).filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()));

  const handleStartDM = async (uid: string) => {
    const chatId = await onStartDM(uid);
    setSheetMode('closed');
    if (chatId) onOpenChat(chatId);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    const chatId = await onCreateGroup(groupName.trim(), selectedMembers);
    setSheetMode('closed');
    setGroupName('');
    setSelectedMembers([]);
    if (chatId) onOpenChat(chatId);
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`sticky top-0 z-20 px-5 pt-3 pb-3 border-b ${dark ? 'bg-black/60 backdrop-blur-xl border-white/10' : 'bg-white/70 backdrop-blur-xl border-black/5'}`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <button onClick={() => setSheetMode('dm')}
            className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full ${dark ? 'bg-white/10' : 'bg-black/5'}`}>
          <Search size={14} className={dark ? 'text-white/50' : 'text-black/50'} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chatsWithMeta.map((c) => (
          <button key={c.id} onClick={() => onOpenChat(c.id)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 border-b transition ${dark ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/[0.02]'}`}>
            {c.type === 'direct' ? (
              <Avatar user={c.subUser} dark={dark} size={48} />
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dark ? 'bg-white/10' : 'bg-black/10'}`}>
                <Users size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold truncate">{c.title}</p>
                <p className={`text-[10px] ${dark ? 'text-white/40' : 'text-black/40'}`}>{timeAgo(c.last_message_at)}</p>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className={`text-xs truncate flex-1 ${dark ? 'text-white/50' : 'text-black/50'}`}>
                  {c.last_message_preview || (c.last?.type === 'image' ? '📷 Photo' : c.last?.type === 'voice' ? '🎙 Voice note' : c.last?.type === 'drawing' ? '✍️ Drawing' : c.last?.content || 'No messages yet')}
                </p>
                {c.unread > 0 && (
                  <span className={`ml-2 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>{c.unread}</span>
                )}
              </div>
            </div>
          </button>
        ))}
        {chatsWithMeta.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle size={32} className={`mx-auto mb-3 ${dark ? 'text-white/20' : 'text-black/20'}`} />
            <p className={`text-sm ${dark ? 'text-white/50' : 'text-black/50'}`}>No chats yet. Tap + to start one.</p>
          </div>
        )}
      </div>

      {sheetMode !== 'closed' && (
        <div className="absolute inset-0 z-40 flex items-end animate-[slideUp_250ms_ease-out]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSheetMode('closed')} />
          <div className={`relative w-full rounded-t-[28px] p-5 pb-6 max-h-[85%] overflow-y-auto ${dark ? 'bg-neutral-900' : 'bg-white'}`}>
            <div className={`w-10 h-1 rounded-full mx-auto mb-4 ${dark ? 'bg-white/20' : 'bg-black/10'}`} />
            {sheetMode === 'dm' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Start a chat</h3>
                  <button onClick={() => { setSheetMode('group'); setSelectedMembers([]); }}
                    className={`px-4 py-2 rounded-full text-xs font-semibold ${dark ? 'bg-white/10' : 'bg-black/5'}`}>
                    <Users size={13} className="inline mr-1" /> New group
                  </button>
                </div>
                {otherUsers.map((u) => (
                  <button key={u.id} onClick={() => handleStartDM(u.id)}
                    className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-2xl ${dark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <Avatar user={u} dark={dark} size={44} />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">{u.displayName}</p>
                      <p className={`text-[11px] ${dark ? 'text-white/50' : 'text-black/50'}`}>
                        {u.status === 'online' ? 'Online' : u.status === 'away' ? 'Away' : `Last seen ${timeAgo(u.lastSeen)}`}
                      </p>
                    </div>
                    <ChevronRight size={16} className={dark ? 'text-white/40' : 'text-black/40'} />
                  </button>
                ))}
              </>
            )}
            {sheetMode === 'group' && (
              <>
                <button onClick={() => { setSheetMode('dm'); setSelectedMembers([]); }}
                  className={`text-xs mb-3 ${dark ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'} flex items-center gap-1`}>
                  ← Back
                </button>
                <h3 className="text-lg font-bold mb-4">New group chat</h3>
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name"
                  className={`w-full px-4 py-3 rounded-2xl text-sm outline-none mb-4 ${dark ? 'bg-white/10 placeholder:text-white/30' : 'bg-black/5 placeholder:text-black/30'}`} />
                <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-white/50' : 'text-black/50'}`}>Select members ({selectedMembers.length})</p>
                {otherUsers.map((u) => {
                  const sel = selectedMembers.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleMember(u.id)}
                      className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-2xl transition ${dark ? (sel ? 'bg-white/10' : 'hover:bg-white/5') : (sel ? 'bg-black/5' : 'hover:bg-black/5')}`}>
                      <Avatar user={u} dark={dark} size={40} />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold">{u.displayName}</p>
                        <p className={`text-[11px] ${dark ? 'text-white/50' : 'text-black/50'}`}>{u.status === 'online' ? 'Online' : `Last seen ${timeAgo(u.lastSeen)}`}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${sel ? (dark ? 'bg-white border-white' : 'bg-black border-black') : (dark ? 'border-white/30' : 'border-black/30')}`}>
                        {sel && <Check size={12} className={dark ? 'text-black' : 'text-white'} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
                <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedMembers.length === 0}
                  className={`w-full mt-5 py-3 rounded-2xl font-semibold text-sm disabled:opacity-30 transition ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>Create group</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
