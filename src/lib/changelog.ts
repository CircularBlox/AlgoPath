export type ChangelogEntry = {
  version: string;
  date: string;
  changes: { type: "feat" | "fix" | "improve"; text: string }[];
};

export const CHANGELOG: ChangelogEntry[] = [
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
