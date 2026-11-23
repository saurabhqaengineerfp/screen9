---
name: link-checker
description: Scans all movies in Screen9's Supabase database to find broken free-embed videos (deleted YouTube/Vimeo/Archive.org links) and dead 404 streaming provider links (Paramount+, Prime, etc.). Can preview issues or automatically remove dead 404 provider links so users never hit broken pages.
---

# Broken Link Checker Agent (Screen9)

Use this skill whenever the user asks to check, clean, or fix broken movie/streaming links on Screen9.

## Communication Rule
Always keep replies **short, clear, bullet-based, and beginner-friendly** (no tech jargon).

## Step-by-Step Workflow

### Step 1: Run a Scan (Safe Preview First)
```bash
node .agents/skills/link-checker/scripts/check_links.mjs
```

This checks:
- **Free Embedded Movies (`video_url`):** Uses YouTube/Vimeo oEmbed APIs and HTTP status checks to confirm the video is still live and embeddable.
- **Streaming Provider Links (`watch_providers`):** Checks direct `web_url` links and flags definite dead links (`404`, `410`, or unreachable domains), while ignoring harmless bot-blocks (`403`/`405`) so working links are never wrongly removed.

### Step 2: Auto-Remove Broken Streaming Links & Replenish Deleted Free Movies (When Approved or Requested)
```bash
node .agents/skills/link-checker/scripts/check_links.mjs --fix
```
- Removes any dead `404`/`410` streaming provider entries from `watch_providers` in Supabase so users never click a broken link.
- **Auto-Replenish Deleted Free Movies:** If any free-embed full movie (`video_url` on YouTube, Vimeo, Dailymotion, or Archive.org) is broken/deleted, run `node .agents/skills/movie-finder/scripts/find_youtube_movie.mjs "<Movie Title> <Year>"` (which searches YouTube directly with its native CC filter and verifies real manual English CC tracks + embeddability + views/age) to find the best replacement link and update `video_url` in Supabase (or switch the movie to `ott` mode if no working copy exists).

### Step 3: Present a Short Summary
- List total movies scanned, total broken links found, and what was cleaned up.
