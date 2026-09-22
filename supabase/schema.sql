-- TTM Finder production foundation for Supabase/PostgreSQL.
-- Run this in Supabase SQL Editor, then create the first moderator manually.

create extension if not exists pgcrypto;

create type public.user_role as enum ('collector', 'moderator', 'admin');
create type public.record_status as enum ('draft', 'pending', 'published', 'needs_review', 'removed');
create type public.confidence_level as enum ('low', 'medium', 'high');
create type public.report_outcome as enum ('returned', 'no_response', 'returned_to_sender', 'pending');
create type public.moderation_decision as enum ('approve', 'reject', 'request_changes', 'remove');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  role public.user_role not null default 'collector',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.signers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 160),
  category text not null check (char_length(category) between 2 and 80),
  subcategory text not null check (char_length(subcategory) between 2 and 80),
  note text not null default '',
  public_contact_type text check (public_contact_type in ('official', 'agency', 'team', 'venue', 'publisher', 'institution')),
  public_contact_label text,
  public_contact_url text,
  public_contact_verified_at date,
  source_notes text,
  record_status public.record_status not null default 'draft',
  confidence public.confidence_level not null default 'low',
  response_status text not null default 'unverified' check (response_status in ('often', 'moderate', 'slow', 'unverified')),
  signed_status text not null default 'unknown' check (signed_status in ('yes', 'no', 'unknown')),
  wait_unit text not null default 'days' check (wait_unit in ('days', 'weeks', 'months')),
  typical_wait_min integer check (typical_wait_min is null or typical_wait_min >= 0),
  typical_wait_max integer check (typical_wait_max is null or typical_wait_max >= typical_wait_min),
  signal_score integer not null default 0 check (signal_score between 0 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.signer_reports (
  id uuid primary key default gen_random_uuid(),
  signer_id uuid not null references public.signers(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  sent_at date,
  outcome public.report_outcome not null default 'pending',
  item_type text not null check (item_type in ('trading-card', 'photo', 'book', 'other')),
  collector_note text check (collector_note is null or char_length(collector_note) <= 2000),
  evidence_reference text,
  moderation_status public.record_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  signer_id uuid references public.signers(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('trading-card', 'photo', 'book', 'other')),
  note text check (note is null or char_length(note) <= 2000),
  status text not null default 'planning' check (status in ('planning', 'ready', 'sent', 'returned', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_table text not null check (target_table in ('signers', 'signer_reports', 'missions')),
  target_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  decision public.moderation_decision not null,
  reason text not null check (char_length(reason) between 10 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger signers_touch_updated_at before update on public.signers
for each row execute function public.touch_updated_at();
create trigger missions_touch_updated_at before update on public.missions
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New collector'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.signers enable row level security;
alter table public.signer_reports enable row level security;
alter table public.missions enable row level security;
alter table public.moderation_actions enable row level security;

create policy "Published signers are public"
  on public.signers for select
  using (record_status = 'published' or public.is_staff());
create policy "Staff can manage signers"
  on public.signers for all
  using (public.is_staff()) with check (public.is_staff());

create policy "Users can read their profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_staff());
create policy "Users can update their profile"
  on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Staff can manage profiles"
  on public.profiles for all
  using (public.is_staff()) with check (public.is_staff());

create policy "Users can submit reports"
  on public.signer_reports for insert
  to authenticated
  with check (submitted_by = auth.uid());
create policy "Users can read their reports"
  on public.signer_reports for select
  using (submitted_by = auth.uid() or public.is_staff());
create policy "Staff can moderate reports"
  on public.signer_reports for update
  using (public.is_staff()) with check (public.is_staff());

create policy "Users manage their missions"
  on public.missions for all
  to authenticated
  using (owner_id = auth.uid() or public.is_staff())
  with check (owner_id = auth.uid() or public.is_staff());

create policy "Staff can read moderation actions"
  on public.moderation_actions for select
  using (public.is_staff());
create policy "Staff can create moderation actions"
  on public.moderation_actions for insert
  with check (actor_id = auth.uid() and public.is_staff());

create or replace view public.published_signers
with (security_invoker = true)
as
select
  s.*,
  count(r.id) filter (where r.moderation_status = 'published')::integer as report_count
from public.signers s
left join public.signer_reports r on r.signer_id = s.id
where s.record_status = 'published'
group by s.id;
