import { Geist, JetBrains_Mono } from "next/font/google";
import Link from "next/link";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jbmono",
});

// ── Demo content (illustrative — labelled as a sample throughout the UI) ──────
const steps = [
  {
    n: "01",
    title: "Paste the problem",
    body: "Drop a LeetCode, Codeforces, or USACO link. AlgoPath pulls the statement and samples.",
  },
  {
    n: "02",
    title: "Get a nudge, not a spoiler",
    body: "Three hints unlock in order. Each one moves your thinking forward without handing over the answer.",
  },
  {
    n: "03",
    title: "Solve, then get reviewed",
    body: "Write your solution in the editor, run the samples, and get AI feedback on complexity and approach.",
  },
];

const features = [
  {
    name: "guided-hints",
    desc: "Three progressive hints per problem — calibrated to your rating, never the full solution.",
  },
  {
    name: "ai-review",
    desc: "Instant analysis of complexity, correctness, and idiom the moment you submit.",
  },
  {
    name: "sample-runner",
    desc: "Run your code against the problem's sample I/O in C++, Python, Java, or JS.",
  },
  {
    name: "progress",
    desc: "XP, streaks, and a solve heatmap that track your climb across every platform.",
  },
];

const problems = [
  {
    title: "Tree Subtree Sums",
    diff: "1400",
    tone: "text-cyan-400",
    platform: "Codeforces",
    solved: true,
  },
  {
    title: "Coin Change",
    diff: "Medium",
    tone: "text-amber-400",
    platform: "LeetCode",
    solved: false,
  },
  {
    title: "Greedy Intervals",
    diff: "1600",
    tone: "text-amber-400",
    platform: "Codeforces",
    solved: false,
  },
  {
    title: "Cow Gymnastics",
    diff: "Silver",
    tone: "text-cyan-400",
    platform: "USACO",
    solved: true,
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    note: "No card. Fully usable, not a trial.",
    cta: "Start free",
    href: "/auth/signup",
    featured: false,
    feats: [
      "Unlimited problem practice",
      "3 hint sessions / day",
      "Sample test runner",
      "XP, levels & streaks",
      "14-day activity history",
    ],
  },
  {
    name: "Pro",
    price: "$8",
    cadence: "/ mo",
    note: "or $65/yr — save 32%",
    cta: "Go Pro",
    href: "/auth/signup",
    featured: true,
    feats: [
      "Everything in Free",
      "Unlimited hint sessions",
      "Unlimited AI code review",
      "Full history + notes export",
      "Streak freeze (1/mo)",
    ],
  },
  {
    name: "Elite",
    price: "$16",
    cadence: "/ mo",
    note: "or $130/yr — save 32%",
    cta: "Go Elite",
    href: "/auth/signup",
    featured: false,
    feats: [
      "Everything in Pro",
      "Adaptive difficulty hints",
      "Socratic / Minimal styles",
      "Insights dashboard",
      "Priority generation",
    ],
  },
];

