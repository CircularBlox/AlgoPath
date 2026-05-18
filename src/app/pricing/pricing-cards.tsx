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
  "3 hint sessions / day",
  "All 3 hints per session",
  "XP, levels & streaks",
  "Public profile page",
  "14-day activity history",
];

const PRO_FEATURES = [
  "Unlimited hint sessions",
  "Unlimited notes",
  "Model selection for hints",
  "Full activity history",
  "AI code review",
  "Streak freeze (1 / mo)",
  "Export notes as Markdown",
];

const ELITE_FEATURES = [
  "Everything in Pro",
  "Priority hint generation",
  "Adaptive difficulty",
  "Socratic / Minimal hint style",
  "Hint history across attempts",
  "Insights dashboard",
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
      <div className="flex items-center justify-center gap-1 rounded-full border border-border bg-muted/40 p-1 w-fit mx-auto">
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            !yearly
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling("yearly")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            yearly
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            −35%
          </span>
        </button>
      </div>

      {/* Tier cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Free */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6 gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Free
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Forever</p>
          </div>

          {currentPlan === "free" ? (
            <Button variant="outline" size="sm" className="w-full" disabled>
              Current plan
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/auth/signup">Get started</Link>
            </Button>
          )}

          <ul className="flex flex-col gap-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <CheckIcon />
                <span className="text-foreground/80">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-xl border border-primary bg-primary/5 p-6 gap-5 shadow-sm">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground whitespace-nowrap">
            Most popular
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Pro
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                {yearly ? "$5.42" : "$8"}
              </span>
              <span className="text-sm text-muted-foreground">/ mo</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
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

          <ul className="flex flex-col gap-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <CheckIcon primary />
                <span className="text-foreground/80">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Elite */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6 gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Elite
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                {yearly ? "$10.83" : "$16"}
              </span>
              <span className="text-sm text-muted-foreground">/ mo</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
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

          <ul className="flex flex-col gap-2">
            {ELITE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <CheckIcon />
                <span className="text-foreground/80">{f}</span>
              </li>
            ))}
          </ul>
        </div>
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
