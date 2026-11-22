-- Step 1 Migration: Global Curated Cinema Model
-- Allows OTT-only films (nullable video_url), official embed tracking, curator notes, and TMDB Watch Providers.

alter table public.movies
  alter column video_url drop not null;

alter table public.movies
  drop constraint if exists movies_video_source_type_check;

alter table public.movies
  add constraint movies_video_source_type_check
  check (video_source_type is null or video_source_type in ('youtube', 'vimeo', 'native', 'ott'));

alter table public.movies
  add column if not exists watch_mode text
  check (watch_mode in ('embed', 'ott', 'native'))
  default 'embed';

alter table public.movies
  add column if not exists curator_note text;

alter table public.movies
  add column if not exists source_channel text;

alter table public.movies
  add column if not exists watch_providers jsonb;

-- Backfill existing rows cleanly
update public.movies
set watch_mode = case
  when video_source_type = 'native' then 'native'
  when video_url is not null and length(trim(video_url)) > 0 then 'embed'
  else 'ott'
end
where watch_mode is null;
