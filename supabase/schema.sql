-- Space Bugs shared high-score table.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- The game ships the project's public anon key, so these rules are the security boundary:
-- anyone may read scores and add a well-formed one; nobody may edit or delete through the API.
-- A browser game can't prove a score is genuine, so the checks below only keep out garbage
-- and floods, not a determined cheater.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  initials text not null check (initials ~ '^[A-Z]{3}$'),
  score integer not null check (score > 0 and score <= 10000000),
  wave integer not null check (wave between 1 and 1000),
  created_at timestamptz not null default now(),
  -- Roughly the most a wave can pay out, with plenty of headroom.
  constraint scores_plausible check (score <= wave * 6000)
);

create index if not exists scores_score_idx on public.scores (score desc);

-- Expose only what the game needs to the public API roles. Explicit grants make this work
-- whether or not the project auto-exposes new tables, and the revoke strips anything broader.
revoke all on public.scores from anon, authenticated;
grant select, insert on public.scores to anon, authenticated;

alter table public.scores enable row level security;

drop policy if exists "read scores" on public.scores;
create policy "read scores" on public.scores for select to anon, authenticated using (true);

drop policy if exists "add scores" on public.scores;
create policy "add scores" on public.scores for insert to anon, authenticated with check (true);

-- No update/delete policies: with RLS on, those are denied.

-- Stamp the time server-side and throttle bursts across all players.
create or replace function public.scores_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  if (select count(*) from public.scores where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many score submissions, try again shortly';
  end if;
  return new;
end $$;

drop trigger if exists scores_before_insert on public.scores;
create trigger scores_before_insert before insert on public.scores
  for each row execute function public.scores_before_insert();
