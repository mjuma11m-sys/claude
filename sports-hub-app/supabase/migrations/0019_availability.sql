-- Player availability: injury type (note) and expected return date, plus yellow/red card counts.
-- Same locks as player_status already has: own-club administrators and medical staff only (RLS); nothing here is readable by fans, players or the federation.
alter table public.player_status add column return_on date;
alter table public.player_status add column yellow_cards smallint not null default 0 check (yellow_cards between 0 and 30);
alter table public.player_status add column red_cards smallint not null default 0 check (red_cards between 0 and 10);
alter table public.player_status add constraint player_status_note_len check (note is null or char_length(note) <= 60) not valid;
grant update (status, note, return_on, yellow_cards, red_cards) on public.player_status to authenticated;
