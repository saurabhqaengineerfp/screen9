---
name: movie-adder
description: Bulk-adds approved movies from movie-queue.json into Screen9's Supabase database automatically—fetching posters, backdrops, cast, director, country, era, genres, clean language tags, official trailers, and multi-region streaming links from TMDB, while skipping duplicates.
---

# Movie Adder Agent (Screen9)

Use this skill whenever the user approves movies found by the **Movie Finder** agent (in `movie-queue.json`) and wants them added to Screen9.

## Communication Rule
Always keep replies **short, clear, bullet-based, and beginner-friendly** (no tech jargon).

## Step-by-Step Workflow

### Step 1: Confirm Which Movies to Add
- Check `movie-queue.json` at the project root.
- If the user approved all of them, add the whole queue.
- If the user only approved specific movies, pass them with `--only "Title 1" "Title 2"`.

### Step 2: Run the Bulk Adder Script
Run:

```bash
node .agents/skills/movie-adder/scripts/add_from_queue.mjs --clear
```

Optional flags:
- `--dry-run`: Preview what will be added without touching the database.
- `--only "Ray" "Zodiac"`: Only add specific titles from `movie-queue.json`.
- `--clear`: Automatically removes added movies from `movie-queue.json` so the queue stays clean.

### Step 3: Report Simple Summary
Show the user a short bullet list of:
- Which movies were **added** (and whether each was added as **Free Embed** or **Trailer + Streaming Links**).
- Any movies **skipped** (e.g., already on Screen9).
- Remind them the movies are live on Screen9 immediately (no deploy needed—data comes straight from Supabase!).
