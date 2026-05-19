export type ChangelogEntry = {
  version: string;
  date: string;
  changes: { type: "feat" | "fix" | "improve"; text: string }[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.1",
    date: "2026-05-19",
    changes: [
      {
        type: "improve",
        text: 'Mark as Done now asks "How\'d it go?" — choose "Solved it myself" (full XP) or "Needed a peek" (reduced XP). No pressure; both count toward your streak.',
      },
      {
        type: "fix",
        text: 'Bad "principal" tag removed from problem database — was a data entry error with no matching CP concept.',
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-05-18",
    changes: [
      {
        type: "feat",
        text: "Solve activity heatmap (free) — GitHub-style calendar on your profile showing solve frequency over the past year.",
      },
      {
        type: "feat",
        text: "Average hints stat (free) — profile stats bar now shows your average hints used per solve.",
      },
      {
        type: "feat",
        text: "Export notes as Markdown (now free) — download notes for any problem as a .md file; previously Pro-only.",
      },
      {
        type: "feat",
        text: "Hint history now available to Pro — Pro users see their most recent hint session; Elite sees full history across all sessions.",
      },
      {
        type: "feat",
        text: 'Tag-aware random — "Pick a Problem for Me" now respects the active tag and difficulty filters.',
      },
      {
        type: "feat",
        text: "Report a bug — floating button on every page opens a modal that submits a bug report directly to the team.",
      },
      {
        type: "feat",
        text: "First-time welcome banner — new users with no solves see a contextual welcome card pointing them to hints.",
      },
      {
        type: "feat",
        text: 'Problem page titles — browser tab now shows the problem number and title (e.g. "#42 Two Sum — AlgoPath").',
      },
      {
        type: "fix",
        text: "Stripe plan downgrade grace period — subscriptions on past_due (card retry in progress) no longer immediately revert to free.",
      },
      {
        type: "fix",
        text: 'Profile skill web — duplicate tags (e.g. "Recursion" twice) fixed by normalizing tag case before counting; "linkedlist" now displays as "Linked List".',
      },
      {
        type: "improve",
        text: '"Stuck? Get a hint →" inline link added to the problem card so hints are accessible without scrolling to the footer.',
      },
      {
        type: "improve",
        text: 'Skip confirmation now offers "Too hard — try easier" to automatically fetch a lower-difficulty problem.',
      },
      {
        type: "improve",
        text: '"Skip problem" button changed to outline style for better visibility in the problem footer.',
      },
      {
        type: "improve",
        text: '"Decide for me" intent card now includes a one-line explanation of why to use it over manual browsing.',
      },
      {
        type: "fix",
        text: "Hint session history now shown for Pro (last session) and Elite (full history) — was previously Elite-only in the UI despite the API supporting both.",
      },
      {
        type: "fix",
        text: "Export as Markdown now correctly triggers a download in all browsers (anchor was not attached to DOM before click; revoke was racing the download).",
      },
      {
        type: "fix",
        text: "Browser tab title now updates when a problem is loaded client-side (search result, random, resume) — was only set on hard navigation.",
      },
      {
        type: "improve",
        text: '"Too hard — try easier" option in skip confirmation is now blue to visually distinguish it from the amber skip action.',
      },
    ],
  },
  {
    version: "1.0.9",
    date: "2026-05-18",
    changes: [
      {
        type: "feat",
        text: "Model selection (Pro+) — choose your preferred OpenRouter model for hint generation from the hints panel; preference is saved to your profile.",
      },
      {
        type: "feat",
        text: "Hint style (Elite) — switch between Structured (default), Socratic (question-framed), and Minimal (condensed) hint display from the hints panel.",
      },
      {
        type: "feat",
        text: "Adaptive difficulty (Elite) — toggle in the hints panel; marks your profile for contest-level hint depth.",
      },
      {
        type: "feat",
        text: "Export notes as Markdown (Pro+) — download all notes for a problem as a .md file from the Notes panel.",
      },
      {
        type: "feat",
        text: "Hint history (Elite) — the hints panel shows all past session dates for each problem.",
      },
      {
        type: "feat",
        text: "Insights dashboard (Elite) — /insights shows solve rate by difficulty, avg hints per solve, weak topics, and a 14-day XP trend chart.",
      },
      {
        type: "feat",
        text: "Streak freeze (Pro+) — activate from your profile to absorb one missed day; resets monthly.",
      },
    ],
  },
  {
    version: "1.0.8",
    date: "2026-05-18",
    changes: [
      {
        type: "feat",
        text: "Stripe integration — Pro and Elite plans now have working checkout, webhook handler, and customer portal. Plans are enforced server-side on hints and notes.",
      },
      {
        type: "feat",
        text: "Plan gating — AI code review is Pro/Elite only; free users see a clear upgrade prompt. Notes daily limit (3/day free) now shows an inline message with upgrade link instead of silently failing.",
      },
      {
        type: "improve",
        text: "Pricing page redesign — billing toggle (monthly/yearly), compact tier cards, feature lists aligned below each panel, and current plan highlighted for signed-in users.",
      },
      {
        type: "feat",
        text: "Admin plan tool — /admin/plans lets admins search any user by username or email and update their plan instantly.",
      },
      {
        type: "improve",
        text: "Free plan expanded — drill mode, problem recommendations, and tag-based filtering are now explicitly listed as free features.",
      },
      {
        type: "feat",
        text: "XP gain notification — after marking a problem solved, a rank-colored card shows +XP earned, progress bar to next level, and a Level Up badge when applicable.",
      },
    ],
  },
  {
    version: "1.0.7",
    date: "2026-05-15",
    changes: [
      {
        type: "feat",
        text: "Skill web — profile page now shows a radar chart visualizing tag-level strength across solved problems.",
      },
      {
        type: "feat",
        text: "Drill mode — start a focused session on any tag from the Problems page; problems queue up back-to-back until you stop.",
      },
      {
        type: "improve",
        text: "Bulk hint generation now uses the model router with fallbacks and retry logic — no more silent failures on free models.",
      },
      {
        type: "improve",
        text: "Performance — blocking Supabase fetches moved behind Suspense on key pages; FCP and LCP improved across /profile and /display-problem.",
      },
    ],
  },
  {
    version: "1.0.6",
    date: "2026-05-12",
    changes: [
      {
        type: "feat",
        text: 'Post-solve: "Try this next" card — after marking a problem done, a targeted recommendation appears (same topic, one step harder) with Practice / Pick something else options. Replaces the previous 1.5s auto-load.',
      },
      {
        type: "feat",
        text: "Editorial link — solution panel now shows a direct link to the official editorial when one is available.",
      },
      {
        type: "improve",
        text: '"Pick a Problem for Me" now respects the platform filter — if CF or LC is selected in the filter bar, random picks stay on that platform.',
      },
    ],
  },
  {
    version: "1.0.5",
    date: "2026-05-12",
    changes: [
      {
        type: "feat",
        text: 'Intent screen — practice page now opens with "What do you want to practice today?" offering three fast paths: Decide for me, Practice a topic, or Browse problems.',
      },
      {
        type: "feat",
        text: "Filter bar — platform chips (CF / LC / All), tag input, and difficulty input now sit above the search box for quick browsing.",
      },
      {
        type: "feat",
        text: "Clickable tags — tags on problem cards and the loaded problem are now buttons; clicking one instantly searches problems with that tag.",
      },
      {
        type: "improve",
        text: "Guest access — the practice page is now viewable without an account. Hint 1 is free; hints 2 and 3 prompt sign-in. Mark as Done shows a sign-in CTA instead of being hidden.",
      },
      {
        type: "improve",
        text: 'Onboarding trim — steps 4–6 (goal, language, daily target) are now marked Optional with a "Start practicing →" shortcut that skips straight to the app.',
      },
    ],
  },
  {
    version: "1.0.4",
    date: "2026-05-11",
    changes: [
      {
        type: "improve",
        text: "Difficulty matching overhauled — random and recommended problems now use a ±200 Codeforces rating window instead of coarse Easy/Medium/Hard buckets, giving much better difficulty targeting.",
      },
      {
        type: "fix",
        text: "Recommended problem was going stale when no new candidates were found — it now always refreshes after each solve.",
      },
      {
        type: "improve",
        text: "Landing page demo updated to a dynamic programming problem (Coin Change) to better represent the app's competitive programming focus.",
      },
    ],
  },
  {
    version: "1.0.3",
    date: "2026-05-07",
    changes: [
      {
        type: "improve",
        text: "Landing page updated with dual-audience messaging for both interview prep and competitive programming; recommended problem strip shows CF and LC examples side by side.",
      },
      {
        type: "improve",
        text: "Practice page codebase refactored into focused modules (types, formatting, side-panel) — no user-facing changes, faster future development.",
      },
    ],
  },
  {
    version: "1.0.2",
    date: "2026-05-07",
    changes: [
      {
        type: "feat",
        text: "Admin problem management — full CRUD API for creating, editing, and removing problems from the database.",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-05-07",
    changes: [
      {
        type: "improve",
        text: "Performance — navbar streams independently so page content appears faster; KaTeX stylesheet scoped to the practice page only; homepage is now fully static.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-06",
    changes: [
      {
        type: "feat",
        text: 'Official v1.0 release — streak break detection, PostHog analytics, "Continue where you left off" on the practice page, skip warning, and improved notes system.',
      },
      {
        type: "improve",
        text: "Complete problem viewer redesign with integrated code editor, collapsible sidebar panels, and improved navigation.",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-05-03",
    changes: [
      {
        type: "feat",
        text: "Redesigned landing page — feature sections, live hints demo, AI code review preview, and a closing CTA; focused on getting new users to sign up and start immediately",
      },
      {
        type: "feat",
        text: "Focus system — users can set a practice focus (Interview Prep / Competitive Programming / Both) from the practice page; biases random problem selection toward LeetCode or Codeforces accordingly",
      },
      {
        type: "improve",
        text: "Random problem selection now uses weighted platform bias (3:1) instead of hard filtering — comp programming focus favors Codeforces but still surfaces LeetCode problems occasionally, and vice versa",
      },
      {
        type: "improve",
        text: 'Practice page UX — "Continue where you left off" now appears above the search controls for returning users, and the random problem button is renamed to "Pick a Problem for Me" with a dice icon',
      },
      {
        type: "improve",
        text: "Onboarding flow extended — captures skill level and focus preference, applies both immediately to problem recommendations",
      },
      {
        type: "improve",
        text: "Code editor redesign — improved syntax highlighting theme, dark background, and editor color consistency across the side panel",
      },
      {
        type: "fix",
        text: "Streak reset logic — streak now correctly resets to 0 when a day is missed rather than holding the stale value",
      },
      {
        type: "improve",
        text: "Add-solution admin page now supports per-language code input and shared explanation field with live preview",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-04-30",
    changes: [
      {
        type: "feat",
        text: "Activity page — timestamped log of all solves, problem views, notes, and AI reviews, with filter tabs and per-category counts",
      },
      {
        type: "feat",
        text: "Problem view tracking — each problem visit records first/last viewed and view count; shown below the problem card",
      },
      {
        type: "feat",
        text: "Solve timestamp log — every solve is now recorded in a dedicated table with XP earned and hints used, enabling per-solve history",
      },
      {
        type: "improve",
        text: "timeAgo() utility for human-readable relative timestamps (just now, 3m ago, 2d ago, etc.) used throughout the app",
      },
    ],
  },
  {
    version: "0.6.1",
    date: "2026-04-29",
    changes: [
      {
        type: "improve",
        text: "Code editors (problem viewer + notes) now use Prism.js syntax highlighting with a dark theme overlay — Tab indents 2 spaces, Enter preserves indentation",
      },
      {
        type: "improve",
        text: "Problem viewer panels (Notes, Code Editor, AI Review) moved to fixed side tabs that slide in from the right edge without displacing page content",
      },
      {
        type: "fix",
        text: "LaTeX sub/sup vertical alignment restored — Tailwind preflight was resetting browser defaults for subscript and superscript positioning",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-04-29",
    changes: [
      {
        type: "feat",
        text: "Inbuilt code editor in notes — save code alongside prose notes for any problem",
      },
      { type: "feat", text: "Changelog page (this page)" },
      {
        type: "fix",
        text: "LaTeX symbols (\\ldots, \\le, \\leq, \\geq, Greek letters, arrows, etc.) now render correctly in problem statements",
      },
      {
        type: "improve",
        text: "Notes limits enforced at DB and UI level (title 200, content 10k, code 200k chars)",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-04-29",
    changes: [
      {
        type: "feat",
        text: "Notes saved to Supabase — one-time migration from localStorage, with automatic fallback if table unavailable",
      },
      {
        type: "feat",
        text: "Notes panel on problem display page — quick-create notes linked to the current problem from a slide-out panel",
      },
      {
        type: "feat",
        text: "AI model router — automatically selects best available free OpenRouter model per task type, falls back on rate limits",
      },
      {
        type: "feat",
        text: "Bulk hint generation — admin page can auto-fill AI hints for all problems missing them, with a live progress stream",
      },
      {
        type: "fix",
        text: "Sentry error reporting was silently double-initialising; removed legacy sentry.client.config.ts",
      },
      {
        type: "fix",
        text: "AI hint generation errors now propagate correctly to the SSE stream and Sentry",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-04-19",
    changes: [
      {
        type: "feat",
        text: "Gamification — XP, levels, and streak system for solving problems",
      },
      {
        type: "feat",
        text: "Streak nudge banner in nav when streak is at risk for today",
      },
      {
        type: "improve",
        text: "Mark as Done awards XP based on difficulty and hints used",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-04-15",
    changes: [
      {
        type: "feat",
        text: "AI code review panel — paste your code and chat with an AI mentor about your approach",
      },
      {
        type: "feat",
        text: "Difficulty suggestion — users can suggest a more accurate difficulty rating for any problem",
      },
      {
        type: "feat",
        text: "Problem reports — users can flag issues with problems (wrong difficulty, broken link, etc.)",
      },
      {
        type: "improve",
        text: "Recommendation and AI suggest results are cached to reduce API calls",
      },
      { type: "fix", text: "Report description field is now optional" },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-04-10",
    changes: [
      {
        type: "feat",
        text: "Progressive hints system — reveal up to 3 hints per problem, rate each one",
      },
      {
        type: "feat",
        text: "Solutions panel with syntax-highlighted code in C++, Python, Java, and JavaScript",
      },
      {
        type: "feat",
        text: "AI-powered problem suggest — describe what you want to practice, get matched problems",
      },
      {
        type: "feat",
        text: "User-aware random problem selection based on skill level and solved history",
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-04-01",
    changes: [
      {
        type: "feat",
        text: "Initial launch — search and browse competitive programming problems from Codeforces and LeetCode",
      },
      { type: "feat", text: "Supabase auth (email + OAuth)" },
      {
        type: "feat",
        text: "Problem display with inline statement, difficulty, and tags",
      },
      {
        type: "feat",
        text: "Notes (localStorage) — quick notes tied to problems",
      },
    ],
  },
];
