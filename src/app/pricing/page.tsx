import Link from "next/link";
import { env } from "~/env";
import { createClient, getUser } from "~/lib/supabase/server";
import { PricingCards } from "./pricing-cards";

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
    label: "Drill mode (tag-based sessions)",
    free: true,
    pro: true,
    elite: true,
  },
  { label: "Problem recommendations", free: true, pro: true, elite: true },
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
      width="15"
      height="15"
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
      className="mx-auto block h-px w-3 rounded bg-border"
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

export default async function PricingPage() {
  const user = await getUser();
  let currentPlan: "free" | "pro" | "elite" = "free";
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle<{ plan: string }>();
    const p = data?.plan;
    if (p === "pro" || p === "elite") currentPlan = p;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          Pricing
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          Built by a competitive programmer, priced for one. The free plan is
          genuinely usable — no dark patterns.
        </p>
      </div>

      {/* Interactive tier cards */}
      <PricingCards
        proMonthlyPriceId={env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null}
        proYearlyPriceId={env.STRIPE_PRO_YEARLY_PRICE_ID ?? null}
        eliteMonthlyPriceId={env.STRIPE_ELITE_MONTHLY_PRICE_ID ?? null}
        eliteYearlyPriceId={env.STRIPE_ELITE_YEARLY_PRICE_ID ?? null}
        currentPlan={user ? currentPlan : null}
      />

      {/* Feature comparison table */}
      <div className="mt-14">
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Full comparison
        </h2>

        {/* Column headers */}
        <div className="mb-1 grid grid-cols-4 gap-0 text-center text-xs font-semibold uppercase tracking-widest">
          <div />
          <div className="py-2 text-muted-foreground">Free</div>
          <div className="py-2 text-primary">Pro</div>
          <div className="py-2 text-muted-foreground">Elite</div>
        </div>

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
                    <tr key={`cat-${row.category}`} className="bg-muted/40">
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                      >
                        {row.category}
                      </td>
                    </tr>
                  )}
                  <tr
                    key={row.label}
                    className={`transition-colors hover:bg-muted/20 ${i % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                  >
                    <td className="px-4 py-2.5 text-sm text-foreground/80">
                      {row.label}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Cell value={row.free} tier="free" />
                    </td>
                    <td className="bg-primary/[0.03] px-4 py-2.5 text-center">
                      <Cell value={row.pro} tier="pro" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Cell value={row.elite} tier="elite" />
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-14 border-t border-border pt-10">
        <h2 className="mb-6 text-center text-base font-semibold">
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
