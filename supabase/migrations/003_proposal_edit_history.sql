create table if not exists public.proposal_edit_history (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  editor_id uuid not null references public.profiles(id) on delete cascade,
  previous_category text not null,
  previous_title text not null,
  previous_description text not null,
  previous_full_details text not null,
  edited_at timestamptz not null default now()
);

create index if not exists idx_proposal_edit_history_proposal_time
  on public.proposal_edit_history(proposal_id, edited_at desc);

alter table public.proposal_edit_history enable row level security;

create policy "proposal_edit_history_select_member" on public.proposal_edit_history
for select using (
  exists (
    select 1
    from public.proposals p
    where p.id = proposal_id
      and public.is_room_member(p.room_id)
  )
);

create policy "proposal_edit_history_insert_member" on public.proposal_edit_history
for insert with check (
  editor_id = auth.uid()
  and exists (
    select 1
    from public.proposals p
    where p.id = proposal_id
      and p.proposer_id = auth.uid()
      and public.is_room_member(p.room_id)
  )
);
