# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [Unreleased]

### Added
- **Code editor auto-opens**: The side panel opens automatically to the Code Editor tab whenever a problem loads — no manual click needed.
- **Sample test runner** (free): Code panel now has a "Run Tests (N)" button that runs your code against the problem's sample I/O using the Piston execution engine. Shows per-test pass/fail with expandable input/expected/got details. Supports C++, Python, Java, and JavaScript. (`POST /api/run-code`, `src/lib/extract-samples.ts`)
- **Codeforces account linking**: Profile page has a new "Codeforces Account" section — enter your CF handle to verify it against the CF API and store your rating, max rating, and rank. (`POST /api/profiles/cf-link`, `supabase/migrations/20260603161021`)
- **Contests page** (`/contests`): Shows upcoming Codeforces contests with name, start time, duration, and countdown. If you've linked your CF account, also shows your recent contest history with rank and rating delta.
- **XP gain notification**: After marking a problem as done, a prominent card shows `+X XP`, current rank level in rank color, a progress bar to the next level, and a "Level Up!" badge when crossing a rank boundary. (`problem-viewer.tsx`, `solve/route.ts` now returns `old_level`)
- **Monetization infrastructure**: `plan` column on profiles (free/pro/elite), `hint_sessions` table for per-user per-day dedup. Free tier enforced server-side. (`supabase/migrations/20260517000000`, `src/lib/plan.ts`)
- **Hint gating (free tier)**: After 3 unique-problem hint sessions per day, hints 2 & 3 are blurred with a lock overlay and quiet "Resets tomorrow / Upgrade to Pro" CTA. No modal. (`GET /api/problems/[number]/hints`, `problem-viewer.tsx`)
- **Notes daily cap (free tier)**: 4th+ note on free plan returns HTTP 429 with a clear message. (`POST /api/notes`)
- **Pricing page** (`/pricing`): Static Free / Pro / Elite comparison with feature lists, yearly discount, and FAQ. Linked from navbar for all users.
- **Public profiles** (`/profile/[username]`): Any user's profile is publicly viewable.
- **Rank color system** (`lib/xp.ts`): `rankConfig()` and `RANK_CONFIGS` — 8 ranks each with color, gradient, and icon.
- **USACO platform**: USACO problems are now a first-class category throughout the app — platform filter button in the Problems page, correct badge display everywhere (problem cards, loaded problem header, profile solved list, recommended problem), USACO option in the Add Problem form, and USACO weighted alongside Codeforces for the `comp_programming` focus bias in random problem selection.

### Fixed
- **Landing streak heatmap — dim-amber trail**: The capabilities "Keep the streak" heatmap encoded four intensity levels (20–100% amber), so low-level cells rendered permanently dim — reading like the fill animation had stalled. It's now binary per the streak model: an active day is full amber, only a genuinely-empty day is dim. (`src/app/page.tsx`)
- **Sample I/O — multi-test cases collapsed onto one line**: Codeforces' newer sample format wraps each line of a sample in its own block element (`<div class="test-example-line ...">`) inside a single `<pre>` — visually separate boxes, but no `<br>`/newline in the HTML. The extractor stripped those tags with no separator, mashing all lines together (e.g. `351 2 3 4 529 8`). `stripTags` now treats the close of any line-level block (`div`/`p`/`li`/`tr`) as a line break, so multi-test inputs/outputs reconstruct correctly. The admin `fix-io` "no-newlines" scan now skips these block-wrapped blocks to avoid false positives. (`src/lib/extract-samples.ts`, `src/app/api/admin/fix-io/route.ts`)
- **Bug report 500 errors**: `bug_reports` migration was not applied to the remote database; pushed `20260518160000` and `20260519000000`.
- **Hint gating bypass**: Free-tier hints 2 & 3 were nulled on the frontend only (CSS blur); the raw API response still contained the full text. API now strips `hint_2`/`hint_3` from the response when `gated = true`; the blurred placeholder relies on `hint_1` as the existence check instead.
- **Classify difficulty — empty anchors**: When "Re-classify all" was enabled, every non-LeetCode problem landed in the target set, leaving the calibration anchor list empty — the AI had no reference scale. Anchors now include all existing rated problems regardless of the target set, and are updated incrementally after each batch so later batches benefit from newly-assigned ratings.

