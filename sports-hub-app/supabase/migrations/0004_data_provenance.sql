-- Where did this number come from, and when was it last touched? The app shows both next to real data.
alter table public.league_entries add column source text, add column updated_at timestamptz not null default now();
alter table public.matches        add column source text, add column updated_at timestamptz not null default now();

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as
  $$ begin new.updated_at = now(); return new; end $$;

create trigger league_entries_touch before update on public.league_entries
  for each row execute function public.touch_updated_at();
create trigger matches_touch before update on public.matches
  for each row execute function public.touch_updated_at();
