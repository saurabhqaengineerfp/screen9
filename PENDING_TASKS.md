# Screen9 — Pending Tasks & Agent Roadmap

A simple list of digital assistants (agents) planned for Screen9.

## Built
- [x] **Agent 1: Movie Finder** (`.agents/skills/movie-finder/SKILL.md`)
  - Takes a movie name (or list of names, including actor/director hints), checks if it is already on Screen9, searches across the web for Public Domain status (without false negatives) and legal free copies on reputable platforms, and saves results to `movie-queue.json`.

- [x] **Agent 2: Bulk Movie Adder** (`.agents/skills/movie-adder/SKILL.md`)
  - Reads approved movies from `movie-queue.json` and automatically adds them to Screen9 with posters, cast, director, country, decade, genres, languages, official trailers, and Watchmode direct streaming links—skipping duplicates.

- [x] **Agent 4: Broken Link Checker** (`.agents/skills/link-checker/SKILL.md`)
  - Scans every movie on Screen9 to catch deleted YouTube/Vimeo embeds and dead `404` streaming links, and can automatically remove broken links so users never hit dead pages.

## Pending Agents
- [ ] **Agent 3: Curator Note Writer**
  - Writes a short, punchy 1–2 line *"Why watch this"* note for each movie in your voice for you to approve.

- [ ] **Agent 5: Where-to-Watch Updater**
  - Runs automatically once a month to refresh which streaming apps (Netflix, Prime, MUBI, Hotstar, etc.) currently have each movie.
