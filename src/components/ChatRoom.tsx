import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Send, Smile, Camera, Mic, MicOff, Pen, Paperclip,
  Image as ImageIcon, Check, CheckCheck, MoreVertical,
} from 'lucide-react';
import { uploadMedia, uploadFile } from '../supabase/storage';
import type { AppUser, FireChat, FireMessage } from '../types';
import Avatar from './Avatar';
import { timeAgo } from '../utils/time';

const EMOJIS = ['👍', '❤️', '😂', '🔥', '😢', '😮'];
const MESSAGE_CHARS = [
  '😀','😂','❤️','👍','🔥','🎉','😢','😡','🤔','🙏',
  '✨','💪','👏','🙌','🤣','😍','🥰','😘','😜','🤗',
];

interface Props {
  currentUser: AppUser;
  allUsers: AppUser[];
  chat: FireChat;
  messages: FireMessage[];
  dark: boolean;
  onBack: () => void;
  onSend: (m: { chatId: string; type: FireMessage['type']; content?: string; mediaUrl?: string }) => Promise<FireMessage | null>;
  onToggleReaction: (msgId: string, emoji: string, currentReactions: Record<string, string>) => Promise<void>;
  onNavigateDraw: () => void;
}

export default function ChatRoom({ currentUser, allUsers, chat, messages, dark, onBack, onSend, onToggleReaction, onNavigateDraw }: Props) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactMsgId, setReactMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  const userMap = useMemo(() => Object.fromEntries(allUsers.map((u) => [u.id, u])), [allUsers]);

  // Chat header info
  const isDirect = chat.type === 'direct';
  const otherUid = isDirect ? chat.memberUids.find((id) => id !== currentUser.id) : undefined;
  const otherUser = otherUid ? userMap[otherUid] : undefined;
  const title = isDirect ? (otherUser?.displayName || 'Chat') : (chat.name || 'Group');
  const subtitle = isDirect
    ? (otherUser?.status === 'online' ? 'Online' : otherUser?.status === 'away' ? 'Away' : 'Offline')
    : `${chat.memberUids.length} members`;

  // Auto-scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await onSend({ chatId: chat.id, type: 'text', content: text.trim() });
    setText('');
  };

  // ── Image upload ──
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);
    if (url) await onSend({ chatId: chat.id, type: 'image', mediaUrl: url });
  };

  // ── Voice recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      mr.onstop = async () => {
        setUploading(true);
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const url = await uploadMedia(URL.createObjectURL(blob), 'voice.webm');
        setUploading(false);
        if (url) await onSend({ chatId: chat.id, type: 'voice', mediaUrl: url });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
    } catch { alert('Microphone access denied'); }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  // ── Emoji reaction ──
  const handleReact = async (msgId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    await onToggleReaction(msgId, emoji, msg.reactions);
    setReactMsgId(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`shrink-0 px-4 py-3 flex items-center gap-3 border-b z-20 ${dark ? 'bg-black/60 backdrop-blur-xl border-white/10' : 'bg-white/70 backdrop-blur-xl border-black/5'}`}>
        <button onClick={onBack} className="p-1.5 -ml-1"><ArrowLeft size={20} /></button>
        <Avatar user={otherUser} dark={dark} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className={`text-[10px] ${dark ? 'text-white/50' : 'text-black/50'}`}>{subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onNavigateDraw} className={`p-2 rounded-full ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><Pen size={16} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {uploading && (
          <div className="text-center py-2">
            <span className={`text-[10px] px-3 py-1 rounded-full animate-pulse ${dark ? 'bg-white/10' : 'bg-black/5'}`}>Uploading…</span>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.senderUid === currentUser.id;
          const sender = userMap[m.senderUid];
          const showAvatar = i === 0 || messages[i - 1].senderUid !== m.senderUid;
          const read = (m.readBy || []).length > 1;
          const reactCounts = Object.entries(m.reactions || {}).reduce<Record<string, number>>((acc, [, e]) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {});

          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-3' : ''}`}>
              {!mine && showAvatar && <Avatar user={sender} dark={dark} size={28} className="mr-2 shrink-0" />}
              {!mine && !showAvatar && <div className="w-7 mr-2 shrink-0" />}
              <div className="relative max-w-[75%]">
                {/* Message bubble */}
                <div
                  onDoubleClick={() => setReactMsgId(reactMsgId === m.id ? null : m.id)}
                  onClick={() => setReactMsgId(null)}
                  className={`px-3.5 py-2.5 text-sm leading-relaxed cursor-default ${mine
                    ? `${dark ? 'bg-white text-black' : 'bg-black text-white'} rounded-2xl rounded-br-md`
                    : `${dark ? 'bg-white/10' : 'bg-black/5'} rounded-2xl rounded-bl-md`}`}>
                  {m.type === 'image' && <img src={m.mediaUrl} alt="" className="max-w-60 max-h-60 rounded-xl mb-1" />}
                  {m.type === 'voice' && m.mediaUrl && <audio controls src={m.mediaUrl} className="max-w-48 h-8" />}
                  {m.type === 'drawing' && m.mediaUrl && <img src={m.mediaUrl} alt="Drawing" className="max-w-48 max-h-48 rounded-xl mb-1" />}
                  {m.content ? <p>{m.content}</p> : m.type === 'image' ? null : <p className="opacity-50 italic">Media</p>}
                </div>

                {/* Reactions */}
                {Object.keys(reactCounts).length > 0 && (
                  <div className={`flex gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(reactCounts).map(([e, c]) => (
                      <span key={e} className={`text-xs px-1.5 py-0.5 rounded-full cursor-pointer ${dark ? 'bg-white/10' : 'bg-black/5'}`}
                        onClick={() => handleReact(m.id, e)}>{e} {c}</span>
                    ))}
                  </div>
                )}

                {/* Reaction picker */}
                {reactMsgId === m.id && (
                  <div className={`absolute -top-9 ${mine ? 'right-0' : 'left-0'} flex gap-1 px-2 py-1.5 rounded-2xl shadow-xl animate-[fadeUp_150ms_ease-out] z-10 ${dark ? 'bg-neutral-800 border border-white/10' : 'bg-white border border-black/5 shadow-lg'}`}>
                    {EMOJIS.map((e) => (
                      <button key={e} onClick={() => handleReact(m.id, e)} className="text-lg hover:scale-125 transition active:scale-90">{e}</button>
                    ))}
                  </div>
                )}

                {/* Read receipt */}
                {mine && <div className="flex justify-end mt-0.5">{read ? <CheckCheck size={12} className="text-blue-400" /> : <Check size={12} className={dark ? 'text-white/40' : 'text-black/40'} />}</div>}
              </div>
              {mine && showAvatar && <Avatar user={currentUser} dark={dark} size={28} className="ml-2 shrink-0" />}
              {mine && !showAvatar && <div className="w-7 ml-2 shrink-0" />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className={`shrink-0 px-3 py-2.5 flex items-center gap-2 border-t safe-bottom ${dark ? 'bg-black/80 backdrop-blur-2xl border-white/10' : 'bg-white/80 backdrop-blur-2xl border-black/5'}`}>
        {/* Emoji keyboard */}
        {emojiOpen && (
          <div className="absolute bottom-16 left-0 right-0 p-3 grid grid-cols-10 gap-1 z-30 animate-[slideUp_200ms_ease-out]" style={{ backgroundColor: dark ? '#171717' : '#fff', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
            {MESSAGE_CHARS.map((e) => (
              <button key={e} onClick={() => { setText((t) => t + e); }} className="text-lg py-1 hover:scale-125 transition">{e}</button>
            ))}
          </div>
        )}
        <button onClick={() => setEmojiOpen(!emojiOpen)} className={`p-2 rounded-full active:scale-90 ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><Smile size={18} opacity={0.6} /></button>
        <button onClick={() => fileInput.current?.click()} className={`p-2 rounded-full active:scale-90 ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><Camera size={18} opacity={0.6} /></button>
        <button onClick={onNavigateDraw} className={`p-2 rounded-full active:scale-90 ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><Pen size={18} opacity={0.6} /></button>
        <input ref={fileInput} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        <div className={`flex-1 rounded-full px-4 py-2 ${dark ? 'bg-white/10' : 'bg-black/5'}`}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…"
            className="w-full bg-transparent text-sm outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
        </div>
        {text.trim() ? (
          <button onClick={handleSend} className={`p-2 rounded-full ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}><Send size={17} /></button>
        ) : recording ? (
          <button onClick={stopRecording} className="p-2 rounded-full bg-red-500 text-white animate-pulse"><MicOff size={17} /></button>
        ) : (
          <button onClick={startRecording} className={`p-2 rounded-full ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><Mic size={18} opacity={0.6} /></button>
        )}
      </div>
    </div>
  );
}
