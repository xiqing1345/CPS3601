alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_votes enable row level security;
alter table public.agreements enable row level security;
alter table public.notifications enable row level security;
alter table public.user_room_state enable row level security;

create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = target_room_id
      and rm.user_id = auth.uid()
  );
$$;

create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid());

create policy "rooms_select_member" on public.rooms
for select using (public.is_room_member(id));

create policy "rooms_insert_authenticated" on public.rooms
for insert with check (auth.uid() = created_by);

create policy "room_members_select_member" on public.room_members
for select using (public.is_room_member(room_id));

create policy "room_members_insert_self_or_admin" on public.room_members
for insert with check (
  auth.uid() = user_id
  and (
    exists (
      select 1 from public.rooms r where r.id = room_id and r.created_by = auth.uid()
    )
    or exists (
      select 1 from public.room_members m
      where m.room_id = room_id and m.user_id = auth.uid() and m.role = 'admin'
    )
  )
);

create policy "messages_select_member" on public.messages
for select using (public.is_room_member(room_id));

create policy "messages_insert_member" on public.messages
for insert with check (public.is_room_member(room_id) and (sender_id = auth.uid() or sender_id is null));

create policy "proposals_select_member" on public.proposals
for select using (public.is_room_member(room_id));

create policy "proposals_insert_member" on public.proposals
for insert with check (public.is_room_member(room_id) and proposer_id = auth.uid());

create policy "proposals_update_member" on public.proposals
for update using (public.is_room_member(room_id));

create policy "proposal_votes_select_member" on public.proposal_votes
for select using (
  exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.is_room_member(p.room_id)
  )
);

create policy "proposal_votes_insert_member" on public.proposal_votes
for insert with check (
  voter_id = auth.uid()
  and exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.is_room_member(p.room_id)
  )
);

create policy "proposal_votes_update_own" on public.proposal_votes
for update using (voter_id = auth.uid());

create policy "agreements_select_member" on public.agreements
for select using (public.is_room_member(room_id));

create policy "agreements_insert_member" on public.agreements
for insert with check (public.is_room_member(room_id));

create policy "notifications_select_own" on public.notifications
for select using (user_id = auth.uid());

create policy "notifications_insert_own_or_system" on public.notifications
for insert with check (
  user_id = auth.uid()
  or auth.role() = 'service_role'
  or (room_id is not null and public.is_room_member(room_id))
);

create policy "notifications_update_own" on public.notifications
for update using (user_id = auth.uid());

create policy "user_room_state_select_own" on public.user_room_state
for select using (user_id = auth.uid() and public.is_room_member(room_id));

create policy "user_room_state_upsert_own" on public.user_room_state
for insert with check (user_id = auth.uid() and public.is_room_member(room_id));

create policy "user_room_state_update_own" on public.user_room_state
for update using (user_id = auth.uid() and public.is_room_member(room_id));
