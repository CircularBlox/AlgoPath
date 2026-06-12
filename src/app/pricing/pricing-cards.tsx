"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { UpgradeButton } from "./upgrade-button";

type Props = {
  proMonthlyPriceId: string | null;
  proYearlyPriceId: string | null;
  eliteMonthlyPriceId: string | null;
  eliteYearlyPriceId: string | null;
  currentPlan: "free" | "pro" | "elite" | null;
};

const FREE_FEATURES = [
  "LeetCode, Codeforces & USACO problems",
  "3 complete hint sessions / day",
  "All 3 hints visible per session",
  "3 notes / day",
  "Code editor with sample test runner",
  "Codeforces account linking & contests",
  "XP, levels & rank progression",
  "Streak tracking",
  "Drill mode (tag-based sessions)",
  "Problem recommendations",
  "Public profile page",
  "14-day activity history",
];

const PRO_FEATURES = [
  "Unlimited hint sessions",
  "Unlimited notes",
  "Model selection for hints",
  "Full activity history",
  "AI code review",
  "Insights dashboard",
  "Streak freeze (1 / month)",
  "Export notes as Markdown",
];

const ELITE_FEATURES = [
  "Everything in Pro",
  "Priority hint generation",
  "Adaptive difficulty",
  "Socratic / Minimal hint style",
  "Hint history across attempts",
];

export function PricingCards({
  proMonthlyPriceId,
  proYearlyPriceId,
  eliteMonthlyPriceId,
  eliteYearlyPriceId,
  currentPlan,
}: Props) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const yearly = billing === "yearly";

  const proPriceId = yearly ? proYearlyPriceId : proMonthlyPriceId;
  const elitePriceId = yearly ? eliteYearlyPriceId : eliteMonthlyPriceId;

  return (
    <div className="flex flex-col gap-6">
      {/* Billing toggle */}
      <div className="mx-auto flex w-fit items-center gap-1 rounded border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={`rounded px-4 py-1.5 text-xs font-medium transition-all ${
            !yearly
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling("yearly")}
          className={`flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-medium transition-all ${
            yearly
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly
          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
            −35%
          </span>
        </button>
      </div>

      {/* Compact tier cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Free */}
        <div className="flex flex-col gap-4 rounded border border-border bg-card p-5">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Free
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold">$0</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Forever · No credit card
            </p>
          </div>
          {currentPlan === "free" ? (
            <Button variant="outline" size="sm" className="w-full" disabled>
              Current plan
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/auth/signup">Get started free</Link>
            </Button>
          )}
        </div>

        {/* Pro */}
        <div className="relative flex flex-col gap-4 rounded border border-primary bg-primary/5 p-5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-primary/40 bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
            Most popular
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Pro
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold">
                {yearly ? "$5.42" : "$8"}
              </span>
              <span className="text-sm text-muted-foreground">/ mo</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {yearly ? "Billed $65 / year" : "Billed monthly"}
            </p>
          </div>
          {currentPlan === "pro" ? (
            <Button variant="default" size="sm" className="w-full" disabled>
              Current plan
            </Button>
          ) : (
            <UpgradeButton
              priceId={proPriceId}
              label={currentPlan === "elite" ? "Downgrade to Pro" : "Start Pro"}
              variant="default"
              className="w-full"
            />
          )}
        </div>

        {/* Elite */}
        <div className="flex flex-col gap-4 rounded border border-border bg-card p-5">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Elite
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold">
                {yearly ? "$10.83" : "$16"}
              </span>
              <span className="text-sm text-muted-foreground">/ mo</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {yearly ? "Billed $130 / year" : "Billed monthly"}
            </p>
          </div>
          {currentPlan === "elite" ? (
            <Button variant="outline" size="sm" className="w-full" disabled>
              Current plan
            </Button>
          ) : (
            <UpgradeButton
              priceId={elitePriceId}
              label="Start Elite"
              variant="outline"
              className="w-full"
            />
          )}
        </div>
      </div>

      {/* Feature lists aligned under cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Free features */}
        <ul className="flex flex-col gap-2">
          <li className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Included
          </li>
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckIcon />
              <span className="text-foreground/80">{f}</span>
            </li>
          ))}
        </ul>

        {/* Pro features */}
        <ul className="flex flex-col gap-2">
          <li className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            Included
          </li>
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckIcon primary />
              <span className="text-foreground/80">{f}</span>
            </li>
          ))}
        </ul>

        {/* Elite features */}
        <ul className="flex flex-col gap-2">
          <li className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Included
          </li>
          {ELITE_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckIcon />
              <span className="text-foreground/80">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CheckIcon({ primary }: { primary?: boolean }) {
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
      className={`mt-0.5 shrink-0 ${primary ? "text-primary" : "text-muted-foreground"}`}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
