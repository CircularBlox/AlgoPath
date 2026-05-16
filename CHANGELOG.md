# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [Unreleased]

### Added
- **Skill Web** (`profile/topic-radar.tsx`, `profile/page.tsx`): Combined "Skill Web" section on the profile page — SVG radar chart (each axis is a topic, further from center = more solved there, grid rings at 25/50/75/100%) plus a bar breakdown legend below it in the same card. Radar appears once ≥ 3 topics are solved; bars always show.
- **Profile gamification** (`profile/page.tsx`): Rank-colored dot on the level badge (gray → amber → green → blue → purple → gold → orange → red as title progresses). "Top skill" chip in the profile hero showing the most-solved topic. XP bar slightly thicker for better visibility.
- **Onboarding → direct to first problem** (`onboarding-form.tsx`): After completing (or skipping through) onboarding, the app fetches a personalized problem via `/api/problems/random` and redirects directly to it (`/display-problem?p=<number>`) instead of the blank practice screen.
- **AI topic recommendation** (`GET /api/profiles/topic-recommendation`, `profile/topic-recommendation.tsx`): New "What to Focus On Next" section on the profile page. An AI coach (GPT-4o-mini via OpenRouter) analyzes the user's rating, focus, and tag history and recommends the single most valuable topic to practice next, with a short explanation. Result is cached per session. "Drill this →" button links directly into drill mode for that topic.
- **Topic breakdown on profile** (`profile/page.tsx`): "Topics Practiced" section showing the user's top 8 tags by solve count with a proportional bar. Computed server-side from solved problem details — no extra DB query.
- **Admin: difficulty null backfill** (`POST /api/admin/backfill-difficulty`): Fetches all CF problem ratings from the Codeforces API in one call and updates any problems in the DB with NULL difficulty. Supports `?dry_run=true` to preview without writing.
- **LCP improvements**: Added `loading.tsx` skeleton screens for `/display-problem` and `/profile` routes so the shell renders immediately while data loads. Also parallelized the profile check and problem fetch in the display-problem page (was sequential, now a single `Promise.all`).
- **Topic drill mode** (`problem-viewer.tsx`, `GET /api/problems/drill`): "Drill this tag" button appears in tag search results. Queues 5–8 unsolved problems for the tag sorted by ascending difficulty. Progress bar shows current position. After the last problem is solved, a summary card offers "Drill again" or "Pick something else." Skip button advances to the next drill problem instead of picking random. URL updates to `?drill=<tag>` so the session is resumable. Works from the intent screen card "Practice a topic" → tag search → drill.
- **Streak-at-risk daily email** (`GET /api/cron/streak-nudge`, Vercel Cron): One email per day at 8 AM UTC to users whose streak is > 2 and who haven't solved today. Auto-enabled for all users. Requires `RESEND_API_KEY` and `RESEND_FROM` env vars (Resend email service). Skips silently if API key is not set.
- **Email notification setting** (`/profile`, `PATCH /api/profiles/settings`): Toggle in Profile → Notifications section to enable/disable the streak reminder email. Auto-enabled on account creation.
- **Vercel Cron config** (`vercel.json`): Cron job wired to `/api/cron/streak-nudge` at `0 8 * * *` (8 AM UTC daily).

### Changed
- **Hints are now the primary CTA on the problem viewer** (`problem-viewer.tsx`): "Get Hints" button is always visible and uses the primary style, replacing the outline button that was hidden behind a "viewed problem" gate. "Open Problem" is now secondary. After 45 seconds on a problem without opening hints, a gentle inline banner appears: "Stuck? Get your first hint →" — dismisses automatically when hints are opened.
- **Auth fast path — zero DB round-trips for returning users** (`auth/callback/route.ts`, `middleware.ts`, `setup-username/page.tsx`, `api/onboarding/route.ts`): Username confirmation and onboarding completion are now mirrored to Supabase auth `user_metadata` on write. The auth callback checks metadata first (from the JWT, no DB query) and falls back to the profiles table for users who predate this change. Returning users who hit `/auth/setup-username` via back-button or stale link are redirected immediately by middleware without loading the page.
- **Username availability index** (`supabase/migrations/20260514050021_idx_profiles_username_lower.sql`): Added `lower(username)` functional index so case-insensitive availability checks are a fast index scan instead of a full table scan.
- **Tag normalization and display names** (`src/lib/tags.ts`): Tags now display with proper casing throughout the app (e.g. "Dynamic Programming", "BFS", "DSU / Union Find"). Abbreviations and full names are treated as equivalent — "dp" and "dynamic programming" resolve to the same tag. Applied to: drill queue queries, AI topic-recommendation prompt and response, profile "Topics Practiced" section, and the topic-recommendation component.