### Fixed
- **Bug report 500 errors**: `bug_reports` migration was not applied to the remote database; pushed `20260518160000` and `20260519000000`.
- **Hint gating bypass**: Free-tier hints 2 & 3 were nulled on the frontend only (CSS blur); the raw API response still contained the full text. API now strips `hint_2`/`hint_3` from the response when `gated = true`; the blurred placeholder relies on `hint_1` as the existence check instead.

### Changed
- **Dark-locked theme (root-cause fix)**: Removed `next-themes`, the `ThemeToggle`, and the theme provider entirely; `<html>` is hardcoded `class="dark"` and the dark CPOS token set lives directly in `@theme inline` (no more `.dark` block or light values). This fixes the long-standing bug where new visitors saw white cards because `defaultTheme="light"` stripped the dark class on hydration. `SettingsProvider` kept (theme field retained for storage compat, now inert). (`src/app/layout.tsx`, `src/app/globals.css`, `src/components/settings-provider.tsx`, `src/components/navbar.tsx`)
- **Landing page redesign — terminal/IDE theme**: Rebuilt `/` into a true-black, monospace-forward terminal/IDE aesthetic (CPOS / One Dark / Tokyo Night family) under one strict syntax-highlight design system. Geist Mono wired globally for all data/labels/code/numbers; grotesk display kept only for large headings (3 sizes). Full §1 palette as CSS variables, each hue one job: near-black bg `#080808`, one dark surface `#0d0d12` for **every** panel/card (zero white anywhere, incl. pricing), structural violet-tinted borders; **violet** brand/keywords/selected, **cyan** numbers/ratings/identifiers, **green** success/solved/strings, **amber** in-progress/caution, **rose** failure, **teal** functions, **orange** constants. Flat `border-l-2` rows and box-drawing panel headers replace bordered cards; radius is `rounded` (4px) only; sections capped at `py-12`/`py-14`; faint violet dotted grid + CRT scanline atmosphere (no glow/gradient-mesh/emoji). Code samples hand-syntax-highlighted with the same palette. Rank/XP emoji section deleted (replaced by a one-line mono note). Pricing: dark panels, Pro = violet border + inline `[recommended]` tag (no inversion). Motion: a page-load boot-sequence cascade with a blinking block cursor, plus IntersectionObserver scroll triggers (stat count-ups, rating sparkline draw-in, amber streak-heatmap fill, sample-runner tests checking green→green→rose `WA`, staggered panel reveals) — all gated behind `prefers-reduced-motion`. (`src/app/page.tsx`, `src/app/landing-fx.tsx`, `src/app/globals.css`)
- **Navbar — terminal restyle (Phase 2)**: `h-14`→`h-10`, mono bold `~/AlgoPath` logo (violet prefix), `font-mono text-xs` nav links, and a mono stat chip `streak {N}d · Lv.{X}` (amber streak / cyan level) that renders nothing on fetch failure. Theme toggle gone. Streak banner kept. (`src/components/navbar.tsx`)
- **Global terminal sweep (Phase 4)**: Radius discipline — every `rounded-lg`/`rounded-xl` across the app converted to `rounded` (4px). KaTeX inline + display chips re-themed from light to dark (muted surface, cyan math, hairline border). Removed the last `bg-white` (an admin toggle knob → `bg-foreground`). Landing scroll-reveal animations gated behind a JS-added `.anim` class so all content stays fully visible if JS never loads / hydration fails (no hidden sections). (`src/app/globals.css`, `src/app/landing-fx.tsx`, `src/app/page.tsx`, `src/app/admin/classify-difficulty/page.tsx`)
- **Profile page — terminal restyle (Phase 3)**: Restyled `/profile` to the terminal language. Hero card gains a `~/profile` box-drawing header + uppercase plan tag; a square monospace avatar (violet initial) replaces the gradient ring; the XP bar is violet; the 5-stat bar is mono with cyan figures and an amber/dim `{N}d` streak — no `🔥`. Rank emoji (`config.icon`) dropped and off-palette rank gradients replaced with §1 tokens (`rankConfig` no longer used on this page). Streak nudges became flat `border-l-2` rows (amber `!` / rose `×` / dim `·`, never `🔥`/`💔`). Recommended-problem and topic-rec cards are `border-l-violet` panels with mono difficulty (cyan/amber/rose) and platform tags; solved-list rows are flat with green checks, cyan `#numbers`, and a violet hover left-edge. Skill-web bars + topic radar tinted violet; the solve-activity heatmap is now green (`--color-solved`). CF rank colors kept as the recognized external standard but mapped onto §1 tokens (pupil→green, specialist→cyan, CM→violet, master→amber, GM→rose; "expert" keeps a distinct bright blue since §1 has no blue token). Section headings render at full `text-foreground` via a `// label` eyebrow. The separate public `/profile/[username]` route is intentionally unchanged this pass. (`src/app/profile/page.tsx`, `src/app/profile/loading.tsx`, `src/app/profile/cf-link-section.tsx`, `src/app/profile/topic-radar.tsx`, `src/app/profile/topic-recommendation.tsx`, `src/app/profile/streak-freeze-button.tsx`, `src/app/profile/solve-heatmap.tsx`)
- **Surface elevation (global)**: Panels were separating from the true-black page on border alone and reading flat. Lifted the surface ramp via fill (no shadows): `--color-card` `oklch(0.055)→0.08` (`#0d0d12→~#111118`), `--color-muted` `0.09→0.13` (kept the inset/hover delta above the raised card), `--color-border` `0.17→0.20` for edge definition; `popover`/`code-background` track card, `secondary`/`accent` track muted, `input`/`code-border` track border. Background, text, and all semantic colors untouched. Added light hierarchy — most panels keep the quiet border, a few lead: the landing hero terminal panel (violet top rule) and the primary `problem-feed` capability tile (violet left edge); Pro pricing card already led via its violet border. (`src/app/globals.css`, `src/app/page.tsx`)
- **`--color-info` token (CF rank blue)**: Formalized the Codeforces "expert/specialist-tier" blue as `--color-info` (`#56a3ff`) in §1, replacing the prior one-off `text-sky-400`. It is CF-rank-only — not a general accent (cyan still owns numbers/ratings). (`src/app/globals.css`, `src/app/profile/cf-link-section.tsx`, `DESIGN_PLAN.md`)
- **Public profile — terminal restyle (Phase 3)**: `/profile/[username]` mirrored to match `/profile` — `~/{username}` box-drawing header, square mono violet-initial avatar (gradient ring gone), violet XP bar, mono stat bar with cyan figures and an amber/dim `{N}d` streak (the `🔥` and rank emoji removed), violet skill-web bars + radar, and `// label` section headings at full foreground. Uses the raised `--color-card`. (`src/app/profile/[username]/page.tsx`, `src/app/profile/[username]/loading.tsx`)
- **Navbar streak banner — emoji removed**: The at-risk / broken streak banners kept their copy and color framing but dropped `🔥`/`💔` for in-palette mono markers — amber `!` (at risk), rose `×` (broken). The now-unused `fire-flicker` keyframe + animate token were deleted. (`src/components/navbar.tsx`, `src/app/globals.css`)
- **Activity — terminal restyle (Phase 3)**: `/activity` timeline mapped to §1 — the three activity kinds use one role each (solved → green, note → violet, AI review → teal), replacing raw `green-500`/`primary`/`purple-500`. Stat figures and timeline metadata (XP, "N hints", timestamps) went monospace; filter pills `rounded-full` → `rounded`. Timeline rows were already flat `border-b` rows, kept. Settled palette rule applied: cyan owns the numeric figure, the category color lives on the label. (`src/app/activity/page.tsx`)
- **Insights — terminal restyle (Phase 3, charts)**: `/insights` (hand-rolled `div` bar charts, no chart library). Section headings → `// label` eyebrows at full foreground. Removed the `🔥` from the Current Streak stat (streak figure now amber, all other stat figures cyan, labels muted). Chart roles by meaning, not raw Tailwind: the categorical bar charts are a single violet primary data series (day-of-week, platform, difficulty, topics) while the **XP-earned-over-time** bars are green (progress/success role, matching the landing rating-climb) — value is encoded by bar length, with a *uniform* per-chart opacity (not a per-cell intensity ramp, so no partial-opacity "trail" bug); **Weak Topics** hint-average → amber (caution), **Strengths** hint-average → green (success, was violet `text-primary`). Progress-bar tracks `rounded-full` → `rounded`; all figures monospace + cyan. No charting library, so no default light tooltips/gridlines to theme (tooltips are native `title=` attributes). Free-tier lock + Upgrade button de-pilled. (`src/app/insights/page.tsx`)
- **Display-problem — terminal restyle (Phase 3, chrome + editor)**: Restyled the code-editor page. Chrome: right-edge tab rail and panel lost their shadows (`shadow-md`/`shadow-2xl` gone — depth from borders only), all radii normalized to `rounded` (4px); language/filter/tab controls and data (char count, line count, counts) went monospace; the off-palette `bg-emerald-600`/white Run button became the violet primary; inverted light pills (`bg-foreground text-background` filter/drill/hint-nudge) became violet primary or bordered-violet (matching the profile drill button). **Test runner** now mirrors the landing sample-runner exactly — flat `border-l-2` rows, green `✓` / rose `✗`, mono `test N` with `OK`/`WA` on the right (real results carry no per-test timing, so status replaces the landing's mock `4ms`); expanded Input/Expected/Got blocks use neutral / green-edge / rose-edge tints. The XP "Problem Solved!" card was rebuilt on the §1 palette (green success edge, violet level badge, green `+XP`, violet progress) and **dropped the rank emoji** (`config.icon`); thumbs up/down verdicts use green/rose tokens. **Editor**: added §1-aligned Prism token colors (keywords violet · strings green · numbers cyan · functions teal · comments dim) scoped to `.code-editor` so they color the highlight overlay only — the editable textarea, caret, and selection are untouched; the editor surface moved from hardcoded Catppuccin `#1e1e2e` and the solution viewer from Monokai `#272822` to an in-palette surface just above `--color-card`, with foreground text/caret. All run/submit/test/language/tab functionality unchanged. (`src/app/display-problem/{side-panel,problem-viewer,page,loading}.tsx`, `src/app/globals.css`)
- **Notes — terminal restyle (Phase 3)**: Restyled `/notes` (master/detail list + editor; bounded correctness pass, no structural rewrite of the interactive editor). All radii `rounded-md`/`rounded-full` → `rounded` (4px) — buttons, sidebar items, tabs, and the sidebar tag pills. Sidebar metadata went monospace (date, `#problem` badge moved off `primary` onto the `violet` token, language tag already mono); the code-length counter is mono. The **code editor** inherits the same `.code-editor` Prism overlay theming as display-problem: surface moved from hardcoded Catppuccin `#1e1e2e` to the in-palette `oklch(0.115 …)` just above `--color-card`, overlay text + caret to `--color-foreground` (the editable textarea, caret, and selection are otherwise untouched). The notes body is a plain textarea (no markdown/rich-text preview), so there's no rendered-content area to theme. New Note / Save buttons stay violet primary, Delete stays `destructive`. All note CRUD / autosave / tab / migration logic unchanged. (`src/app/notes/page.tsx`)
- **Add Problem — terminal restyle (Phase 3)**: Restyled the `/add-problem` form. Fields (title/URL/tags `Input`, platform/difficulty `select`, content `textarea`) normalized to `rounded` (4px) with shadows removed and a consistent dark `bg-input/30` field surface + 1px `border-input`; focus is the violet ring (`--color-ring` `#a78bfa`, already on-palette). URL and difficulty fields went monospace (URL/numeric). Validation messaging is role-correct: error → `destructive` (already rose `#fb7185`), and the success line moved off raw `text-green-600/dark:text-green-400` onto the `green` token. The HTML preview heading became a `// preview` mono eyebrow and the preview card lost its `shadow-sm` (depth from the 1px border only). Shadcn `Input`/`Button` primitives were left untouched globally — radius/shadow normalized per-instance via `className` overrides rather than mutating the shared components. (`src/app/add-problem/page.tsx`)
- **Add Hints — terminal restyle (Phase 3, final inner page)**: Restyled the `/add-hints` admin tool (load / AI-generate / edit a fixed 3-hint set + save, plus a bulk-fill section). Fields (problem-number `Input`, three hint `textarea`s) → `rounded` (4px), shadows removed, dark `bg-input/30` surface + 1px `border-input`, violet focus ring; the problem-number field went monospace. Each hint editor became a flat `border-l-2 border-l-violet` row with a `hint N` mono-cyan indicator + dim descriptor (Observation/Direction/Outline) — a single disciplined treatment rather than a per-level rainbow, since the actual hint *display* in `problem-viewer.tsx` uses uniform muted cards with no established per-level color. Status/validation messaging is role-correct and monospace: errors → `destructive` (rose), success/loaded/generated → `green` token (was raw `text-green-600/dark:text-green-400`). Bulk section: progress-bar track + fill `rounded-full` → `rounded` (violet fill on muted track), log container `rounded-md` → `rounded`, per-row `✓`/`✗` markers moved to the `green`/`destructive` tokens (matching the display-problem sample-runner) and the `#problem` number went cyan. Load/Generate/Save/Bulk buttons kept their shadcn variants with per-instance `rounded shadow-none` overrides (shared primitives untouched). No live hint preview exists on this page, so nothing rendered to theme. (`src/app/add-hints/page.tsx`)
- **Shared primitive normalization (Phase 4b, step 1)**: Normalized the two shared shadcn primitives to the design system globally — `Button` (`src/components/ui/button.tsx`): `rounded-md` → `rounded` (4px) in the base recipe and every `size` variant (`xs`/`sm`/`lg`/`icon-xs`), and dropped `shadow-xs` from the `outline` variant; `Input` (`src/components/ui/input.tsx`): `rounded-md` → `rounded`, dropped `shadow-xs`. Focus ring (violet `ring-ring`), `aria-invalid` (rose `destructive`), and `disabled:opacity-50` states are unchanged. Removed the now-redundant per-instance `rounded`/`shadow-none` overrides on the add-problem and add-hints forms (kept the `font-mono` overrides). This is a single global change to every `<Button>`/`<Input>` in the app. (`src/components/ui/{button,input}.tsx`, `src/app/add-problem/page.tsx`, `src/app/add-hints/page.tsx`)
- **Auth pages — terminal restyle (Phase 4b, step 2 / group 1)**: Restyled the five logged-out auth surfaces (`login`, `signup`, `forgot-password`, `reset-password`, `setup-username`) plus the setup-username skeleton. The Phase-1 token swap had already darkened them, so this was a targeted role/pattern pass: email/username fields went monospace (identifier fields); all error and field-status lines went monospace, with the raw `text-green-600` availability message moved onto the `green` token (errors already used the rose `destructive` token); the "Check your email" confirmation icon badges changed from neutral `rounded-full bg-muted` circles to `rounded` green-tinted (`bg-green/10 text-green`) success tiles, and the confirmation email addresses render monospace; the login "password updated" banner became a flat `border-l-2 border-l-green bg-green/10` success row (was a neutral `bg-muted/40` bordered box); the setup-username loading skeleton's `rounded-md` bars → `rounded`. The Google OAuth logo keeps its official brand colors (`#4285F4`/`#34A853`/`#FBBC05`/`#EA4335`) — a recognized external brand mark, the same exception class as Codeforces rank blue. Focus ring (violet), disabled, and OAuth/submit button behavior unchanged. (`src/app/auth/{login,signup,forgot-password,reset-password,setup-username/page,setup-username/loading}.tsx`)
- **Side panel reduced to 2 tabs**: Notes tab removed from the tab bar; notes are now accessible via a collapsible accordion inside the Code Editor panel. Panel opens to Code Editor by default.
- **Contests added to navbar**: New "Contests" link in the authenticated nav.
- **Skill level resets rating**: Changing skill level on the profile page now also resets the user's rating (Beginner → 1,000 · Intermediate → 1,200 · Advanced → 1,600) and shows a confirmation step explaining the change before saving.
- **Search merged into Problems**: `/search` page removed. The Problems page (`/display-problem`) already has full title search + platform/difficulty filter. Navbar "Search" link replaced by "Pricing". Page heading updated to "Problems" with a descriptive subtitle.
- **Landing page rank section**: Redesigned with a horizontal scrollable progression chart showing each rank in order with XP thresholds and connecting arrows. Rank grid below also shows XP requirement per tier.
- **Profile hero**: Rank badge and XP progress bar now use rank-specific color and gradient.
- **Performance — display-problem**: Page streams the "Problems" heading immediately; Supabase work moved behind Suspense.
- **Performance — profile page**: Heavy `solvedProblemDetails` query moved into a Suspense component; profile hero renders from a single fast query.
- **Performance — loading.tsx**: Added skeletons for `/onboarding` and `/auth/setup-username`.

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
