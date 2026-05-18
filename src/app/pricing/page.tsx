import Link from "next/link";
import { Button } from "~/components/ui/button";

const FREE_FEATURES = [
  "3 hint sessions per day (all 3 hints per session)",
  "3 notes per day (unlimited reading)",
  "Unlimited problem browsing & practice",
  "LeetCode + Codeforces problems",
  "Streak tracking",
  "XP & rank system",
  "14-day activity history",
  "Public profile page",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited hint sessions",
  "Unlimited notes + full activity history",
  "Model selection for AI hints",
  "Unlimited AI code review",
  "Streak freeze (1/month)",
  "Export notes as Markdown",
  "Priority hint generation",
];

const ELITE_FEATURES = [
  "Everything in Pro",
  "Adaptive difficulty (contest-level hints)",
  "Hint style: Socratic / Structured / Minimal",
  "Hint history across attempts",
  "Insights dashboard (weak topics, solve rate)",
  "Weekly email digest",
  "Queue skip priority",
];

function CheckIcon() {
  return (
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
  );
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          Pricing
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-md mx-auto">
          Start free. Upgrade when you need more. No dark patterns, no hidden
          limits on core practice.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Free */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Free
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Forever free</p>
          </div>
          <Button asChild variant="outline" className="mb-6">
            <Link href="/auth/signup">Get started</Link>
          </Button>
          <ul className="flex flex-col gap-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
            Most popular
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Pro
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$8</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              or $65 / year (save 32%)
            </p>
          </div>
          <Button asChild className="mb-6">
            <Link href="/auth/signup">Start Pro</Link>
          </Button>
          <ul className="flex flex-col gap-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Elite */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Elite
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$16</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              or $130 / year (save 32%)
            </p>
          </div>
          <Button asChild variant="outline" className="mb-6">
            <Link href="/auth/signup">Start Elite</Link>
          </Button>
          <ul className="flex flex-col gap-2.5">
            {ELITE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FAQ row */}
      <div className="mt-16 border-t border-border pt-10">
        <h2 className="mb-6 text-center text-lg font-semibold">
          Common questions
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              q: "What counts as a hint session?",
              a: "Opening hints on one problem = one session. Opening the same problem again on the same day doesn't use another session. Free users get 3 unique problems per day.",
            },
            {
              q: "Do hints 2 & 3 get locked when I hit the cap?",
              a: "Yes — Hint 1 stays visible. Hints 2 and 3 are blurred with a quiet one-line note. No annoying modal, no countdown.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes. No lock-in, no cancellation fees. You keep Pro/Elite features until the end of your billing period.",
            },
            {
              q: "Is my data safe if I downgrade?",
              a: "All your notes, solve history, and streaks are preserved. You just lose access to paid features going forward.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold">{q}</p>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Payments not yet enabled — plans shown reflect upcoming pricing.{" "}
        <Link
          href="/changelog"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Check the changelog
        </Link>{" "}
        for updates.
      </p>
    </main>
  );
}
