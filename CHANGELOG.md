# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [Unreleased]

### Added
- **FAQ page** (`/faq`): A public FAQ rendered as native `<details>` accordions styled with the app's design tokens — no extra libraries. Backed by a `faqs` table and linked from the navbar. (`supabase/migrations/20260606000000_add_faqs.sql`)
- **Hideable problem tags**: Tags on the loaded-problem card can spoil the intended approach, so they now have a "Hide" toggle. Tags are visible by default; hiding replaces them with a quiet "Hidden to avoid spoilers" note and a "Show (N)" toggle. The preference is persisted in `localStorage` so it carries across problems and reloads. (`src/app/display-problem/problem-viewer.tsx`)

### Fixed
- **AI generation failed with "All models exhausted"**: The OpenRouter free-model fallback chain had been deprecated upstream (every model returned 404), so all hint / solution / review / chat generation failed. Replaced the model list with currently-live free models, prioritizing the free OpenAI `gpt-oss` models per project policy. (`src/lib/model-router.ts`)

---

## [2.0.0] - 2026-06-10

The headline release: a complete visual rebrand of the app into a true-black, monospace-forward terminal/IDE aesthetic under one strict design system.

### Changed
- **Full terminal/IDE rebrand**: Rebuilt the landing page and restyled every page (profile, activity, insights, problems, notes, settings, auth, pricing) into a true-black (`#080808`), monospace-forward terminal/IDE theme. One dark surface for every panel and card — no white anywhere — with violet-tinted structural borders and a disciplined palette where each hue has one job: violet (brand/keywords/selected), cyan (numbers/ratings), green (success/solved), amber (in-progress/caution), rose (failure), teal (functions). Flat `border-l-2` rows and box-drawing headers replace bordered cards, radius is a uniform 4px, and a faint dotted grid plus CRT scanline give the page atmosphere. Geist Mono is wired globally for all data, code, and numbers.
- **Dark-locked theme**: Removed `next-themes`, the theme toggle, and the theme provider entirely — the app is now hardcoded dark. This fixes the long-standing bug where new visitors briefly saw white cards on first paint because the default theme stripped the dark class on hydration.
- **Landing-page motion**: A page-load boot-sequence cascade with a blinking cursor, plus scroll-triggered effects (stat count-ups, a rating sparkline draw-in, the streak heatmap filling, and a sample-runner demo). All motion is gated behind `prefers-reduced-motion`, and every section stays fully visible if JavaScript never loads.
- **Emoji removed**: Replaced rank and streak emoji across the navbar, profile, activity, and insights with in-palette monospace markers.
- **Surface elevation**: Lifted the panel surface ramp via fill (no shadows) so cards separate cleanly from the true-black background.
- **Unified editor syntax highlighting**: Every code editor in the app now shares one Prism token palette (keywords violet, strings green, numbers cyan, functions teal, comments dim) instead of the previously divergent themes.

### Fixed
- **Landing streak heatmap looked stalled**: Low-intensity cells rendered permanently dim, as if the fill animation had hung. The heatmap is now binary — an active day is full amber, an empty day is dim. (`src/app/page.tsx`)

---

## [1.1.2] - 2026-06-03

### Added
- **Sample test runner** (free): The code panel now has a "Run Tests (N)" button that runs your code against the problem's sample I/O using the Piston execution engine, showing per-test pass/fail with expandable input / expected / got details. Supports C++, Python, Java, and JavaScript. (`POST /api/run-code`, `src/lib/extract-samples.ts`)
- **Codeforces account linking**: The profile page has a new "Codeforces Account" section — enter your CF handle to verify it against the Codeforces API and store your rating, max rating, and rank. (`POST /api/profiles/cf-link`)
- **Contests page** (`/contests`): Shows upcoming Codeforces contests with name, start time, duration, and countdown. If you've linked your CF account, it also shows your recent contest history with rank and rating delta.
- **Code editor auto-opens**: The side panel opens automatically to the Code Editor tab whenever a problem loads.

### Changed
- **Side panel reduced to 2 tabs**: The Notes tab was removed from the tab bar; notes are now in a collapsible accordion inside the Code Editor panel, which opens by default.
- **Contests added to the navbar.**

### Fixed
- **Sample I/O multi-test cases collapsed onto one line**: Codeforces' newer sample format wraps each line of a sample in its own block element with no newline in the HTML, so the extractor mashed every line together. `stripTags` now treats the close of any line-level block as a line break, so multi-test inputs and outputs reconstruct correctly. (`src/lib/extract-samples.ts`)

---

## [1.1.1] - 2026-05-19

### Added
- **XP gain notification**: After marking a problem done, a prominent card shows `+X XP`, your current rank level in its rank color, a progress bar to the next level, and a "Level Up!" badge when you cross a rank boundary. (`problem-viewer.tsx`)

### Changed
- **"Mark as Done" confirmation**: Marking a problem done now asks "How'd it go?" before recording, instead of recording immediately.

### Fixed
- Corrected canonical tag data so topic tags display consistently across the app.

---

## [1.1.0] - 2026-05-19

### Added
- **Solve activity heatmap**: A calendar heatmap of your daily solves on the profile page.
- **Average hints needed**: A new stat showing how many hints you typically use per solve.
- **Bug report button**: A floating button to submit a bug report from anywhere in the app. (`bug_reports` table)
- **USACO platform**: USACO is now a first-class platform throughout — a filter button on the Problems page, correct badges everywhere (problem cards, loaded-problem header, profile solved list, recommendations), a USACO option in the Add Problem form, and USACO weighting alongside Codeforces in random problem selection.
- **Public profiles** (`/profile/[username]`): Any user's profile is publicly viewable.
- **Rank color system** (`lib/xp.ts`): Eight ranks, each with its own color, gradient, and icon.

