create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_name text not null,
  dorm_name text not null,
  invite_code text unique not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  unique(room_id, user_id)
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('quiet_hours', 'guests', 'chores', 'temperature', 'rules', 'other')),
  title text not null,
  description text not null,
  full_details text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'active')),
  approval_rule text not null default 'all_members',
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  content text not null,
  message_type text not null default 'user' check (message_type in ('user', 'system', 'proposal_ref')),
  proposal_id uuid references public.proposals(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.proposal_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('approve', 'reject', 'suggest_edit')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(proposal_id, voter_id)
);

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid unique not null references public.proposals(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  category text not null,
  title text not null,
  details text not null,
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  active_since timestamptz not null default now(),
  is_active boolean not null default true,
  approval_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  type text not null check (type in ('new_message', 'proposal_pending', 'agreement_activated')),
  content text not null,
  ref_type text,
  ref_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_room_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique(user_id, room_id)
);

create index if not exists idx_messages_room_created_at on public.messages(room_id, created_at desc);
create index if not exists idx_proposals_room_status_created_at on public.proposals(room_id, status, created_at desc);
create index if not exists idx_agreements_room_active_since on public.agreements(room_id, is_active, active_since desc);
create index if not exists idx_notifications_user_read_created_at on public.notifications(user_id, is_read, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists proposal_votes_touch_updated_at on public.proposal_votes;
create trigger proposal_votes_touch_updated_at
before update on public.proposal_votes
for each row execute function public.touch_updated_at();
