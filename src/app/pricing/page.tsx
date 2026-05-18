import Link from "next/link";
import { Button } from "~/components/ui/button";

type Tier = "free" | "pro" | "elite";
type FeatureValue = boolean | string;

type FeatureRow = {
  category?: string;
  label: string;
  free: FeatureValue;
  pro: FeatureValue;
  elite: FeatureValue;
};

const ROWS: FeatureRow[] = [
  {
    category: "Practice",
    label: "Problem browsing & practice",
    free: true,
    pro: true,
    elite: true,
  },
  {
    label: "LeetCode + Codeforces problems",
    free: true,
    pro: true,
    elite: true,
  },
  {
    label: "XP, levels & rank progression",
    free: true,
    pro: true,
    elite: true,
  },
  { label: "Streak tracking", free: true, pro: true, elite: true },
  { label: "Public profile page", free: true, pro: true, elite: true },

  {
    category: "Hints",
    label: "Hint sessions per day",
    free: "3 / day",
    pro: "Unlimited",
    elite: "Unlimited",
  },
  {
    label: "Hints visible per session",
    free: "All 3",
    pro: "All 3",
    elite: "All 3",
  },
  { label: "Model selection for hints", free: false, pro: true, elite: true },
  {
    label: "Adaptive difficulty (contest-level)",
    free: false,
    pro: false,
    elite: true,
  },
  {
    label: "Hint style (Socratic / Minimal)",
    free: false,
    pro: false,
    elite: true,
  },

  {
    category: "Notes & History",
    label: "Notes per day",
    free: "3 / day",
    pro: "Unlimited",
    elite: "Unlimited",
  },
  { label: "Activity history", free: "14 days", pro: "Full", elite: "Full" },
  {
    label: "Hint history across attempts",
    free: false,
    pro: false,
    elite: true,
  },
  { label: "Export notes as Markdown", free: false, pro: true, elite: true },

  {
    category: "Analysis",
    label: "AI code review",
    free: false,
    pro: "Unlimited",
    elite: "Unlimited",
  },
  {
    label: "Insights dashboard (weak topics, solve rate)",
    free: false,
    pro: false,
    elite: true,
  },

  {
    category: "Perks",
    label: "Streak freeze",
    free: false,
    pro: "1 / month",
    elite: "1 / month",
  },
  { label: "Priority hint generation", free: false, pro: false, elite: true },
];

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto text-primary"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Dash() {
  return (
    <span
      className="mx-auto block h-px w-4 rounded bg-border"
      role="img"
      aria-label="Not included"
    />
  );
}

function Cell({ value, tier }: { value: FeatureValue; tier: Tier }) {
  if (value === true) return <Check />;
  if (value === false) return <Dash />;
  return (
    <span
      className={`text-xs font-medium tabular-nums ${tier === "free" ? "text-muted-foreground" : "text-foreground"}`}
    >
      {value}
    </span>
  );
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          Pricing
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
          Start free. Upgrade when you need more. No dark patterns — the free
          plan is genuinely usable.
        </p>
      </div>

      {/* Tier header cards */}
      <div className="mb-1 grid grid-cols-4 gap-3">
        <div /> {/* spacer for label column */}
        {(
          [
            {
              tier: "Free",
              price: "$0",
              sub: "Forever",
              cta: "Get started",
              href: "/auth/signup",
              variant: "outline" as const,
            },
            {
              tier: "Pro",
              price: "$8",
              sub: "/ mo · $65/yr",
              cta: "Start Pro",
              href: "/auth/signup",
              variant: "default" as const,
              highlight: true,
            },
            {
              tier: "Elite",
              price: "$16",
              sub: "/ mo · $130/yr",
              cta: "Start Elite",
              href: "/auth/signup",
              variant: "outline" as const,
            },
          ] as const
        ).map(({ tier, price, sub, cta, href, variant, highlight }) => (
          <div
            key={tier}
            className={`flex flex-col gap-3 rounded-xl border p-4 text-center ${highlight ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <div>
              <p
                className={`text-xs font-semibold uppercase tracking-widest ${highlight ? "text-primary" : "text-muted-foreground"}`}
              >
                {tier}
              </p>
              <p className="mt-1 text-2xl font-bold">{price}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
            <Button asChild variant={variant} size="sm">
              <Link href={href}>{cta}</Link>
            </Button>
          </div>
        ))}
      </div>

      {/* Feature table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="sr-only">
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Free</th>
              <th scope="col">Pro</th>
              <th scope="col">Elite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map((row, i) => (
              <>
                {row.category && (
                  <tr key={`cat-${row.category}`} className="bg-muted/30">
                    <td
                      colSpan={4}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {row.category}
                    </td>
                  </tr>
                )}
                <tr
                  key={row.label}
                  className={`transition-colors hover:bg-muted/20 ${i % 2 === 0 ? "" : ""}`}
                >
                  <td className="px-4 py-3 text-sm text-foreground/80">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.free} tier="free" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.pro} tier="pro" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.elite} tier="elite" />
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div className="mt-14 border-t border-border pt-10">
        <h2 className="mb-6 text-center text-lg font-semibold">
          Common questions
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              q: "What counts as a hint session?",
              a: "Opening hints on one problem = one session. Reopening the same problem the same day doesn't use another session. Free users get 3 unique problems per day.",
            },
            {
              q: "What happens when I hit the daily limit?",
              a: "Hint 1 stays fully visible. Hints 2 and 3 are blurred with a quiet note. No modal, no countdown — it resets at midnight UTC.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes. No lock-in, no cancellation fees. You keep Pro/Elite features until the end of your billing period.",
            },
            {
              q: "Is my data safe if I downgrade?",
              a: "All your notes, solve history, and streaks are preserved. You lose access to paid features going forward, not your data.",
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
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Check the changelog
        </Link>{" "}
        for updates.
      </p>
    </main>
  );
}
