import { supabase } from './client';
import type { Post, Comment, FireChat, FireMessage } from '../types';

// ═══════════════════════════════════════════════════════════
//  POSTS
// ═══════════════════════════════════════════════════════════
export async function createPost(authorUid: string, content: string, mediaUrl?: string, mediaType?: string): Promise<Post | null> {
  const { data, error } = await supabase.from('posts').insert({
    author_id: authorUid, content, media_url: mediaUrl, media_type: mediaType,
  }).select().single();
  if (error) return null;
  return mapPost(data);
}

export async function updatePost(postId: string, content: string) {
  await supabase.from('posts').update({ content, updated_at: new Date().toISOString() }).eq('id', postId);
}

export async function deletePost(postId: string) {
  await supabase.from('posts').delete().eq('id', postId);
}

export async function toggleLike(postId: string, uid: string, currentLikes: string[]) {
  const likes = currentLikes.includes(uid)
    ? currentLikes.filter((id) => id !== uid)
    : [...currentLikes, uid];
  await supabase.from('posts').update({ liked_by: likes }).eq('id', postId);
}

export async function togglePin(postId: string, pinned: boolean) {
  await supabase.from('posts').update({ pinned: !pinned }).eq('id', postId);
}

export async function addComment(postId: string, authorUid: string, content: string): Promise<Comment | null> {
  const { data, error } = await supabase.from('comments').insert({
    post_id: postId, author_id: authorUid, content,
  }).select().single();
  if (error) return null;
  return mapComment(data);
}

export function subscribePosts(onPosts: (posts: Post[]) => void): () => void {
  const sub = supabase
    .channel('posts-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
      fetchPosts().then(onPosts);
    })
    .subscribe();
  fetchPosts().then(onPosts);
  return () => { sub.unsubscribe(); };
}

async function fetchPosts(): Promise<Post[]> {
  const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  return (data || []).map(mapPost);
}

export function subscribeComments(onComments: (comments: Comment[]) => void): () => void {
  const sub = supabase
    .channel('comments-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
      fetchComments().then(onComments);
    })
    .subscribe();
  fetchComments().then(onComments);
  return () => { sub.unsubscribe(); };
}

async function fetchComments(): Promise<Comment[]> {
  const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: true });
  return (data || []).map(mapComment);
}

// ═══════════════════════════════════════════════════════════
//  CHATS
// ═══════════════════════════════════════════════════════════
export async function createDirectChat(myUid: string, otherUid: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('chats')
    .select('id, member_ids')
    .eq('type', 'direct')
    .contains('member_ids', [myUid]);

  const found = existing?.find((c: any) => c.member_ids.includes(otherUid));
  if (found) return found.id;

  const { data } = await supabase.from('chats').insert({
    type: 'direct', member_ids: [myUid, otherUid], created_by: myUid,
  }).select().single();
  return data?.id || null;
}

export async function createGroupChat(name: string, memberUids: string[], createdBy: string): Promise<string | null> {
  const { data } = await supabase.from('chats').insert({
    type: 'group', name, member_ids: memberUids, created_by: createdBy,
  }).select().single();
  return data?.id || null;
}

export function subscribeChats(myUid: string, onChats: (chats: FireChat[]) => void): () => void {
  const sub = supabase
    .channel('chats-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
      fetchChats(myUid).then(onChats);
    })
    .subscribe();
  fetchChats(myUid).then(onChats);
  return () => { sub.unsubscribe(); };
}

async function fetchChats(myUid: string): Promise<FireChat[]> {
  const { data } = await supabase.from('chats').select('*').contains('member_ids', [myUid]).order('last_message_at', { ascending: false, nullsFirst: false });
  return (data || []).map(mapChat);
}

// ═══════════════════════════════════════════════════════════
//  MESSAGES
// ═══════════════════════════════════════════════════════════
export async function sendMessage(msg: {
  chatId: string; senderUid: string; type: FireMessage['type']; content?: string; mediaUrl?: string;
}): Promise<FireMessage | null> {
  const { data, error } = await supabase.from('messages').insert({
    chat_id: msg.chatId, sender_id: msg.senderUid, type: msg.type,
    content: msg.content || '', media_url: msg.mediaUrl || null,
    reactions: {},
    read_by: [msg.senderUid],
  }).select().single();
  if (error) return null;

  // Update chat preview
  const preview = msg.type === 'text' ? (msg.content || '').slice(0, 80)
    : msg.type === 'image' ? '📷 Photo' : msg.type === 'voice' ? '🎙 Voice' : '✍️ Drawing';
  await supabase.from('chats').update({
    last_message_at: new Date().toISOString(),
    last_message_preview: preview,
  }).eq('id', msg.chatId);

  return mapMessage(data);
}

export function subscribeMessages(chatId: string, onMessages: (msgs: FireMessage[]) => void): () => void {
  const sub = supabase
    .channel(`msgs-${chatId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, () => {
      fetchMessages(chatId).then(onMessages);
    })
    .subscribe();
  fetchMessages(chatId).then(onMessages);
  return () => { sub.unsubscribe(); };
}

async function fetchMessages(chatId: string): Promise<FireMessage[]> {
  const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
  return (data || []).map(mapMessage);
}

export async function toggleReaction(msgId: string, uid: string, emoji: string, currentReactions: Record<string, string>) {
  const reactions = { ...currentReactions };
  if (reactions[uid] === emoji) {
    delete reactions[uid];
  } else {
    reactions[uid] = emoji;
  }
  await supabase.from('messages').update({ reactions }).eq('id', msgId);
}

export async function markMessageRead(msgId: string, uid: string, currentReadBy: string[]) {
  if (currentReadBy.includes(uid)) return;
  await supabase.from('messages').update({ read_by: [...currentReadBy, uid] }).eq('id', msgId);
}

// ── Map helpers (DB snake_case → app camelCase) ──────────
function mapPost(row: any): Post {
  return {
    id: row.id, authorUid: row.author_id, content: row.content || '',
    mediaUrl: row.media_url, mediaType: row.media_type,
    likedUids: row.liked_by || [], pinned: row.pinned || false,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function mapComment(row: any): Comment {
  return { id: row.id, postId: row.post_id, authorUid: row.author_id, content: row.content, createdAt: row.created_at };
}
function mapChat(row: any): FireChat {
  return {
    id: row.id, type: row.type, name: row.name, memberUids: row.member_ids || [],
    createdBy: row.created_by, createdAt: row.created_at,
    lastMessageAt: row.last_message_at, lastMessagePreview: row.last_message_preview,
  };
}
function mapMessage(row: any): FireMessage {
  return {
    id: row.id, chatId: row.chat_id, senderUid: row.sender_id, type: row.type,
    content: row.content, mediaUrl: row.media_url,
    reactions: row.reactions || {}, readBy: row.read_by || [], createdAt: row.created_at,
  };
}
