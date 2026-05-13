export type ChangelogEntry = {
  version: string;
  date: string;
  changes: { type: "feat" | "fix" | "improve"; text: string }[];
};

export const CHANGELOG: ChangelogEntry[] = [
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
