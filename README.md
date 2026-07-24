# Monogram

A Supabase-powered Progressive Web App for 10 approved users.
Real-time chat, posts, drawing — works offline, installs on your phone.

---

## ⚡ Quick start

```bash
unzip monogram.zip -d monogram && cd monogram
cp .env.example .env.local
# → Paste your Supabase URL + anon key (from Settings → API)
npm install
npm run dev                # http://localhost:3000
```

Then deploy:

```bash
./deploy.sh vercel        # Deploy to Vercel (no push)
./deploy.sh vercel yes    # Deploy to Vercel + Edge Functions (push)
```

---

## 🔧 Supabase setup (required)

### 1. Create a project
[supabase.com/dashboard](https://supabase.com/dashboard) → **New project** → pick a region → create.

### 2. Set up Google OAuth
**Authentication** → **Providers** → **Google** → Enable.

Copy your Google Client ID & Secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → paste into Supabase.

Add your deployed URL to the **Authorized redirect URIs**: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

### 3. Run the migration
**SQL Editor** → paste the contents of `supabase/migration.sql` → **Run**.

This creates all tables, storage bucket, RLS policies, and realtime subscriptions.

### 4. Get your API keys
**Settings** → **API** → copy:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Paste into `.env.local`.

### 5. Update approved emails
Replace the 10 placeholder Gmail addresses in `src/supabase/auth.ts`:

```ts
export const APPROVED_EMAILS: string[] = [
  'you@gmail.com',
  'friend1@gmail.com', 'friend2@gmail.com', ...
];
```

### 6. Deploy

```bash
./deploy.sh vercel        # Vercel hosting
./deploy.sh vercel yes    # Vercel + push notifications
./deploy.sh netlify       # Netlify hosting
```

---

## 🔔 Push notifications (optional)

Push uses **Supabase Edge Functions** + **Web Push API**.

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. Set secrets:
   ```bash
   npx supabase secrets set VITE_VAPID_PUBLIC_KEY=BP...
   npx supabase secrets set VAPID_PRIVATE_KEY=...
   ```

3. Add to `.env.local`:
   ```
   VITE_VAPID_PUBLIC_KEY=BP...
   ```

4. Deploy the Edge Function:
   ```bash
   ./deploy.sh vercel yes
   ```

5. In Supabase Dashboard → **Database** → **Database Webhooks**, create:
   - Table: `messages` → Event: `INSERT` → call Edge Function URL
   - Table: `posts` → Event: `INSERT` → call Edge Function URL

Push works in Chrome, Edge, Firefox, Opera. Not in Safari/iOS.

---

## 📱 Features

| Feature | Details |
|---------|---------|
| **Auth** | Google Sign-In, 10-account hard gate |
| **Feed** | Create/edit/delete posts, likes, comments, pin |
| **Chat** | DM + groups, text/images/voice/drawings, emoji reactions, read receipts |
| **Drawing** | Pen, highlighter, eraser; undo/clear; share to feed or chat |
| **Presence** | Online/away/offline with real-time updates |
| **PWA** | Install prompt, offline caching via service worker, splash screen |
| **Push** | Web-push via Supabase Edge Function (optional) |
| **Dark mode** | System-aware, persisted |

## 🧱 Architecture

```
monogram/
├── src/
│   ├── supabase/          # Client, auth, DB queries, storage
│   ├── hooks/             # useAuth, usePosts, useRealtimeChat, usePresence, usePush
│   ├── components/        # AuthScreen, Feed, ChatList, ChatRoom, DrawScreen, Profile, ...
│   ├── pwa/               # Service worker, install prompt, online status
│   └── utils/             # timeAgo helpers
├── supabase/
│   ├── migration.sql      # Full DB schema + RLS policies
│   └── functions/push/    # Edge Function for push notifications
├── public/                # Icons, manifest.json, sw.js, splash screens
├── deploy.sh              # One-command deploy
└── package.json
```

## 🔐 Security

Three layers:
1. **App** — `APPROVED_EMAILS` gate on sign-in
2. **RLS** — Row Level Security policies on every table (PostgreSQL)
3. **Storage** — Authenticated-only uploads to media bucket
