#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "  ⬛ Monogram · Supabase"
echo "  ─────────────────────────────────────────"
echo ""

# ── Check env vars ────────────────────────────
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "  ⚠  Created .env.local from .env.example"
  echo "  → Open it and paste your Supabase URL + anon key"
  echo "  → From: https://supabase.com/dashboard → Settings → API"
  exit 1
fi

# ── Parse args ─────────────────────────────────
PLATFORM="${1:-vercel}"
PUSH="${2:-no}"

echo "  Platform: $PLATFORM"
echo "  Push:     $PUSH  (yes = Edge Functions, no = skip)"
echo ""

# ── Install & build ────────────────────────────
echo "  → Installing dependencies…"
npm install --silent 2>/dev/null || npm install

echo "  → Building Vite app…"
npm run build

# ── Deploy hosting ─────────────────────────────
case "$PLATFORM" in
  vercel)
    echo "  ▲ Deploying to Vercel…"
    if ! command -v vercel &> /dev/null; then npm i -g vercel; fi
    vercel --prod --env-file .env.local
    ;;
  netlify)
    echo "  🟦 Deploying to Netlify…"
    if ! command -v netlify &> /dev/null; then npm i -g netlify-cli; fi
    netlify deploy --prod --dir=dist
    ;;
  *)
    echo "  Usage: ./deploy.sh [vercel|netlify] [yes|no]"
    echo "  Example: ./deploy.sh vercel yes  → Vercel with push notifications"
    echo "  Example: ./deploy.sh vercel      → Vercel without push"
    exit 1
    ;;
esac

# ── Push notifications (Supabase Edge Functions) ──
if [ "$PUSH" = "yes" ]; then
  echo ""
  echo "  🔔 Deploying Edge Function for push notifications…"
  if ! command -v supabase &> /dev/null; then npm i -g supabase; fi
  supabase link --project-ref "$(grep VITE_SUPABASE_URL .env.local | cut -d/ -f3 | cut -d. -f1)"
  supabase functions deploy push
  echo "  ✓ Push notifications enabled!"
else
  echo ""
  echo "  ℹ  Skipping push notifications (Edge Functions)."
  echo "     To add later: ./deploy.sh $PLATFORM yes"
fi

echo ""
echo "  ✅ Done!"
echo ""
echo "  📋 Next steps:"
echo "     1. Run the SQL migration in Supabase Dashboard → SQL Editor"
echo "        File: supabase/migration.sql"
echo "     2. Set up Google OAuth in Supabase Dashboard → Authentication → Providers → Google"
echo "     3. Update approved emails in src/supabase/auth.ts"
echo "     4. Create the 'media' storage bucket if not auto-created"
echo ""
