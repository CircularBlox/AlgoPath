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
      "Three progressive hints per problem — nudges your thinking without spoiling the solution.",
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
      "Instant feedback on complexity, correctness, and approach — learn what works and what to improve.",
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
      "LeetCode patterns for FAANG interviews. Codeforces rounds for contest prep. Recommended by skill and focus.",
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
      "Stats on every solve, hint used, and streak maintained — whether you're targeting FAANG or a higher CF rating.",
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
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-7 px-6 py-36 text-center">
          <p className="text-xs text-muted-foreground">
            Interview Prep · Competitive Programming · LeetCode &amp; Codeforces
          </p>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Get unstuck. Build
            <br />
            <span className="text-primary">real problem-solving skill.</span>
          </h1>

          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Progressive hints and AI feedback that teach — without giving away
            the answer.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/auth/login">Start for free</Link>
            </Button>
            <Link
              href="/auth/signup"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              See how it works →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Recommended Problems ──────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-8">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Recommended for you
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              Interview prep and contest training, in one place
            </h2>
          </div>

          <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
            {recommendedProblems.map((problem) => (
              <div
                key={problem.number}
                className="flex items-center justify-between gap-4 bg-card px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">
                    {problem.number}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {problem.title}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {problem.platform}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`font-mono text-xs ${
                      problem.difficulty === "Easy" ||
                      Number(problem.difficulty) < 1300
                        ? "text-emerald-400"
                        : problem.difficulty === "Hard" ||
                            Number(problem.difficulty) >= 2000
                          ? "text-red-400"
                          : "text-amber-400"
                    }`}
                  >
                    {problem.difficulty}
                  </span>
                  {problem.status === "in-progress" && (
                    <span className="text-xs text-primary">In progress →</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/login">Browse all problems</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Guided Hints in Action ────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10">
            <h2 className="text-xl font-semibold tracking-tight">
              Guided hints that teach, not spoil
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Each hint nudges your thinking forward without giving away the
              solution.
            </p>
          </div>

          {/* Problem context */}
          <div className="mb-4 rounded-lg border border-border bg-card px-5 py-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Coin Change</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-amber-400">Medium</span>
                <span className="text-xs text-muted-foreground">LeetCode</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Given coins of denominations{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                coins
              </code>{" "}
              and a target{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                amount
              </code>
              , return the fewest number of coins to make up that amount. Return{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                -1
              </code>{" "}
              if impossible.
            </p>
          </div>

          {/* Hints */}
          <div className="flex flex-col gap-2">
            <div className="rounded-lg border border-border px-4 py-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  Hint 1
                </span>
                <span className="text-xs text-muted-foreground">
                  observation
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Think about building the answer from smaller subproblems. If you
                already knew the minimum coins for every amount less than your
                target, how would that help?
              </p>
            </div>

            <div className="rounded-lg border border-border px-4 py-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  Hint 2
                </span>
                <span className="text-xs text-muted-foreground">direction</span>
              </div>
              <p className="text-sm leading-relaxed">
                Define{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  dp[i]
                </code>{" "}
                as the minimum coins for amount{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  i
                </code>
                . For each amount, try subtracting every coin — you&apos;re left
                with a subproblem you&apos;ve already solved.
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-border px-4 py-3.5 opacity-40">
              <div className="mb-2 flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
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
              <p className="text-sm text-muted-foreground">
                Reveal after you&apos;ve spent time on hint 2
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Button asChild size="sm" variant="outline">
              <Link href="/auth/login">Try it yourself</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Instant AI Code Review ────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10">
            <h2 className="text-xl font-semibold tracking-tight">
              Instant feedback on your code
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              After working through hints, get AI-powered analysis of your
              solution.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Code snippet */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  Python
                </span>
              </div>
              <pre className="overflow-x-auto text-xs leading-relaxed">
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
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-border p-4">
                <p className="mb-1.5 text-xs font-semibold text-primary">
                  Complexity
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  O(n × m) time, O(n) space — optimal for this bottom-up DP
                  approach.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="mb-1.5 text-xs font-semibold text-emerald-400">
                  Strengths
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Clean DP formulation, handles the impossible case correctly,
                  follows the standard bottom-up pattern.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="mb-1.5 text-xs font-semibold text-amber-400">
                  Consider
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Inner loop could break early once{" "}
                  <code className="rounded bg-muted px-1 font-mono text-xs">
                    dp[i] = 1
                  </code>
                  . Minor — solution is correct and idiomatic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10">
            <h2 className="text-xl font-semibold tracking-tight">
              Everything built for learning
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Practice smarter, improve faster.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-3 bg-background p-6"
              >
                <div className="text-primary">{feature.icon}</div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────── */}
      <section>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-28 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Start practicing
            <br />
            <span className="text-primary">in 30 seconds.</span>
          </h2>
          <p className="max-w-sm text-muted-foreground">
            No setup. No paywalls. Pick a problem, get a hint, and actually
            learn.
          </p>
          <Button asChild size="lg">
            <Link href="/auth/login">Start free today</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-foreground underline underline-offset-2 transition-colors hover:text-primary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
