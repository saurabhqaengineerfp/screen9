-- Create Profiles table (tied to Supabase Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Movies table
create table public.movies (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  poster_url text,
  backdrop_url text,
  release_year integer,
  genres text[],
  category text, -- e.g., 'Indian Masterpieces', 'Sci-Fi Essentials'
  video_source_type text check (video_source_type in ('youtube', 'vimeo', 'native')) not null,
  video_url text not null, -- The youtube link or the Cloudflare R2 native link
  tmdb_id integer, -- To fetch additional data later if needed
  duration integer, -- in seconds
  cast_members text[], -- array of top cast members
  director text, -- director name
  start_time integer,
  end_time integer,
  trailer_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Watchlist table
create table public.watchlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  movie_id uuid references public.movies(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, movie_id)
);

-- Create Watch History (Continue Watching) table
create table public.watch_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  movie_id uuid references public.movies(id) on delete cascade not null,
  progress_seconds integer default 0,
  is_completed boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, movie_id)
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.watchlists enable row level security;
alter table public.watch_history enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

create policy "Movies are viewable by everyone." on public.movies for select using (true);
-- Note: Insert/Update/Delete on movies will be done by you via the Supabase Dashboard (which bypasses RLS).

create policy "Users can view own watchlist." on public.watchlists for select using (auth.uid() = user_id);
create policy "Users can insert into own watchlist." on public.watchlists for insert with check (auth.uid() = user_id);
create policy "Users can delete from own watchlist." on public.watchlists for delete using (auth.uid() = user_id);

create policy "Users can view own watch history." on public.watch_history for select using (auth.uid() = user_id);
create policy "Users can insert own watch history." on public.watch_history for insert with check (auth.uid() = user_id);
create policy "Users can update own watch history." on public.watch_history for update using (auth.uid() = user_id);

-- Create a trigger to automatically create a profile when a new user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create Categories table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories RLS
alter table public.categories enable row level security;
create policy "Categories are viewable by everyone." on public.categories for select using (true);
-- Note: Insert/Update/Delete will be handled via Service Role in server actions