### Performance
- **KaTeX CSS scoped to math-only routes** (`layout.tsx`, `display-problem/layout.tsx`, `admin/layout.tsx`): Removed 23 KB of render-blocking KaTeX CSS from the root layout. Now loaded only on `/display-problem` and `/admin` where math is actually rendered — all other pages (home, notes, activity, profile, settings) get a lighter initial payload.
- **Profile recommendation streamed via Suspense** (`profile/page.tsx`): The "Recommended for You" section was blocking the entire profile page on up to 3 sequential DB queries. Extracted into a separate async server component behind a Suspense boundary — the hero, stats, and skill web render immediately while the recommendation streams in.

### Fixed
- **KaTeX subscripts/superscripts invisible in dark mode**: The CSS selector scoping was broken — math inside problem statements was inheriting `color: oklch(0.12 0 0)` (near-black), making subscripts invisible on dark backgrounds. Fixed with a proper specificity-based override so problem-content math inherits the foreground color.
- **Admin fixes**: Improved error messaging and UX for edge cases in admin tooling.
- **RLS enforcement on problem reports**: The problem report submission route was using the service-role client, bypassing row-level security. Switched to the session client so all DB access goes through RLS as intended.

### Design
- **Landing page redesign** (`page.tsx`, `globals.css`): Applied Emil Kowalski–inspired aesthetic — clean hero with plain text hierarchy (no pill badges, no decorative dot grid or glow overlays), problem list as a `divide-y` bordered list, hint cards defined by border alone (no background fill), AI review cards with clean label typography, features grid using `gap-px bg-border` cell-separator pattern. Removed alternating section backgrounds throughout. Secondary CTAs converted to plain text links.

---

## [1.0.6] - 2026-05-12

### Added
- **Post-solve "Try this next" card** (`problem-viewer.tsx`, `GET /api/problems/[number]/next`): After marking a problem done, an inline card appears showing a targeted next problem (same tag, one step harder). Two actions: "Practice this →" loads it immediately; "Pick something else" calls the random endpoint. Replaces the previous 1.5s auto-random-load entirely. Falls back to "Pick a problem" button if no candidate can be found. The next-problem fetch fires immediately on solve so the card is ready before the user looks for it.
  - New `GET /api/problems/[number]/next`: query logic — same-tag overlap + difficulty +100–300; falls back to any problem at target difficulty; final fallback to any unsolved problem.
- **Editorial link in solution panel** (`problem-viewer.tsx`): When `problems.editorial_url` is populated, a "Read editorial ↗" link appears in the solution panel footer after the code and explanation.
  - New migration `20260512100000_add_editorial_url_to_problems.sql`: adds nullable `editorial_url text` column to the `problems` table.

### Changed
- **`"Pick a Problem for Me"` respects filter bar platform** (`problem-viewer.tsx`, `GET /api/problems/random`): `fetchRandom()` now passes `?platform=` when the filter bar has CF or LC selected. Random route accepts optional `platform` query param that bypasses the focus-based bias.

---

## [1.0.4] - 2026-05-11

### Added
- **Admin tooling**: Sample I/O fix tool to detect and repair scraper artefacts in problem content.

### Changed
- **Difficulty matching overhauled** (`src/lib/difficulty.ts`): New `difficultyBuckets(rating)` helper returns a ±200 CF numeric rating window (in steps of 100) plus the matching LeetCode bucket (`Easy` / `Medium` / `Hard`). Previously all numeric CF difficulties were treated as "medium".
  - Applied to: `/api/problems/random`, `/api/profiles/solve` post-solve recommendation, and profile page recommendation display
  - `calcRatingGain()` now scales XP by numeric CF difficulty (e.g. a 2000-rated problem gives 2× the XP of an 800-rated one)
- **Stale recommendation fixed** (`/api/profiles/solve`): `recommended_problem_number` is now always written on solve (previously only written when a candidate was found, leaving a permanently stale cache when the pool came back empty)
- **Landing page demo replaced** (`src/app/page.tsx`): Two Sum → Coin Change (DP, Medium / CF ~1400). Hints demo updated with DP-flavored progressive hints; code review section shows a `coinChange` Python solution; problem strip now shows CF 1400 / CF 1600 / LC Medium instead of easy array problems

---

## [1.0.3] - 2026-05-07

### Changed
- **Landing page — dual audience messaging**: Updated hero headline, badge pills, feature descriptions, and CTA copy to explicitly target both interview prep (LeetCode/FAANG) and competitive programming (Codeforces/contests). Recommended problems section now shows a Codeforces example alongside LeetCode. Each problem row displays a track label (Interview Prep / Competitive).
- **ProblemViewer refactor**: Split the 2,445-line `problem-viewer.tsx` into four focused modules, reducing the main file to ~1,780 lines:
  - `types.ts` — all shared TypeScript types (`Problem`, `Solution`, `Hints`, `ViewerState`, `ChatMessage`, etc.)
  - `formatting.tsx` — `FormattedText` component and `formatInline` utility
  - `side-panel.tsx` — the fixed tab buttons and slide-out Notes / Code Editor / AI Review panel (~360 lines, self-contained)
  - `saveCodeAsNote` handler promoted from an inline IIFE function to a proper component-level handler

