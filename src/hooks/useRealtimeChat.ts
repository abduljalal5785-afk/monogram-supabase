import { useState, useEffect } from 'react';
import {
  subscribeChats, subscribeMessages, sendMessage,
  toggleReaction as toggleMsgReaction, markMessageRead,
  createDirectChat, createGroupChat,
} from '../supabase/db';
import type { FireChat, FireMessage, AppUser } from '../types';

export function useRealtimeChat(currentUser: AppUser | null) {
  const [chats, setChats] = useState<FireChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<FireMessage[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    return subscribeChats(currentUser.id, setChats);
  }, [currentUser]);

  useEffect(() => {
    if (!activeChatId) { setActiveMessages([]); return; }
    return subscribeMessages(activeChatId, setActiveMessages);
  }, [activeChatId]);

  const send = async (m: { chatId: string; type: FireMessage['type']; content?: string; mediaUrl?: string }) => {
    if (!currentUser) return null;
    return sendMessage({ ...m, senderUid: currentUser.id });
  };

  const toggleReaction = async (msgId: string, emoji: string, currentReactions: Record<string, string>) => {
    if (!currentUser) return;
    await toggleMsgReaction(msgId, currentUser.id, emoji, currentReactions);
  };

  const startDM = async (otherUid: string) => {
    if (!currentUser) return '';
    return createDirectChat(currentUser.id, otherUid) ?? '';
  };

  const createGroup = async (name: string, memberUids: string[]) => {
    if (!currentUser) return '';
    return createGroupChat(name, [...memberUids, currentUser.id], currentUser.id) ?? '';
  };

  return { chats, activeChatId, setActiveChatId, activeMessages, send, toggleReaction, startDM, createGroup };
}