### Changed
- **Skill level resets rating**: Changing your skill level on the profile now also resets your rating (Beginner → 1,000 · Intermediate → 1,200 · Advanced → 1,600), with a confirmation step that explains the change first.
- **Search merged into Problems**: The separate `/search` page was removed — the Problems page already has full title search plus platform/difficulty filters. The navbar "Search" link was replaced by "Pricing".
- **Landing-page rank section**: Redesigned as a horizontal scrollable progression chart showing each rank in order with its XP threshold.
- **Profile hero**: The rank badge and XP progress bar now use rank-specific color and gradient.

### Performance
- **`/display-problem`** streams the heading immediately, with Supabase work moved behind Suspense.
- **Profile page** renders its hero from a single fast query; the heavy solved-problem-details query moved behind Suspense.
- Added loading skeletons for `/onboarding` and `/auth/setup-username`.

### Fixed
- **Bug report 500 errors**: The `bug_reports` migration had not been applied to the remote database.

---

## [1.0.8] - 2026-05-18

Monetization — the Free / Pro / Elite tier system goes live.

### Added
- **Monetization infrastructure**: Stripe checkout, a webhook handler, and the billing portal, backed by a `plan` column on profiles (free / pro / elite) and a `hint_sessions` table for per-user, per-day dedup. The free tier is enforced server-side. (`src/lib/plan.ts`)
- **Hint gating (free tier)**: After 3 unique-problem hint sessions per day, hints 2 & 3 are blurred behind a lock overlay with a quiet "Resets tomorrow / Upgrade to Pro" CTA — no modal.
- **Notes daily cap (free tier)**: The 4th and later note created in a day returns HTTP 429 with a clear message.
- **Plan gating**: AI solution review and unlimited notes are gated to paid plans.
- **Pricing page** (`/pricing`): A Free / Pro / Elite comparison with feature lists, a yearly discount, and an FAQ, linked from the navbar.

### Fixed
- **Hint gating bypass**: Free-tier hints 2 & 3 were only blurred client-side while the raw API response still contained the full text. The API now strips `hint_2` / `hint_3` when the response is gated.

---

## [1.0.7] - 2026-05-15

### Added
- **Skill Web on Profile**: Your profile now shows a radar chart of your topic strengths — each axis is a topic you've practiced, and the further the shape extends from the center, the more you've solved there. A bar breakdown below shows the count per tag. Appears once you've covered 3+ distinct topics. (`profile/topic-radar.tsx`, `profile/page.tsx`)
- **Profile rank badge + top skill chip**: The level badge now has a small colored dot that changes as your rank title progresses (Newcomer → Apprentice → Solver → Coder → Expert → Master → Grandmaster → Legendary). A "Top skill" chip in the profile hero shows your most-practiced topic at a glance. XP bar is slightly thicker for better visibility. (`profile/page.tsx`)
- **Onboarding drops you straight into a problem**: After finishing (or skipping) onboarding, you land directly on a problem matched to your skill and focus — no extra screen in between. (`onboarding-form.tsx`)
- **AI topic recommendation**: A "What to Focus On Next" section on the profile suggests the single most valuable topic for you to practice next, with a short explanation — based on your rating, focus, and solve history. "Drill this →" links directly into drill mode for that topic. (`GET /api/profiles/topic-recommendation`, `profile/topic-recommendation.tsx`)
- **Topic Drill Mode**: Pick a tag and work through 5–8 problems in difficulty order — a focused session on one topic. A progress bar tracks where you are; a summary card at the end offers "Drill again" or "Pick something else." Accessible via tag search → "Drill this tag". URL updates to `?drill=<tag>` so you can resume mid-session. (`problem-viewer.tsx`, `GET /api/problems/drill`)
- **Streak-at-risk email reminder**: If your streak is active and you haven't solved anything today, you'll get one nudge email at 8 AM UTC. Can be turned off in Profile → Notifications. (`GET /api/cron/streak-nudge`, `vercel.json`)
- **Email notification toggle**: New Notifications section in Profile settings to turn the daily streak reminder on or off. (`/profile`, `PATCH /api/profiles/settings`)

### Changed
- **Hints are the primary action on every problem**: "Get Hints" is always visible and styled as the main button. After 45 seconds on a problem without opening hints, a nudge banner appears inline — dismisses automatically when you open hints. (`problem-viewer.tsx`)
- **Topic names are consistent everywhere**: Tags now use proper casing and canonical names across the whole app (e.g. "Dynamic Programming", "BFS", "DSU / Union Find"). Abbreviations like "dp" and full names like "dynamic programming" resolve to the same topic. (`src/lib/tags.ts`)
- **Faster auth for returning users**: Login state is read directly from your session token — no database call needed on every page load. Returning users who land on `/auth/setup-username` by accident (back button, stale link) are redirected immediately. (`auth/callback/route.ts`, `middleware.ts`)

### Performance
- **Faster page loads across the app**: Removed 23 KB of CSS that was loading on every page — now scoped only to routes that actually render math (`/display-problem`, `/admin`). (`layout.tsx`, `display-problem/layout.tsx`, `admin/layout.tsx`)
- **Profile renders without waiting on recommendations**: The "Recommended for You" card now streams in separately — your stats, Skill Web, and history appear immediately without waiting for it. (`profile/page.tsx`)
- **Skeleton screens on slow routes**: `/display-problem` and `/profile` show a skeleton while data loads instead of a blank page.

### Fixed
- **Math formulas invisible in dark mode**: Subscripts and superscripts in Codeforces problem statements were rendering near-black on dark backgrounds. Fixed.
- **Admin**: Bulk hint generation now uses a model fallback chain with retry logic — a transient API failure no longer silently skips problems in the batch.

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
