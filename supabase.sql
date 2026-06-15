-- Name·Off — Supabase backend
-- Run this once: Supabase dashboard → SQL Editor → New query → paste → Run.
-- It creates the key/value table the app reads and writes, and opens it to the
-- public "anon" key (the same key you paste into the app on both phones).

create table if not exists public.nameoff_kv (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nameoff_kv enable row level security;

-- Let the anon (public) key read + write this one table.
grant select, insert, update on public.nameoff_kv to anon;

create policy "nameoff_read"   on public.nameoff_kv for select to anon using (true);
create policy "nameoff_insert" on public.nameoff_kv for insert to anon with check (true);
create policy "nameoff_update" on public.nameoff_kv for update to anon using (true) with check (true);

-- Note: anyone who has BOTH your project URL and anon key can read/write this
-- table. That's fine for a private two-person name list (same trust model as
-- before) — just don't post the key publicly. To rotate access later, you can
-- generate new API keys in Settings → API.
