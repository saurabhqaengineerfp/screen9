<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Screen9 Project Rules & Context

This file contains crucial project context for AI coding assistants working on the Screen9 repository.

## 1. Tech Stack & Architecture
- **Framework:** Next.js 15 (App Router). `cookies()`, `headers()`, and similar dynamic APIs are **asynchronous** and must be `await`ed.
- **Styling:** CSS Modules (`.module.css`). We do **not** use Tailwind CSS in this project. Use standard CSS files and standard flex/grid layouts.
- **Icons:** `lucide-react`. Use these instead of external SVGs or image files.
- **Database:** Supabase. Schema includes a `movies` table.
- **Data Fetching:** We use Next.js Server Components and Server Actions. Try to fetch data on the server when possible and pass it to Client Components as props.

## 2. Design System & Theme
- **Color Palette:** The primary brand color is **Deep Amber Orange (`#FF7A00`)**. Do NOT use Netflix Red (`#E50914`) or Purple.
- **Backgrounds:** We use dark, cinematic backgrounds (`#050505` to `#181818`) to emphasize the video content.
- **Gradients & Blur:** UI elements like modals and overlays should use `backdrop-filter: blur()` and smooth dark gradients to blend into the background seamlessly. Look at `MoreInfoModal.module.css` for examples.

## 3. Video Player Implementation
- **Custom Player:** We use a highly customized YouTube IFrame API integration instead of generic libraries like `react-player`.
- **Branding Hiding:** We do NOT use dark gradient covers to hide YouTube branding. Instead, the YouTube iframe is wrapped in an `overflow: hidden` container and slightly scaled up (`transform: scale(1.05)`) so the YouTube logos and title bars are pushed out of the visible boundary and cropped out.
- **Controls:** We implement our own custom play/pause, seek, and volume controls via the YouTube IFrame API.

## 4. Admin & TMDB Integrations
- **Admin Panel:** Located at `/admin`. It is protected by a password wall (`ADMIN_PASSWORD` in `.env.local`).
- **TMDB Data:** We automatically fetch movie details (including `append_to_response=credits` for Director and Cast) directly from TMDB when a movie is added via the Admin panel. Do not scrape IMDB.
- **RLS Bypassing:** When adding or deleting movies via Server Actions, use `SUPABASE_SERVICE_ROLE_KEY` to bypass Row-Level Security, as the default `anon` key cannot perform mutations on the `movies` table.

## 5. What NOT to do
- Do **not** install complex third-party libraries (e.g. video players, modal libraries, styling frameworks) without asking. We prefer writing custom, lightweight CSS/React.
- Do **not** accidentally import or re-introduce Tailwind classes.
- Do **not** commit hardcoded database passwords or secret keys.

When given a task, always refer back to these rules to ensure consistency with the established architecture and design!
