import React, { useState, useMemo } from 'react';
import { Search, MoreHorizontal, Heart, MessageCircle, Pin } from 'lucide-react';
import type { AppUser, Post, Comment } from '../types';
import Avatar from './Avatar';
import { timeAgo } from '../utils/time';

interface Props {
  currentUser: AppUser;
  allUsers: AppUser[];
  posts: Post[];
  comments: Comment[];
  dark: boolean;
  onNavigate: (tab: string) => void;
  onCreatePost: (content: string, mediaUrl?: string, mediaType?: string) => Promise<Post | null>;
  onUpdatePost: (postId: string, content: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onToggleLike: (postId: string, currentLikes: string[]) => Promise<void>;
  onTogglePin: (postId: string, pinned: boolean) => Promise<void>;
  onAddComment: (postId: string, content: string) => Promise<Comment | null>;
}

export default function Feed({ currentUser, allUsers, posts, comments, dark, onCreatePost, onUpdatePost, onDeletePost, onToggleLike, onTogglePin, onAddComment }: Props) {
  const [composing, setComposing] = useState('');
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const userMap = useMemo(() => Object.fromEntries(allUsers.map((u) => [u.id, u])), [allUsers]);
  const cardBg = dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/5';

  const handleCreate = async () => {
    if (!composing.trim()) return;
    await onCreatePost(composing.trim());
    setComposing('');
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    await onAddComment(postId, commentText.trim());
    setCommentText('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`sticky top-0 z-20 px-5 pt-3 pb-3 border-b ${dark ? 'bg-black/60 backdrop-blur-xl border-white/10' : 'bg-white/70 backdrop-blur-xl border-black/5'}`}>
        <h1 className="text-2xl font-bold tracking-tight mb-3">Feed</h1>
        <div className="flex items-center gap-2">
          <div className={`flex-1 rounded-full px-4 py-2.5 ${dark ? 'bg-white/10' : 'bg-black/5'}`}>
            <input
              value={composing}
              onChange={(e) => setComposing(e.target.value)}
              placeholder="What's up?"
              className="w-full bg-transparent text-sm outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <button onClick={handleCreate} disabled={!composing.trim()}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold disabled:opacity-30 transition active:scale-95 ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
            Post
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {posts.map((p) => {
          const author = userMap[p.authorUid];
          const postComments = comments.filter((c) => c.postId === p.id);
          const isLiked = p.likedUids?.includes(currentUser.id);
          const showComments = expandedComments === p.id;

          return (
            <div key={p.id} className={`px-5 py-4 border-b ${dark ? 'border-white/5' : 'border-black/5'}`}>
              <div className="flex items-start gap-3">
                <Avatar user={author} dark={dark} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{author?.displayName || 'Unknown'}</p>
                      <p className={`text-[10px] ${dark ? 'text-white/40' : 'text-black/40'}`}>
                        {timeAgo(p.createdAt)} {p.pinned && '· 📌 Pinned'}
                      </p>
                    </div>
                    {author?.id === currentUser.id && (
                      <div className="flex gap-1">
                        <button onClick={() => onTogglePin(p.id, p.pinned)} className={`p-1 rounded-full ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                          <Pin size={13} className={p.pinned ? 'text-amber-500' : ''} />
                        </button>
                        <button onClick={() => onDeletePost(p.id)} className={`p-1 rounded-full ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                          <MoreHorizontal size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  {p.content && <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{p.content}</p>}
                  {p.mediaUrl && (
                    <img src={p.mediaUrl} alt="" className="mt-3 rounded-2xl w-full object-cover max-h-80" />
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <button onClick={() => onToggleLike(p.id, p.likedUids)} className="flex items-center gap-1">
                      <Heart size={15} className={isLiked ? 'fill-red-500 text-red-500' : (dark ? 'text-white/50' : 'text-black/50')} />
                      <span className="text-[11px]">{p.likedUids?.length || 0}</span>
                    </button>
                    <button onClick={() => { setExpandedComments(showComments ? null : p.id); setCommentText(''); }} className="flex items-center gap-1">
                      <MessageCircle size={15} className={dark ? 'text-white/50' : 'text-black/50'} />
                      <span className="text-[11px]">{postComments.length}</span>
                    </button>
                  </div>
                  {showComments && (
                    <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      {postComments.map((c) => {
                        const ca = userMap[c.authorUid];
                        return (
                          <div key={c.id} className="flex gap-2">
                            <Avatar user={ca} dark={dark} size={24} />
                            <div>
                              <p className="text-xs"><span className="font-semibold">{ca?.displayName}</span> <span className="opacity-70">{c.content}</span></p>
                              <p className={`text-[9px] ${dark ? 'text-white/30' : 'text-black/30'}`}>{timeAgo(c.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex gap-2 mt-2">
                        <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment…"
                          className={`flex-1 bg-transparent text-xs outline-none ${dark ? 'placeholder:text-white/30' : 'placeholder:text-black/30'}`}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(p.id)} />
                        <button onClick={() => handleAddComment(p.id)} className={`text-xs font-semibold ${dark ? 'text-white/70' : 'text-black/70'}`}>Post</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {posts.length === 0 && (
          <div className="text-center py-20">
            <p className={`text-sm ${dark ? 'text-white/40' : 'text-black/40'}`}>No posts yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}
