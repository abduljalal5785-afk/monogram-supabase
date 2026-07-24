-- Monogram — Supabase Migration
-- Run in: Supabase Dashboard → SQL Editor → paste & run

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text not null default '',
  avatar_seed   text default '',
  bio           text default '',
  status        text default 'online' check (status in ('online','away','offline')),
  last_seen     timestamptz default now(),
  fcm_token     text,
  role          text default 'member' check (role in ('owner','member')),
  joined_at     timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_uid    uuid not null references public.profiles(id) on delete cascade,
  content       text default '',
  media_url     text,
  media_type    text,
  liked_uids    uuid[] default '{}',
  pinned        boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz
);
alter table public.posts enable row level security;
create policy "posts_select" on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert with check (auth.uid() = author_uid);
create policy "posts_update" on public.posts for update using (auth.uid() = author_uid);
create policy "posts_delete" on public.posts for delete using (auth.uid() = author_uid);

create table public.comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  author_uid    uuid not null references public.profiles(id) on delete cascade,
  content       text not null,
  created_at    timestamptz default now()
);
alter table public.comments enable row level security;
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = author_uid);
create policy "comments_delete" on public.comments for delete using (auth.uid() = author_uid);

create table public.chats (
  id                    uuid primary key default gen_random_uuid(),
  type                  text not null check (type in ('direct','group')),
  name                  text,
  member_uids           uuid[] not null,
  created_by            uuid not null references public.profiles(id) on delete cascade,
  created_at            timestamptz default now(),
  last_message_at       timestamptz,
  last_message_preview  text default ''
);
alter table public.chats enable row level security;
create policy "chats_select" on public.chats for select using (auth.uid() = any(member_uids));
create policy "chats_insert" on public.chats for insert with check (auth.uid() = any(member_uids));
create policy "chats_update" on public.chats for update using (auth.uid() = any(member_uids));

create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  chat_id       uuid not null references public.chats(id) on delete cascade,
  sender_uid    uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('text','image','voice','drawing')),
  content       text default '',
  media_url     text,
  reactions     jsonb default '{}',
  read_by       uuid[] default '{}',
  created_at    timestamptz default now()
);
alter table public.messages enable row level security;
create policy "messages_select" on public.messages for select
  using (exists (select 1 from public.chats where id = messages.chat_id and auth.uid() = any(member_uids)));
create policy "messages_insert" on public.messages for insert with check (auth.uid() = sender_uid);
create policy "messages_update" on public.messages for update
  using (exists (select 1 from public.chats where id = messages.chat_id and auth.uid() = any(member_uids)));

insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
create policy "media_select" on storage.objects for select using (bucket_id = 'media');
create policy "media_insert" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');

alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table chats;
alter publication supabase_realtime add table messages;

create index idx_posts_created_at on public.posts(created_at desc);
create index idx_comments_post_id on public.comments(post_id);
create index idx_messages_chat_id on public.messages(chat_id);
create index idx_chats_member_uids on public.chats using gin(member_uids);
