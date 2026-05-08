import Link from "next/link";
import { Button } from "~/components/ui/button";

const recommendedProblems = [
  {
    number: 1,
    title: "Two Sum",
    difficulty: "Easy",
    platform: "LeetCode",
    status: "unsolved",
    track: "Interview Prep",
  },
  {
    number: 2,
    title: "Div. 2 Problem B — Longest Path",
    difficulty: "Medium",
    platform: "Codeforces",
    status: "in-progress",
    track: "Competitive",
  },
  {
    number: 3,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    platform: "LeetCode",
    status: "unsolved",
    track: "Interview Prep",
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
            Whether you&apos;re grinding LeetCode for interviews or pushing
            your Codeforces rating, AlgoPath gives you progressive hints and AI
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
                        problem.difficulty === "Easy"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : problem.difficulty === "Medium"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-red-500/10 text-red-400"
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
              <span className="text-sm font-semibold">Two Sum</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-400">
                  Easy
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  LeetCode
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Given an array of integers{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                nums
              </code>{" "}
              and an integer{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                target
              </code>
              , return indices of the two numbers that add up to{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                target
              </code>
              . Your solution must run faster than O(n²).
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
                As you walk through the array, what information would let you
                instantly know whether you've already seen the complement of the
                current number?
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
                Think about a structure that maps a value to its position. If
                you build it as you go, can a single pass be enough?
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
                <code className="text-muted-foreground">{`def twoSum(nums, target):
  seen = {}
  for i, num in enumerate(nums):
    complement = target - num
    if complement in seen:
      return [seen[complement], i]
    seen[num] = i
  return []`}</code>
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
                  O(n) time, O(n) space — optimal for this problem. Single pass
                  with hash map.
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
                  Clean implementation, correct edge cases, efficient approach.
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
                  Could handle empty input gracefully. Great solution overall.
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