function Check() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[3px] shrink-0 text-primary"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Home() {
  return (
    <main
      className={`landing-root ${geist.variable} ${jbMono.variable} relative min-h-screen overflow-hidden`}
    >
      {/* Top hairline */}
      <div
        className="landing-topline pointer-events-none absolute inset-x-0 top-0 h-px"
        aria-hidden="true"
      />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative">
        <div
          className="landing-grid pointer-events-none absolute inset-0 h-[760px]"
          aria-hidden="true"
        />
        <div
          className="landing-aura pointer-events-none absolute inset-0 h-[760px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-20 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-24">
          {/* Left — copy */}
          <div className="flex flex-col items-start">
            <span className="rise inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-[11px] tracking-wide text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              LeetCode · Codeforces · USACO
            </span>

            <h1 className="rise mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Get unstuck
              <br />
              without <span className="text-primary">spoiling the solve.</span>
            </h1>

            <p className="rise mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              AlgoPath gives competitive programmers progressive hints and
              instant AI code review. Learn the idea, then solve it yourself.
            </p>

            <div className="rise mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/signup"
                className="group inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-[0_0_0_1px_oklch(0.66_0.19_255_/_0.4),0_8px_30px_-8px_oklch(0.66_0.19_255_/_0.6)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0"
              >
                Start free
                <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <a
                href="#how"
                className="inline-flex h-11 items-center rounded-md border border-border bg-card/40 px-6 text-[15px] font-medium text-foreground transition-colors duration-150 hover:border-primary/50 hover:bg-card"
              >
                See how it works
              </a>
            </div>

            <p className="rise mt-5 font-mono text-xs text-muted-foreground/80">
              <span className="text-primary">$</span> no setup · no paywall ·
              free forever<span className="caret text-primary">_</span>
            </p>
          </div>

          {/* Right — live hint panel (a real preview of the product UI) */}
          <div className="rise" style={{ animationDelay: "120ms" }}>
            <TerminalPanel title="coin-change · leetcode medium" tag="SAMPLE">
              <div className="px-4 py-3 font-mono text-[12.5px] leading-relaxed">
                <p className="text-muted-foreground">
                  Fewest coins to make{" "}
                  <span className="text-foreground">amount</span> from{" "}
                  <span className="text-foreground">coins[]</span>. Return -1 if
                  impossible.
                </p>
              </div>

              <HintRow
                accent="border-l-primary"
                label="hint 1"
                tag="observation"
                labelTone="text-primary"
              >
                Build the answer from smaller subproblems. If you knew the
                minimum for every amount below the target, how would that help?
              </HintRow>
              <HintRow
                accent="border-l-amber-500"
                label="hint 2"
                tag="direction"
                labelTone="text-amber-400"
              >
                Let <code className="text-foreground">dp[i]</code> be the min
                coins for amount <code className="text-foreground">i</code>.
                Subtract each coin and reuse a solved subproblem.
              </HintRow>
              <HintRow
                accent="border-l-border"
                label="hint 3"
                tag="locked"
                labelTone="text-muted-foreground"
                locked
              >
                Reveal once you&apos;ve spent time on hint 2.
              </HintRow>

              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 font-mono text-[11px] text-muted-foreground/70">
                <span>2 / 3 hints used</span>
                <span className="text-primary/70">solve to unlock →</span>
              </div>
            </TerminalPanel>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead
            kicker="how it works"
            title="From stuck to solved in three steps"
          />
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="group bg-card p-6 transition-colors duration-200 hover:bg-muted"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-semibold text-primary tabular-nums">
                    {s.n}
                  </span>
                  <span className="h-px flex-1 bg-border transition-colors group-hover:bg-primary/40" />
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI code review ─────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead
            kicker="ai code review"
            title="Feedback the moment you submit"
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            {/* Code */}
            <TerminalPanel title="solution.py" tag="PYTHON">
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed text-foreground/90">
                <code>{`def coinChange(coins, amount):
    dp = [float("inf")] * (amount + 1)
    dp[0] = 0
    for i in range(1, amount + 1):
        for c in coins:
            if c <= i:
                dp[i] = min(dp[i], dp[i - c] + 1)
    return dp[amount] if dp[amount] != float("inf") else -1`}</code>
              </pre>
            </TerminalPanel>

            {/* Analysis */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <ReviewRow
                accent="border-l-primary"
                tone="text-primary"
                label="complexity"
              >
                O(n·m) time, O(n) space. Standard bottom-up DP — optimal for
                this approach.
              </ReviewRow>
              <ReviewRow
                accent="border-l-emerald-500"
                tone="text-emerald-400"
                label="strengths"
              >
                Clean recurrence, handles the impossible case, idiomatic
                bottom-up pattern.
              </ReviewRow>
              <ReviewRow
                accent="border-l-amber-500"
                tone="text-amber-400"
                label="consider"
                last
              >
                Inner loop can break early once{" "}
                <code className="font-mono text-foreground">dp[i] == 1</code>. A
                minor win — the solution is already correct.
              </ReviewRow>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features (man-page list) ───────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead
            kicker="capabilities"
            title="Built for people who live in a terminal"
          />
          <div className="mt-12 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {features.map((f) => (
              <div
                key={f.name}
                className="flex flex-col gap-1 px-5 py-4 transition-colors duration-200 hover:bg-muted sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="w-40 shrink-0 font-mono text-sm font-semibold text-primary">
                  {f.name}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recommended problems (terminal table) ──────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead
            kicker="recommended"
            title="A feed tuned to your rating"
          />
          <div className="mt-12 overflow-hidden rounded-xl border border-border bg-card font-mono text-[13px]">
            <div className="grid grid-cols-[1.25rem_1fr_5rem_6.5rem] gap-3 border-b border-border px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground/70">
              <span />
              <span>problem</span>
              <span>diff</span>
              <span className="text-right">platform</span>
            </div>
            {problems.map((p) => (
              <div
                key={p.title}
                className="grid grid-cols-[1.25rem_1fr_5rem_6.5rem] items-center gap-3 border-b border-border px-4 py-3 transition-colors duration-150 last:border-b-0 hover:bg-muted"
              >
                <span
                  className={
                    p.solved ? "text-emerald-400" : "text-muted-foreground/50"
                  }
                >
                  {p.solved ? "●" : "○"}
                </span>
                <span className="truncate text-foreground">{p.title}</span>
                <span className={p.tone}>{p.diff}</span>
                <span className="text-right text-muted-foreground">
                  {p.platform}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead
            kicker="pricing"
            title="Priced by a competitive programmer"
            sub="The free plan is the whole product, not a teaser. Upgrade only when you outgrow the daily caps."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`flex flex-col rounded-xl border bg-card p-6 ${
                  t.featured
                    ? "border-primary/60 shadow-[0_0_0_1px_oklch(0.66_0.19_255_/_0.25),0_20px_60px_-30px_oklch(0.66_0.19_255_/_0.7)]"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {t.name}
                  </span>
                  {t.featured && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-medium text-primary">
                      popular
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-semibold tracking-tight">
                    {t.price}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.cadence}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>

                <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                  {t.feats.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <Check />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={t.href}
                  className={`mt-6 inline-flex h-10 items-center justify-center rounded-md text-sm font-semibold transition-all duration-150 ${
                    t.featured
                      ? "bg-primary text-primary-foreground hover:-translate-y-px"
                      : "border border-border text-foreground hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Payments coming soon.{" "}
            <Link
              href="/pricing"
              className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
            >
              Full comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────────────────── */}
      <section className="relative border-t border-border">
        <div
          className="landing-aura pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Pick a problem.
            <br />
            <span className="text-primary">Get your first hint.</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Interview prep or contest training — start solving smarter in under
            thirty seconds.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-primary px-8 text-[15px] font-semibold text-primary-foreground shadow-[0_0_0_1px_oklch(0.66_0.19_255_/_0.4),0_10px_40px_-10px_oklch(0.66_0.19_255_/_0.7)] transition-transform duration-150 hover:-translate-y-px"
          >
            Start free today →
          </Link>
          <p className="mt-5 font-mono text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

// ── Building blocks ───────────────────────────────────────────────────────
function TerminalPanel({
  title,
  tag,
  children,
}: {
  title: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_80px_-40px_oklch(0_0_0_/_0.9)]">
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-red-500/70" />
          <span className="size-2.5 rounded-full bg-amber-500/70" />
          <span className="size-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <span className="truncate font-mono text-[11.5px] text-muted-foreground">
          {title}
        </span>
        <span className="ml-auto rounded bg-background/60 px-1.5 py-0.5 font-mono text-[9.5px] tracking-widest text-muted-foreground/60">
          {tag}
        </span>
      </div>
      {children}
    </div>
  );
}

function HintRow({
  accent,
  label,
  tag,
  labelTone,
  locked,
  children,
}: {
  accent: string;
  label: string;
  tag: string;
  labelTone: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-b border-l-2 border-border px-4 py-3 ${accent} ${
        locked ? "opacity-50" : ""
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px]">
        <span className={`font-semibold ${labelTone}`}>{label}</span>
        <span className="text-muted-foreground">· {tag}</span>
      </div>
      <p
        className={`text-[12.5px] leading-relaxed ${
          locked ? "italic text-muted-foreground" : "text-foreground/90"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

function ReviewRow({
  accent,
  tone,
  label,
  last,
  children,
}: {
  accent: string;
  tone: string;
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-l-2 px-5 py-4 ${accent} ${
        last ? "" : "border-b border-b-border"
      }`}
    >
      <span className={`font-mono text-[11px] font-semibold ${tone}`}>
        {label}
      </span>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="font-mono text-[12px] text-muted-foreground/70">
        <span className="text-primary/60">{"// "}</span>
        {kicker}
      </span>
      <h2 className="mt-3 text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {sub}
        </p>
      )}
    </div>
  );
}
