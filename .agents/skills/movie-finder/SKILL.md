---
name: movie-finder
description: Researches a movie (or list of movies) for Screen9: checks if already in catalog, finds official TMDB page, official trailer, streaming platforms, searches the whole web for legal free embeddable copies across reputable sites (YouTube, Vimeo, Archive.org, Dailymotion, Wikimedia Commons, national film archives), and checks Public Domain status across the entire web without false negatives. Outputs an easy-to-read table and saves results to movie-queue.json for the Movie Adder agent.
---

# Movie Finder Agent (Screen9)

Use this skill whenever the user gives one or more movie names and asks to find/check them for Screen9.

## Communication Rule
Always keep replies **short, clear, bullet-based, and beginner-friendly** (no tech jargon).

## Step-by-Step Workflow

### Step 1: Run the Quick Lookup Script
Run the helper script with the movie titles (quoted):

```bash
node .agents/skills/movie-finder/scripts/lookup_movies.mjs "Movie 1" "Movie 2"
```

This checks Supabase (duplicate check), TMDB (official info, trailer, streaming apps), and Archive.org.

### Step 2: Search the Whole Web (Not Just One Site!)
For every movie not already on Screen9, run web searches to verify **both** of the following:

#### A. Public Domain Check (Whole-Web Search, Avoid False Negatives)
Search the broader internet (**Internet Archive**, **Open Culture**, **Classic Cinema Online**, **Public Domain Movie Database**, **PublicDomainMovies.net**, **Wikimedia Commons**, **Wikipedia**, **Library of Congress / Copyright Office records**, and national film archives) — never rely on a single site.
- **Handle Context Hints:** Movie inputs may include an actor, director, or year after a dash (e.g., `"Ray - Jamie Foxx"`). Always use that hint to identify the exact movie when multiple films share the same title.
- **Check copyright status first, then look for download sources across the whole web** (Archive.org, Wikimedia Commons, PublicDomainMovies.net, OpenCulture, national archives).
- **Avoid false negatives:** Never dismiss a movie as "Copyrighted" based on one vague or incomplete result. If sources disagree or info is incomplete (especially for pre-1978 films or international classics), mark it **`Uncertain — Double Check`** with the reason instead of rejecting it.
- Use 4 clear statuses:
  - `confirmed_global_pd` — Confirmed Public Domain globally / US (safe to download & host on Bunny Stream behind a paywall; avoid modern restored Blu-ray prints).
  - `country_only_pd` — Public Domain in home country only (e.g., India ≤ 1965, still copyrighted in US).
  - `uncertain_check` — Mixed or incomplete copyright info online (do not discard; flag for quick review).
  - `copyrighted` — Clearly under active copyright (e.g., modern studio release).
- Reject `CC-BY-NC` (Non-Commercial) for paywall use; allow `CC0` and `CC-BY`.

#### B. Legal Free Watchable Copies Across ALL Reputable Sites
Do **not** limit to YouTube and Vimeo. Search across the internet for legal, embeddable full movies on **reputable platforms only**:
- **Allowed Reputable Platforms:**
  - YouTube (official studio, distributor, archive, or filmmaker channels only)
  - Vimeo (official filmmaker / festival channels)
  - Internet Archive (`archive.org` — supports direct embed)
  - Dailymotion (verified/official studio channels only)
  - Wikimedia Commons (public domain video files)
  - Official National Film Archives (e.g., NFB Canada, Mosfilm, NFDC/Cinemas of India, BFI, Library of Congress)
- **Strictly Avoid:** Dodgy/pirate streaming sites, popup/ad-heavy mirror sites, or random unofficial re-uploads.
- **English Subtitles Priority (Non-English Movies):** When a non-English movie has multiple official/licensed free uploads (e.g., on YouTube), **always prefer the version with built-in English subtitles** (hardcoded or official English CC track), because YouTube embeds often omit English from Auto-translate.

### Step 3: Save Queue & Show a Simple Table
1. Save verified results to `movie-queue.json` at the project root for the Movie Adder agent.
2. Show the user a short, easy-to-read table:
   - **Movie (Year, Country)**
   - **Public Domain?** (`Yes` / `India Only` / `Uncertain — Check` / `No`)
   - **Free Legal Copy Found?** (Platform + official channel/site, or `None`)
   - **Where Else to Watch** (Netflix, Prime, MUBI, etc.)
   - **Recommended Next Step** (Host on Bunny Stream / Embed Free / Add Trailer + OTT Links / Already on Screen9)
3. Ask which movies they want to approve for the Movie Adder agent.
