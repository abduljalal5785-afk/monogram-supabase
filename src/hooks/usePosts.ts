import { useState, useEffect } from 'react';
import {
  createPost, updatePost, deletePost, toggleLike, togglePin, addComment,
  subscribePosts, subscribeComments,
} from '../supabase/db';
import type { Post, Comment, AppUser } from '../types';

export function usePosts(currentUser: AppUser | null) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const unsubPosts = subscribePosts(setPosts);
    const unsubComments = subscribeComments(setComments);
    return () => { unsubPosts(); unsubComments(); };
  }, []);

  const create = async (content: string, mediaUrl?: string, mediaType?: string) => {
    if (!currentUser) return null;
    return createPost(currentUser.id, content, mediaUrl, mediaType);
  };

  const update = async (postId: string, content: string) => {
    await updatePost(postId, content);
  };

  const remove = async (postId: string) => {
    await deletePost(postId);
  };

  const like = async (postId: string, currentLikes: string[]) => {
    if (!currentUser) return;
    await toggleLike(postId, currentUser.id, currentLikes);
  };

  const pin = async (postId: string, pinned: boolean) => {
    await togglePin(postId, pinned);
  };

  const comment = async (postId: string, content: string) => {
    if (!currentUser) return null;
    return addComment(postId, currentUser.id, content);
  };

  return { posts, comments, create, update, remove, toggleLike: like, togglePin: pin, addComment: comment };
}
