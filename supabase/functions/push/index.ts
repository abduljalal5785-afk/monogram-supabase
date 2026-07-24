// ── Supabase Edge Function: Push Notifications ────────────
// Deploy: npx supabase functions deploy push
// Trigger this from Database Webhooks or call it from client after sending
//
// Setup:
//   1. Generate VAPID keys: npx web-push generate-vapid-keys
//   2. Set secrets: npx supabase secrets set VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@...
//   3. Set VITE_VAPID_PUBLIC_KEY in your frontend .env.local

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as webpush from 'https://esm.sh/web-push@3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@monogram.app';

webpush.setVapidDetails(VAPID_SUBJECT, Deno.env.get('VITE_VAPID_PUBLIC_KEY')!, VAPID_PRIVATE);

interface PushPayload {
  chat_id?: string;
  post_id?: string;
  type: 'new_message' | 'new_post';
  title: string;
  body: string;
  // Comma-separated list of UIDs to send to (or omit to send to all approved)
  to_uids?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  // Get target users
  const { data: users } = await supabase
    .from('profiles')
    .select('id, fcm_token')
    .not('fcm_token', 'is', null);

  const targets = (users || []).filter((u) => {
    if (!u.fcm_token) return false;
    if (payload.to_uids) {
      const uids = payload.to_uids.split(',').map((s) => s.trim());
      return uids.includes(u.id);
    }
    return true; // send to all
  });

  const results: { uid: string; ok: boolean; error?: string }[] = [];

  for (const user of targets) {
    try {
      const sub = JSON.parse(user.fcm_token!);
      await webpush.sendNotification(sub, JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: {
          type: payload.type,
          chat_id: payload.chat_id,
          post_id: payload.post_id,
          url: '/',
        },
      }));

      results.push({ uid: user.id, ok: true });
    } catch (err: any) {
      results.push({ uid: user.id, ok: false, error: err.message || 'unknown' });

      // Expired subscription — remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('profiles').update({ fcm_token: null }).eq('id', user.id);
      }
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log(`[push] Sent to ${succeeded}/${targets.length} users (${failed} failed)`);

  return new Response(JSON.stringify({ sent: succeeded, failed, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
