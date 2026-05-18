import Link from "next/link";
import { Button } from "~/components/ui/button";

const recommendedProblems = [
  {
    number: 1,
    title: "Div. 2 B — Tree Subtree Sums",
    difficulty: "1400",
    platform: "Codeforces",
    status: "unsolved",
    track: "Competitive",
  },
  {
    number: 2,
    title: "Coin Change",
    difficulty: "Medium",
    platform: "LeetCode",
    status: "in-progress",
    track: "Interview Prep",
  },
  {
    number: 3,
    title: "Div. 2 C — Greedy Intervals",
    difficulty: "1600",
    platform: "Codeforces",
    status: "unsolved",
    track: "Competitive",
  },
];

const features = [
  {
    title: "Guided Hints",
    description:
      "Three progressive hints per problem. Works for interview prep and competitive programming — nudges your thinking without spoiling the solution.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2a7 7 0 0 1 7 7c0 2.6-1.4 4.9-3.5 6.2V17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1.8A7 7 0 0 1 12 2z" />
        <path d="M9 21h6M10 17h4" />
      </svg>
    ),
  },
  {
    title: "AI Code Review",
    description:
      "Instant feedback on complexity, correctness, and approach. Learn what works and what to improve.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: "Curated Problems",
    description:
      "LeetCode patterns for FAANG interviews. Codeforces rounds for contest prep. Recommended based on your skill level and focus.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M16 12l-4-4-4 4" />
      </svg>
    ),
  },
  {
    title: "Track Progress",
    description:
      "Watch your rating climb whether you're targeting a FAANG offer or a higher contest rank. Stats on every solve, hint used, and streak maintained.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="flex flex-col">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="dot-grid pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div
          className="hero-glow pointer-events-none absolute inset-0"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 px-6 py-28 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              Interview Prep
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              Competitive Programming
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              Free · LeetCode &amp; Codeforces
            </div>
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Get unstuck. Build
            <br />
            <span className="text-primary text-glow">
              real problem-solving skill.
            </span>
          </h1>

          <p className="max-w-md text-base text-muted-foreground leading-relaxed">
            Whether you&apos;re grinding LeetCode for interviews or pushing your
            Codeforces rating, AlgoPath gives you progressive hints and AI
            feedback that teach — without giving away the answer.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/auth/login">Start for free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/signup">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Recommended Problems ──────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Recommended for you
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Interview prep and contest training, in one place
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {recommendedProblems.map((problem) => (
              <div
                key={problem.number}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm font-bold text-muted-foreground">
                      #{problem.number}
                    </span>
                    <span className="text-sm font-medium">{problem.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        problem.difficulty === "Easy" ||
                        Number(problem.difficulty) < 1300
                          ? "bg-emerald-500/10 text-emerald-400"
                          : problem.difficulty === "Hard" ||
                              Number(problem.difficulty) >= 2000
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {problem.platform}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary/70">
                      {problem.track}
                    </span>
                  </div>
                </div>
                <div>
                  {problem.status === "unsolved" ? (
                    <span className="text-xs text-muted-foreground">
                      Unsolved
                    </span>
                  ) : (
                    <span className="text-xs text-primary">In progress →</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link href="/auth/login">Browse all problems</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Guided Hints in Action ────────────────────────────── */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Guided hints that teach, not spoil
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Progressive hints unlock as you think through the problem. Each
              one nudges your thinking forward without giving away the solution.
            </p>
          </div>

          {/* Problem context */}
          <div className="mb-6 rounded-lg border border-border bg-card px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-sm font-semibold">Coin Change</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-400">
                  Medium
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  LeetCode
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Given coins of denominations{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                coins
              </code>{" "}
              and a target{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                amount
              </code>
              , return the fewest number of coins needed to make up that amount.
              Return{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                -1
              </code>{" "}
              if the amount cannot be made.
            </p>
          </div>

          {/* Hints panel */}
          <div className="flex flex-col gap-3">
            {/* Hint 1 — revealed */}
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  Hint 1
                </span>
                <span className="text-xs text-muted-foreground">
                  observation
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                Think about building the answer from smaller subproblems. If you
                already knew the minimum coins for every amount less than your
                target, how would that help you answer the original question?
              </p>
            </div>

            {/* Hint 2 — revealed */}
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  Hint 2
                </span>
                <span className="text-xs text-muted-foreground">direction</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                Define{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  dp[i]
                </code>{" "}
                as the minimum coins needed for amount{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  i
                </code>
                . For each amount, try subtracting every coin — you're left with
                a subproblem you've already solved. Take the best option.
              </p>
            </div>

            {/* Hint 3 — locked */}
            <div className="rounded-lg border border-dashed border-border bg-card/30 px-4 py-3 opacity-50">
              <div className="mb-2 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  Hint 3
                </span>
                <span className="text-xs text-muted-foreground">locked</span>
              </div>
              <p className="text-sm text-muted-foreground italic">
                Reveal after you've spent time on hint 2
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button asChild size="sm" variant="outline">
              <Link href="/auth/login">Try it yourself</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Instant AI Code Review ────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Instant feedback on your code
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              After you've worked through hints, get AI-powered analysis of your
              solution. Learn what works, what doesn't, and how to improve.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Code snippet */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  Python
                </span>
              </div>
              <pre className="text-xs leading-relaxed overflow-x-auto">
                <code className="text-muted-foreground">{`def coinChange(coins, amount):
  dp = [float('inf')] * (amount + 1)
  dp[0] = 0
  for i in range(1, amount + 1):
    for coin in coins:
      if coin <= i:
        dp[i] = min(dp[i], dp[i - coin] + 1)
  return dp[amount] if dp[amount] != float('inf') else -1`}</code>
              </pre>
            </div>

            {/* AI Review */}
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17l-5-5" />
                  </svg>
                  <span className="text-xs font-semibold text-primary">
                    Complexity
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O(n × m) time, O(n) space — n is amount, m is coins. Standard
                  bottom-up DP, optimal for this approach.
                </p>
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-400"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17l-5-5" />
                  </svg>
                  <span className="text-xs font-semibold text-emerald-400">
                    Strengths
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Clean DP formulation, handles the impossible case correctly,
                  follows the standard bottom-up pattern.
                </p>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-amber-400"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span className="text-xs font-semibold text-amber-400">
                    Consider
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Inner loop could break early once{" "}
                  <code className="rounded bg-muted px-1 font-mono text-xs">
                    dp[i] = 1
                  </code>
                  . Minor optimization — solution is correct and idiomatic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Everything built for learning
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Practice smarter, improve faster.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex size-9 items-center justify-center rounded-md border border-primary/20 bg-primary/5 text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rank Progression ─────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Gamified progression
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Earn XP. Climb the ranks.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every problem you solve earns XP. Harder problems and fewer hints
              mean bigger rewards.
            </p>
          </div>

          {/* Horizontal progression chart */}
          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex min-w-max items-stretch gap-0">
              {[
                {
                  icon: "🌱",
                  title: "Newcomer",
                  color: "#9ca3af",
                  xp: "0",
                  levels: "Lv. 1",
                },
                {
                  icon: "⚡",
                  title: "Apprentice",
                  color: "#f59e0b",
                  xp: "50",
                  levels: "Lv. 2–4",
                },
                {
                  icon: "🔥",
                  title: "Solver",
                  color: "#10b981",
                  xp: "800",
                  levels: "Lv. 5–8",
                },
                {
                  icon: "💡",
                  title: "Coder",
                  color: "#3b82f6",
                  xp: "3.2K",
                  levels: "Lv. 9–12",
                },
                {
                  icon: "🎯",
                  title: "Expert",
                  color: "#8b5cf6",
                  xp: "7.2K",
                  levels: "Lv. 13–17",
                },
                {
                  icon: "⭐",
                  title: "Master",
                  color: "#f97316",
                  xp: "15K",
                  levels: "Lv. 18–22",
                },
                {
                  icon: "👑",
                  title: "Grandmaster",
                  color: "#ef4444",
                  xp: "25.2K",
                  levels: "Lv. 23–27",
                },
                {
                  icon: "🏆",
                  title: "Legendary",
                  color: "#a855f7",
                  xp: "37.5K",
                  levels: "Lv. 28+",
                },
              ].map((rank, i, arr) => (
                <div key={rank.title} className="flex items-center">
                  <div
                    className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-center min-w-[90px]"
                    style={{
                      borderColor: `${rank.color}35`,
                      background: `${rank.color}10`,
                    }}
                  >
                    <span className="text-xl leading-none">{rank.icon}</span>
                    <span
                      className="text-xs font-semibold leading-tight"
                      style={{ color: rank.color }}
                    >
                      {rank.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {rank.levels}
                    </span>
                    <span
                      className="mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-medium leading-none"
                      style={{
                        backgroundColor: `${rank.color}15`,
                        color: rank.color,
                      }}
                    >
                      {rank.xp} XP
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <svg
                      width="20"
                      height="16"
                      viewBox="0 0 20 16"
                      fill="none"
                      className="shrink-0 text-border"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 8h14M11 3l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Grid cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                icon: "🌱",
                title: "Newcomer",
                color: "#9ca3af",
                bg: "rgba(156,163,175,0.08)",
                levels: "Lv. 1",
                xp: "Start here",
              },
              {
                icon: "⚡",
                title: "Apprentice",
                color: "#f59e0b",
                bg: "rgba(245,158,11,0.08)",
                levels: "Lv. 2–4",
                xp: "50 XP",
              },
              {
                icon: "🔥",
                title: "Solver",
                color: "#10b981",
                bg: "rgba(16,185,129,0.08)",
                levels: "Lv. 5–8",
                xp: "800 XP",
              },
              {
                icon: "💡",
                title: "Coder",
                color: "#3b82f6",
                bg: "rgba(59,130,246,0.08)",
                levels: "Lv. 9–12",
                xp: "3,200 XP",
              },
              {
                icon: "🎯",
                title: "Expert",
                color: "#8b5cf6",
                bg: "rgba(139,92,246,0.08)",
                levels: "Lv. 13–17",
                xp: "7,200 XP",
              },
              {
                icon: "⭐",
                title: "Master",
                color: "#f97316",
                bg: "rgba(249,115,22,0.08)",
                levels: "Lv. 18–22",
                xp: "15,050 XP",
              },
              {
                icon: "👑",
                title: "Grandmaster",
                color: "#ef4444",
                bg: "rgba(239,68,68,0.08)",
                levels: "Lv. 23–27",
                xp: "25,200 XP",
              },
              {
                icon: "🏆",
                title: "Legendary",
                color: "#a855f7",
                bg: "rgba(168,85,247,0.08)",
                levels: "Lv. 28+",
                xp: "37,450+ XP",
              },
            ].map((rank) => (
              <div
                key={rank.title}
                className="flex flex-col gap-2.5 rounded-xl border p-4"
                style={{ borderColor: `${rank.color}30`, background: rank.bg }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{rank.icon}</span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-mono"
                    style={{
                      backgroundColor: `${rank.color}15`,
                      color: rank.color,
                    }}
                  >
                    {rank.xp}
                  </span>
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: rank.color }}
                  >
                    {rank.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{rank.levels}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            XP required grows with each tier — consistent practice is the only
            path forward.
          </p>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Pricing
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Built by a competitive programmer.
              <br />
              Priced like one, too.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
              The free plan isn&apos;t a trial — it&apos;s fully usable. We know
              how it feels to be gated out of tools you actually need.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Free
                </p>
                <p className="mt-1.5 text-2xl font-bold">$0</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Forever. No credit card.
                </p>
              </div>
              <div className="h-px bg-border" />
              <ul className="flex flex-col gap-2 text-sm">
                {[
                  "Unlimited problem practice",
                  "3 hint sessions per day",
                  "All 3 hints visible per session",
                  "XP, levels & streaks",
                  "Notes (3/day)",
                  "14-day activity history",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0 text-emerald-400"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="mt-auto rounded-lg border border-border py-2 text-center text-sm font-medium transition-colors hover:bg-muted"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col gap-4 rounded-xl border-2 border-primary bg-card p-5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Most popular
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Pro
                </p>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <p className="text-2xl font-bold">$8</p>
                  <span className="text-xs text-muted-foreground">/ mo</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  or $65/yr — save 32%
                </p>
              </div>
              <div className="h-px bg-border" />
              <ul className="flex flex-col gap-2 text-sm">
                {[
                  "Everything in Free",
                  "Unlimited hint sessions",
                  "Unlimited notes + full history",
                  "Model selection for hints",
                  "Unlimited AI code review",
                  "Streak freeze (1/month)",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="mt-auto rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start Pro
              </Link>
            </div>

            {/* Elite */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Elite
                </p>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <p className="text-2xl font-bold">$16</p>
                  <span className="text-xs text-muted-foreground">/ mo</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  or $130/yr — save 32%
                </p>
              </div>
              <div className="h-px bg-border" />
              <ul className="flex flex-col gap-2 text-sm">
                {[
                  "Everything in Pro",
                  "Adaptive difficulty hints",
                  "Hint style: Socratic / Minimal",
                  "Insights dashboard",
                  "Priority generation",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="mt-auto rounded-lg border border-border py-2 text-center text-sm font-medium transition-colors hover:bg-muted"
              >
                Start Elite
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Payments coming soon.{" "}
            <Link
              href="/pricing"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Full plan comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 overflow-hidden px-6 py-24 text-center">
          <div
            className="hero-glow pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <h2 className="relative text-3xl font-bold tracking-tight">
            Start practicing
            <br />
            <span className="text-primary">in 30 seconds.</span>
          </h2>
          <p className="relative max-w-sm text-muted-foreground">
            No setup. No paywalls. Interview prep or competitive programming —
            pick a problem, get a hint, and actually learn.
          </p>
          <Button asChild size="lg" className="relative">
            <Link href="/auth/login">Start free today</Link>
          </Button>
          <p className="relative text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
