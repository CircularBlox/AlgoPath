import Link from "next/link";
import { Button } from "~/components/ui/button";
import { getUser } from "~/lib/supabase/server";

const useCases = [
  {
    label: "LeetCode & interview prep",
    desc: "Work through classic algorithm problems with guided hints instead of copy-pasting solutions.",
  },
  {
    label: "Competitive programming",
    desc: "Tackle Codeforces rounds without spoiling yourself — hints nudge your thinking, not your clipboard.",
  },
  {
    label: "Learning algorithms",
    desc: "Build genuine intuition for new problem types. Each hint teaches a concept, not just a solution.",
  },
];

const steps = [
  {
    number: "01",
    title: "Pick a problem",
    description:
      "Search by title, let AI suggest one, or grab a random challenge. Works with LeetCode, Codeforces, or any problem in our library.",
  },
  {
    number: "02",
    title: "Work through it yourself",
    description:
      "Read the problem and push as far as you can before reaching for a hint. Struggle is part of learning.",
  },
  {
    number: "03",
    title: "Unlock hints one by one",
    description:
      "Reveal up to 3 progressive hints at your own pace. Each one nudges you forward without giving the answer.",
  },
];

const features = [
  {
    title: "Progressive Hints",
    description:
      "Three AI-generated hints per problem. Each level goes a step further without handing you the solution.",
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
      "Paste your attempt and get feedback on complexity and correctness. Unlocked after you've seen all three hints.",
    isNew: true,
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
    title: "Skill Rating",
    description:
      "Your rating updates every solve. Fewer hints used means more rating gained — a real incentive to think first.",
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
  {
    title: "Solve History",
    description:
      "Every problem, hint, and rating is saved. Come back to review your thinking and track real improvement over time.",
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
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

export default async function Home() {
  const user = await getUser();

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
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Free · LeetCode · Codeforces · No credit card
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Get unstuck on
            <br />
            <span className="text-primary text-glow">any coding problem.</span>
          </h1>

          <p className="max-w-md text-base text-muted-foreground leading-relaxed">
            AlgoPath gives you AI-powered hints that guide your thinking step by
            step — without spoiling the solution. Whether you're grinding
            LeetCode, preparing for interviews, or learning algorithms from
            scratch.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href={user ? "/display-problem" : "/auth/login"}>
                {user ? "Go to problems" : "Start for free"}
              </Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" size="lg">
                <Link href="/display-problem">Browse problems</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Use cases strip ───────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Works for
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {useCases.map((uc) => (
              <div
                key={uc.label}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
              >
                <span className="text-sm font-semibold text-foreground">
                  {uc.label}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {uc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hint preview ──────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              See it in action
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Here's what it looks like when you get stuck on a classic problem.
            </p>
          </div>

          {/* Problem context */}
          <div className="mb-3 rounded-xl border border-border bg-card px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-sm font-semibold">Two Sum</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
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

          {/* Hint terminal */}
          <div className="overflow-hidden rounded-xl border border-border bg-[oklch(0.09_0_0)]">
            {/* Title bar */}
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <span className="size-3 rounded-full bg-[oklch(0.55_0.2_25)]" />
              <span className="size-3 rounded-full bg-[oklch(0.75_0.15_80)]" />
              <span className="size-3 rounded-full bg-[oklch(0.65_0.18_145)]" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">
                algopath — hint-engine
              </span>
            </div>

            <div className="flex flex-col gap-3 p-5">
              {/* Hint 1 — revealed */}
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-xs text-primary">HINT 1</span>
                  <span className="text-xs text-muted-foreground">
                    · observation
                  </span>
                </div>
                <p className="text-sm leading-relaxed">
                  As you walk through the array, what information would let you
                  instantly know whether you've already seen the complement of
                  the current number?
                </p>
              </div>

              {/* Hint 2 — revealed (dimmed to suggest progression) */}
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-xs text-primary">HINT 2</span>
                  <span className="text-xs text-muted-foreground">
                    · direction
                  </span>
                </div>
                <p className="text-sm leading-relaxed">
                  Think about a structure that maps a value to its position. If
                  you build it as you go, can a single pass be enough?
                </p>
              </div>

              {/* Hint 3 — locked */}
              <div className="rounded-lg border border-dashed border-border px-4 py-3 opacity-40">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    HINT 3
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · locked — reveal when ready
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Unlock after you've given hint 2 a fair shot.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="rounded border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground">
                  reveal hint 3 →
                </span>
                <span className="rounded border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground">
                  rate usefulness
                </span>
                <span className="ml-auto rounded border border-primary/30 bg-primary/5 px-2.5 py-1 font-mono text-xs text-primary">
                  AI code review ↗
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Three steps. No spoilers.
            </p>
          </div>

          <div className="flex flex-col gap-0 divide-y divide-border rounded-xl border border-border overflow-hidden">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-5 bg-card px-6 py-6 transition-colors hover:bg-muted/30"
              >
                <span
                  className="shrink-0 font-mono text-3xl font-bold leading-none text-primary/30 select-none"
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Everything you need to improve
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Built for how competitive programmers actually learn.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative flex flex-col gap-3 rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                {feature.isNew && (
                  <span className="absolute right-4 top-4 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                    New
                  </span>
                )}
                <div className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
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
            Stop googling answers.
            <br />
            <span className="text-primary">Start actually solving.</span>
          </h2>
          <p className="relative max-w-sm text-muted-foreground">
            Free account. No credit card. Works right away with problems you
            already know from LeetCode and Codeforces.
          </p>
          <Button asChild size="lg" className="relative">
            <Link href={user ? "/display-problem" : "/auth/login"}>
              {user ? "Go to problems" : "Create free account"}
            </Link>
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
