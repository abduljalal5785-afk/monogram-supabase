import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Undo, Trash2, Share2, Pen, Highlighter, Eraser, X } from 'lucide-react';
import { uploadMedia } from '../supabase/storage';
import type { AppUser, FireChat } from '../types';
import Avatar from './Avatar';

const COLORS = ['#000000', '#FFFFFF', '#FF3B30', '#007AFF', '#34C759', '#FF9500'];
const BRUSH_SIZES = [2, 4, 8, 16];

type Tool = 'pen' | 'highlighter' | 'eraser';

interface Props {
  currentUser: AppUser;
  allUsers: AppUser[];
  chats: FireChat[];
  dark: boolean;
  onBack: () => void;
  onCreatePost: (content: string, mediaUrl?: string, mediaType?: string) => Promise<any>;
  onSendToChat: (chatId: string, mediaUrl: string, title: string) => Promise<any>;
}

export default function DrawScreen({ currentUser, allUsers, chats, dark, onBack, onCreatePost, onSendToChat }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (!dark) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, rect.width, rect.height); }
    // Save initial state
    setUndoStack([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, [dark]);

  const getCtx = () => canvasRef.current?.getContext('2d');

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = getCtx(); if (!ctx) return;
    const pos = getPos(e);
    setIsDrawing(true);
    lastPoint.current = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'highlighter' ? color + '40' : tool === 'eraser' ? (dark ? '#000' : '#fff') : color;
    ctx.lineWidth = tool === 'highlighter' ? brushSize * 3 : tool === 'eraser' ? brushSize * 2 : brushSize;
    if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
    else ctx.globalCompositeOperation = 'source-over';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = getCtx(); if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPoint.current = null;
    const ctx = getCtx(); if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    // Save undo state
    const canvas = canvasRef.current!;
    setUndoStack((s) => [...s.slice(-19), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const undo = () => {
    if (undoStack.length <= 1) return;
    const ctx = getCtx(); if (!ctx) return;
    const canvas = canvasRef.current!;
    setUndoStack((s) => {
      const prev = s[s.length - 2];
      ctx.putImageData(prev, 0, 0);
      return s.slice(0, -1);
    });
  };

  const clear = () => {
    const ctx = getCtx(); if (!ctx) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if (!dark) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, rect.width, rect.height); }
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUndoStack([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  // ── Share ──
  const handleShareAsPost = async () => {
    setSending(true);
    const dataUrl = canvasRef.current!.toDataURL('image/png');
    const url = await uploadMedia(dataUrl, 'drawing.png');
    if (url) await onCreatePost('', url, 'drawing');
    setSending(false);
    onBack();
  };

  const handleShareToChat = async (chatId: string) => {
    setSending(true);
    const dataUrl = canvasRef.current!.toDataURL('image/png');
    const url = await uploadMedia(dataUrl, 'drawing.png');
    if (url) await onSendToChat(chatId, url, 'Drawing');
    setSending(false);
    onBack();
  };

  const btnBg = dark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10';

  return (
    <div className={`h-full flex flex-col ${dark ? 'text-white' : 'text-black'}`} style={{ backgroundColor: dark ? '#111' : '#f5f5f5' }}>
      {/* Toolbar */}
      <div className="shrink-0 px-3 py-2 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-1">
          {[{ t: 'pen' as Tool, i: Pen }, { t: 'highlighter' as Tool, i: Highlighter }, { t: 'eraser' as Tool, i: Eraser }].map(({ t, i: Icon }) => (
            <button key={t} onClick={() => setTool(t)} className={`p-2 rounded-full ${tool === t ? (dark ? 'bg-white text-black' : 'bg-black text-white') : btnBg}`}>
              <Icon size={16} />
            </button>
          ))}
          <div className="w-px h-5 mx-1" style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
          <button onClick={undo} className={`p-2 rounded-full ${btnBg}`}><Undo size={16} /></button>
          <button onClick={clear} className={`p-2 rounded-full ${btnBg}`}><Trash2 size={16} /></button>
          <div className="w-px h-5 mx-1" style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
          <button onClick={() => setShareOpen(true)} disabled={sending} className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
            <Share2 size={13} /> {sending ? 'Sending…' : 'Share'}
          </button>
        </div>
      </div>

      {/* Color palette */}
      <div className="flex items-center gap-2 px-4 py-1.5 justify-center">
        {COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full transition border-2 active:scale-90"
            style={{ backgroundColor: c, borderColor: color === c ? (dark ? '#fff' : '#000') : c === '#FFFFFF' ? 'rgba(0,0,0,0.15)' : c }} />
        ))}
        <div className="w-px h-5 mx-1" style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
        {BRUSH_SIZES.map((s) => (
          <button key={s} onClick={() => setBrushSize(s)} className={`rounded-full flex items-center justify-center active:scale-90 ${brushSize === s ? (dark ? 'bg-white/20' : 'bg-black/10') : ''}`} style={{ width: 28, height: 28 }}>
            <div className="rounded-full" style={{ width: s + 2, height: s + 2, backgroundColor: tool === 'eraser' ? (dark ? '#fff' : '#000') : color }} />
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 m-2 rounded-3xl overflow-hidden" style={{ backgroundColor: dark ? '#000' : '#fff' }}>
        <canvas ref={canvasRef} className="w-full h-full touch-none"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
      </div>

      {/* Share sheet */}
      {shareOpen && (
        <div className="absolute inset-0 z-50 flex items-end animate-[slideUp_250ms_ease-out]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShareOpen(false)} />
          <div className={`relative w-full rounded-t-[28px] p-5 pb-8 ${dark ? 'bg-neutral-900 text-white' : 'bg-white text-black'} animate-[slideUp_250ms_ease-out]`}>
            <div className={`w-10 h-1 rounded-full mx-auto mb-4 ${dark ? 'bg-white/20' : 'bg-black/10'}`} />
            <h3 className="text-lg font-bold mb-4">Share drawing</h3>
            <button onClick={handleShareAsPost} className={`w-full py-3.5 rounded-2xl font-semibold text-sm mb-3 ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
              Post to Feed
            </button>
            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-white/50' : 'text-black/50'}`}>Send to chat</p>
            {chats.map((c) => {
              const otherId = c.type === 'direct' ? c.memberUids.find((id) => id !== currentUser.id) : undefined;
              const other = otherId ? allUsers.find((u) => u.id === otherId) : undefined;
              return (
                <button key={c.id} onClick={() => handleShareToChat(c.id)} className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-2xl ${dark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                  <Avatar user={other} dark={dark} size={36} />
                  <span className="text-sm font-semibold">{c.name || other?.displayName || 'Chat'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
