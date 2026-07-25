import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePosts } from './hooks/usePosts';
import { useRealtimeChat } from './hooks/useRealtimeChat';
import { usePresence } from './hooks/usePresence';
import { usePush } from './hooks/usePush';
import AuthScreen from './components/AuthScreen';
import BottomNav from './components/BottomNav';
import Feed from './components/Feed';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import DrawScreen from './components/DrawScreen';
import Profile from './components/Profile';
import { InstallPrompt } from './pwa/InstallPrompt';
import { useOnlineStatus } from './pwa/useOnlineStatus';

export default function App() {
  const { user, appUser, loading, error, signIn, signOut } = useAuth();
  const allUsers = usePresence(appUser);
  const { posts, comments, create: createPost, update: updatePost, remove: deletePost, toggleLike, togglePin, addComment } = usePosts(appUser);
  const { chats, activeChatId, setActiveChatId, activeMessages, send: sendMsg, toggleReaction, startDM, createGroup } = useRealtimeChat(appUser);
  const { supported: pushSupported, enabled: pushEnabled, requestPermission, registerPush } = usePush(appUser);
  const isOnline = useOnlineStatus();

  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('monogram:dark');
    return saved !== null ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [tab, setTab] = useState('feed');
  const [splash, setSplash] = useState(true);
  const [showPushNudge, setShowPushNudge] = useState(false);

  useEffect(() => { const t = setTimeout(() => setSplash(false), 1000); return () => clearTimeout(t); }, []);
  useEffect(() => { 
    localStorage.setItem('monogram:dark', String(dark)); 
    if (dark) document.documentElement.classList.add('dark'); 
    else document.documentElement.classList.remove('dark'); 
  }, [dark]);

  // Register for push on sign-in
  useEffect(() => { if (appUser && pushSupported) registerPush(); }, [appUser, pushSupported]);

  // Show push nudge after 8s (only if supported + not enabled)
  useEffect(() => {
    if (!pushSupported || pushEnabled) return;
    const t = setTimeout(() => setShowPushNudge(true), 8000);
    return () => clearTimeout(t);
  }, [pushSupported, pushEnabled]);

  const handleEnablePush = async () => {
    const perm = await requestPermission();
    if (perm === 'granted') await registerPush();
    setShowPushNudge(false);
  };

  const activeChat = activeChatId ? chats.find((c) => c.id === activeChatId) : undefined;

  // Splash
  if (splash) {
    return (
      <div className={`h-full w-full flex flex-col items-center justify-center ${dark ? 'bg-black' : 'bg-white'} animate-[fadeUp_300ms_ease-out]`}>
        <div className={`w-24 h-24 rounded-[28px] flex items-center justify-center animate-pulse-soft ${dark ? 'bg-white' : 'bg-black'}`}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={dark ? 'black' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M12 4h9" />
            <path d="M12 12h9" />
            <path d="M4 20H3" />
            <path d="M4 4H3" />
            <path d="M4 12H3" />
          </svg>
        </div>
        <p className={`mt-6 text-sm font-medium ${dark ? 'text-white/60' : 'text-black/60'}`}>Monogram</p>
      </div>
    );
  }

  // Auth guard
  if (!appUser) {
    return <AuthScreen dark={dark} />;
  }

  // Chat room
  if (activeChat) {
    return (
      <div className={`h-full flex flex-col ${dark ? 'dark bg-black text-white' : 'bg-white text-black'}`}>
        <ChatRoom
          currentUser={appUser} allUsers={allUsers} chat={activeChat} messages={activeMessages}
          dark={dark} onBack={() => setActiveChatId(null)}
          onSend={sendMsg} onToggleReaction={toggleReaction}
          onNavigateDraw={() => setTab('draw')}
        />
        <InstallPrompt dark={dark} />
      </div>
    );
  }

  // Draw mode
  if (tab === 'draw') {
    return (
      <div className={`h-full flex flex-col ${dark ? 'dark bg-black text-white' : 'bg-white text-black'}`}>
        <DrawScreen
          currentUser={appUser} allUsers={allUsers} chats={chats} dark={dark}
          onBack={() => setTab('feed')} onCreatePost={createPost}
          onSendToChat={async (chatId, mediaUrl, title) => {
            await sendMsg({ chatId, type: 'drawing', content: title, mediaUrl });
          }}
        />
      </div>
    );
  }

  // Main shell
  const screenArea = (
    <>
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-500 text-black text-center text-xs py-1.5 font-semibold">
          You're offline. Messages will send when reconnected.
        </div>
      )}
      {tab === 'feed' && (
        <Feed
          currentUser={appUser} allUsers={allUsers} posts={posts} comments={comments}
          dark={dark} onNavigate={setTab} onCreatePost={createPost} onUpdatePost={updatePost}
          onDeletePost={deletePost} onToggleLike={toggleLike}
          onTogglePin={togglePin} onAddComment={addComment}
        />
      )}
      {tab === 'chat' && (
        <ChatList
          currentUser={appUser} allUsers={allUsers} chats={chats} allMessages={activeMessages}
          dark={dark} onOpenChat={setActiveChatId} onStartDM={startDM} onCreateGroup={createGroup}
        />
      )}
      {tab === 'profile' && (
        <Profile
          currentUser={appUser} myPosts={posts.filter((p) => p.authorUid === appUser.id)}
          dark={dark} setDark={setDark} onSignOut={signOut}
        />
      )}
    </>
  );

  return (
    <div className={`h-full flex flex-col ${dark ? 'dark bg-black text-white' : 'bg-white text-black'}`}>
      <div className="flex-1 overflow-hidden relative">{screenArea}</div>
      <BottomNav tab={tab} onChange={setTab} dark={dark} />
      <InstallPrompt dark={dark} />
      {showPushNudge && (
        <div className={`absolute bottom-20 left-4 right-4 z-30 rounded-3xl p-4 flex items-center gap-3 shadow-2xl animate-[slideUp_400ms_ease-out] ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
          <span className="text-lg">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Get notified</p>
            <p className="text-[11px] opacity-70">New messages &amp; posts</p>
          </div>
          <button onClick={handleEnablePush} className={`px-4 py-2 rounded-full text-xs font-semibold ${dark ? 'bg-black text-white' : 'bg-white text-black'}`}>Enable</button>
          <button onClick={() => setShowPushNudge(false)} className="p-1 opacity-40 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
}