---

## [1.0.2] - 2026-05-07

### Added
- **Admin tooling**: Problem management API for creating, reading, updating, and deleting problems.

---

## [1.0.1] - 2026-05-07

### Performance
- **Navbar streaming**: Navbar is now a sync shell with Suspense-wrapped async sub-components (`NavbarAuthLinks`, `NavbarSignButton`, `NavbarBanner`); the full navbar HTML no longer blocks the initial page response — auth data streams in after the shell paints
- **KaTeX CSS scoped**: Moved `katex/dist/katex.min.css` from the global root layout to `/display-problem` only, eliminating a render-blocking stylesheet on every other route
- **Homepage made static**: Removed `getUser()` from the landing page; all CTA buttons default to `/auth/login` (middleware redirects authenticated users to `/display-problem`), making the page fully static with no server-side data fetching

---

## [1.0.0] - 2026-05-06

### Added
- **Streak break detection**: Streaks now visually reset to 0 when a day is missed; new `broken` state distinct from `at_risk` with a 💔 notification banner in the navbar and profile page; `src/lib/streak.ts` centralises `streakStatus` and `effectiveStreak` helpers
- **PostHog analytics**: Full analytics integration with client-side (`posthog-js`) and server-side (`posthog-node`) SDKs
  - Reverse proxy rewrites in `next.config.ts` to route PostHog traffic through `/ingest/*`
  - `PostHogIdentify` component in root layout for automatic user identification on every page load and `reset()` on sign-out
  - Server-side PostHog client helper (`src/lib/posthog-server.ts`) for use in API routes
  - Events instrumented: `user_signed_up`, `user_logged_in`, `oauth_clicked`, `onboarding_completed`, `problem_viewed`, `hint_revealed`, `solution_viewed`, `problem_solved`, `hint_rated`, `problem_solved_server`, `hint_rated_server`
  - `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` added to env schema
- **Resume feature**: "Continue where you left off" section on the Practice page shows up to 5 recently attempted (notes/AI reviews) unsolved problems (`GET /api/problems/recent`)
- **Skip warning**: Clicking Skip or Find Random Problem while viewing a problem shows a small inline amber warning — "Skipping counts as giving up this problem" — with Skip anyway / Cancel
- **Notes system**: Notes now connected to individual problems via Supabase; supports creation, editing, and deletion per problem
- **AI model selection**: Ability to switch between different AI models for hint generation (via model router)
- **Bulk hint generation**: Admin feature for generating and assigning hints to multiple problems at once (`POST /api/admin/generate-hints-bulk`)
- **LaTeX rendering**: Problem statements with mathematical notation can be rendered as LaTeX for better readability
- **Changelog page**: Public-facing changelog at `/changelog` displaying version history and feature updates
- **Enhanced landing page**: Improved onboarding flow with clearer call-to-action and better value proposition for new users
- **Major solutions update**: Comprehensive review and improvement of hint/solution quality and formatting

### Removed
- `problem_views` table and view-tracking feature (`POST /api/problems/[number]/view`, view useEffect, view timestamps, "Views" in activity page)
- **Dark mode**: Light theme now the primary UI mode for improved accessibility and consistent visual presentation

### Changed
- **Problem viewer redesign**: Complete UI/UX overhaul with integrated code editor, collapsible sidebar panels (Notes, Code, AI), and improved navigation
- **Notes page redesign**: Enhanced UI with better organization, inline editing, and problem context
- **Code/LaTeX box styling**: Code and LaTeX blocks now use lighter gray background for improved readability
- **Formatting improvements**: Enhanced typography, spacing, and visual hierarchy throughout problem statements and code displays
- **Color scheme refinements**: Manual style adjustments for improved visual consistency and modern aesthetic
- **Random button UX**: Soft platform bias improvements and better button interaction patterns
- Activity page and API no longer track or display problem views; stats strip is now 3-column (Solves, Notes, AI Reviews)
- `GET /api/problems/[number]/view` now returns only solve status (`{ solve: ... }`) instead of view+solve data

### Fixed
- Various UI/styling refinements across the problem viewer and code editor
- Constraint validation improvements for problem data
- Code block contrast and readability improvements
- Text rendering and spacing consistency across pages
- Improved streak reset behavior and accuracy

---

## [0.8.0] - Previous Release

See commit history for details on earlier versions.
