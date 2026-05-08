# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

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
- **Admin problem CRUD API**: New admin-only endpoints for managing problems
  - `POST /api/admin/problems` — create a new problem (title, url, platform, difficulty, tags, content)
  - `GET /api/admin/problems` — list all problems paginated (`?page=&limit=`)
  - `GET /api/admin/problems/[number]` — fetch a single problem including full HTML content
  - `PATCH /api/admin/problems/[number]` — partial update any combination of fields (title, url, platform, difficulty, tags, content HTML)
  - `DELETE /api/admin/problems/[number]` — permanently remove a problem
  - All endpoints double-check admin status and use the service-role client; 409 on duplicate URL, 404 on missing problem

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
