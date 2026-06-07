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

/* ── ONE STRICT EDITOR THEME (applied to every section) ───────────────────────
   Surfaces  · one dark card: bg-card + border border-border + rounded-xl + p-6.
               inner rows: px-4 py-3. No light / inverted surfaces anywhere.
   Spacing   · 8px scale. Content sections py-20; hero pt-24 pb-20; CTA py-20.
   Type      · Geist display in 3 sizes (L/M/S); JetBrains Mono for all labels,
               code, numbers, and metadata.
   Color     · syntax-theme discipline — each hue has ONE job:
               VIOLET (primary) brand/headings/eyebrows/Pro · CYAN numbers &
               ratings & code idents · MINT success · AMBER caution · ROSE fail.
   ──────────────────────────────────────────────────────────────────────────── */
const DISPLAY_L = "text-4xl font-semibold tracking-tight sm:text-5xl";
const DISPLAY_M = "text-2xl font-semibold tracking-tight sm:text-3xl";
const DISPLAY_S = "text-base font-semibold tracking-tight text-foreground";

const NUM = "text-[var(--syntax-num)]";
const POS = "text-[var(--syntax-pos)]";
const CAUTION = "text-[var(--syntax-caution)]";
const NEG = "text-[var(--syntax-neg)]";
const PREFIX = "text-[var(--syntax-prefix)]";

const topics = [
  "dynamic programming",
  "binary search",
  "graphs",
  "greedy",
  "segment tree",
  "two pointers",
  "number theory",
  "dsu",
  "sliding window",
  "dijkstra",
  "bitmask dp",
  "suffix array",
  "max flow",
  "combinatorics",
];

// Two copies for a seamless marquee loop, each with a stable id (not index-keyed).
const marqueeItems = [0, 1].flatMap((copy) =>
  topics.map((t) => ({ id: `${copy}-${t}`, t })),
);

// Decorative streak heatmap — fixed levels, stable ids. Amber (streak) intensity.
const heat = [
  3, 2, 4, 1, 3, 4, 2, 0, 3, 4, 4, 2, 3, 1, 4, 3, 2, 4, 1, 3, 4,
].map((lvl, i) => ({ id: `cell-${i}`, lvl }));

const stats = [
  { v: "3", label: "progressive hints" },
  { v: "4", label: "runner languages" },
  { v: "3", label: "judges supported" },
  { v: "∞", label: "free practice" },
];

const steps = [
  {
    n: "01",
    title: "Paste the problem",
    body: "Drop a LeetCode, Codeforces, or USACO link. AlgoPath pulls the statement and samples.",
  },
  {
    n: "02",
    title: "Get a nudge, not a spoiler",
    body: "Three hints unlock in order — each moves your thinking forward without handing over the answer.",
  },
  {
    n: "03",
    title: "Solve, then get reviewed",
    body: "Write your solution, run the samples, and get AI feedback on complexity and approach.",
  },
];

const problems = [
  { title: "Tree Subtree Sums", diff: "1400", platform: "CF", solved: true },
  { title: "Coin Change", diff: "Medium", platform: "LC", solved: false },
  { title: "Cow Gymnastics", diff: "Silver", platform: "USACO", solved: true },
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

// Syntax-highlighted Python sample — tokens carry stable ids (not index-keyed).
// kw = keyword (violet) · id = identifier (cyan) · num (cyan) · str (mint) · op (muted)
const codeLines: [string, "kw" | "id" | "num" | "str" | "op"][][] = [
  [
    ["def ", "kw"],
    ["coinChange", "id"],
    ["(", "op"],
    ["coins", "id"],
    [", ", "op"],
    ["amount", "id"],
    ["):", "op"],
  ],
  [
    ["    dp ", "id"],
    ["= ", "op"],
    ["[", "op"],
    ["float", "id"],
    ["(", "op"],
    ['"inf"', "str"],
    [")", "op"],
    ["] ", "op"],
    ["* ", "op"],
    ["(", "op"],
    ["amount ", "id"],
    ["+ ", "op"],
    ["1", "num"],
    [")", "op"],
  ],
  [
    ["    dp", "id"],
    ["[", "op"],
    ["0", "num"],
    ["] ", "op"],
    ["= ", "op"],
    ["0", "num"],
  ],
  [
    ["    ", "op"],
    ["for ", "kw"],
    ["i ", "id"],
    ["in ", "kw"],
    ["range", "id"],
    ["(", "op"],
    ["1", "num"],
    [", ", "op"],
    ["amount ", "id"],
    ["+ ", "op"],
    ["1", "num"],
    ["):", "op"],
  ],
  [
    ["        ", "op"],
    ["for ", "kw"],
    ["c ", "id"],
    ["in ", "kw"],
    ["coins", "id"],
    [":", "op"],
  ],
  [
    ["            ", "op"],
    ["if ", "kw"],
    ["c ", "id"],
    ["<= ", "op"],
    ["i", "id"],
    [":", "op"],
  ],
  [
    ["                dp", "id"],
    ["[", "op"],
    ["i", "id"],
    ["] ", "op"],
    ["= ", "op"],
    ["min", "id"],
    ["(", "op"],
    ["dp", "id"],
    ["[", "op"],
    ["i", "id"],
    ["], ", "op"],
    ["dp", "id"],
    ["[", "op"],
    ["i ", "id"],
    ["- ", "op"],
    ["c", "id"],
    ["] ", "op"],
    ["+ ", "op"],
    ["1", "num"],
    [")", "op"],
  ],
  [
    ["    ", "op"],
    ["return ", "kw"],
    ["dp", "id"],
    ["[", "op"],
    ["amount", "id"],
    ["] ", "op"],
    ["if ", "kw"],
    ["dp", "id"],
    ["[", "op"],
    ["amount", "id"],
    ["] ", "op"],
    ["!= ", "op"],
    ["float", "id"],
    ["(", "op"],
    ['"inf"', "str"],
    [") ", "op"],
    ["else ", "kw"],
    ["-1", "num"],
  ],
];

const CODE = codeLines.map((toks, li) => ({
  id: `l${li}`,
  toks: toks.map(([t, k], ti) => ({ id: `l${li}t${ti}`, t, k })),
}));

const TOKEN_CLASS: Record<string, string> = {
  kw: "text-[var(--syntax-keyword)]",
  id: NUM,
  num: NUM,
  str: "text-[var(--syntax-string)]",
  op: "text-muted-foreground",
};

export default function Home() {
  return (
    <main
      className={`landing-root ${geist.variable} ${jbMono.variable} relative min-h-screen overflow-hidden`}
    >
      <div
        className="landing-topline pointer-events-none absolute inset-x-0 top-0 h-px"
        aria-hidden="true"
      />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative">
        <div
          className="landing-grid pointer-events-none absolute inset-0 h-[780px]"
          aria-hidden="true"
        />
        <div
          className="landing-aura pointer-events-none absolute inset-0 h-[780px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-24 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="flex flex-col items-start">
            <span className="rise inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] tracking-wide text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              LeetCode · Codeforces · USACO
            </span>

            <h1
              className={`rise mt-6 text-balance leading-[1.06] ${DISPLAY_L}`}
            >
              Get unstuck
              <br />
              without <span className="text-primary">spoiling the solve.</span>
            </h1>

            <p className="rise mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              AlgoPath gives competitive programmers progressive hints and
              instant AI code review. Learn the idea, then solve it yourself.
            </p>

            <div className="rise mt-8 flex flex-wrap items-center gap-3">
              <Link href="/auth/signup" className={btnPrimary}>
                Start free
                <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <a href="#how" className={btnSecondary}>
                See how it works
              </a>
            </div>

            <p className="rise mt-5 font-mono text-xs text-muted-foreground">
              <span className={PREFIX}>$</span> no setup · no paywall · free
              forever<span className="caret text-primary">_</span>
            </p>
          </div>

          {/* Live hint panel — a real preview of the product UI */}
          <div className="rise" style={{ animationDelay: "120ms" }}>
            <TerminalPanel title="coin-change.md" tag="PROBLEM">
              <div className="px-4 py-3 font-mono text-[12.5px] leading-relaxed">
                <p className="text-muted-foreground">
                  Fewest coins to make <span className={NUM}>amount</span> from{" "}
                  <span className={NUM}>coins[]</span>. Return{" "}
                  <span className={NUM}>-1</span> if impossible.
                </p>
              </div>

              <HintRow label="hint 1" tag="observation">
                Build the answer from smaller subproblems. If you knew the
                minimum for every amount below the target, how would that help?
              </HintRow>
              <HintRow label="hint 2" tag="direction">
                Let <code className={NUM}>dp[i]</code> be the min coins for
                amount <code className={NUM}>i</code>. Subtract each coin and
                reuse a solved subproblem.
              </HintRow>
              <HintRow label="hint 3" tag="locked" locked>
                Reveal once you&apos;ve spent time on hint 2.
              </HintRow>

              <div className="flex items-center justify-between border-t border-border px-4 py-3 font-mono text-[11px] text-muted-foreground">
                <span>
                  <span className={NUM}>2</span> /{" "}
                  <span className={NUM}>3</span> hints used
                </span>
                <span className="text-primary">solve to unlock →</span>
              </div>
            </TerminalPanel>
          </div>
        </div>

        {/* Topic ticker */}
        <div className="marquee relative flex overflow-hidden border-y border-border py-3">
          <div className="marquee-track flex shrink-0 items-center gap-3 pr-3">
            {marqueeItems.map((it) => (
              <span
                key={it.id}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground"
              >
                <span className="size-1 rounded-full bg-primary" />
                {it.t}
              </span>
            ))}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent"
            aria-hidden="true"
          />
        </div>
      </section>

      {/* ── Stat band ──────────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-10 text-center sm:text-left">
              <div
                className={`font-mono text-3xl font-semibold tracking-tight tabular-nums ${NUM}`}
              >
                {s.v}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead
            kicker="how it works"
            title="From stuck to solved in three steps"
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className={card}>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-semibold tabular-nums text-primary">
                    {s.n}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h3 className={`mt-5 ${DISPLAY_S}`}>{s.title}</h3>
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
          <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <TerminalPanel title="solution.py" tag="PYTHON">
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed">
                <code>
                  {CODE.map((ln) => (
                    <span key={ln.id} className="block whitespace-pre">
                      {ln.toks.map((tk) => (
                        <span key={tk.id} className={TOKEN_CLASS[tk.k]}>
                          {tk.t}
                        </span>
                      ))}
                    </span>
                  ))}
                </code>
              </pre>
            </TerminalPanel>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <ReviewRow accent="info" label="complexity">
                O(n·m) time, O(n) space. Standard bottom-up DP — optimal for
                this approach.
              </ReviewRow>
              <ReviewRow accent="pos" label="strengths">
                Clean recurrence, handles the impossible case, idiomatic
                bottom-up pattern.
              </ReviewRow>
              <ReviewRow accent="caution" label="consider" last>
                Inner loop can break early once{" "}
                <code className={`font-mono ${NUM}`}>dp[i] == 1</code>. A minor
                win — the solution is already correct.
              </ReviewRow>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities (asymmetric bento) ────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead
            kicker="capabilities"
            title="Everything around the solve"
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Problem feed — wide */}
            <Tile
              span="sm:col-span-2"
              name="problem-feed"
              title="A feed tuned to your rating"
            >
              <div className="overflow-hidden rounded-xl border border-border font-mono text-[12px]">
                {problems.map((p) => (
                  <div
                    key={p.title}
                    className="grid grid-cols-[1rem_1fr_4rem_3.5rem] items-center gap-2 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span className={p.solved ? POS : "text-muted-foreground"}>
                      {p.solved ? "●" : "○"}
                    </span>
                    <span className="truncate text-foreground">{p.title}</span>
                    <span className={/^\d+$/.test(p.diff) ? NUM : CAUTION}>
                      {p.diff}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {p.platform}
                    </span>
                  </div>
                ))}
              </div>
            </Tile>

            {/* Rating climb — sparkline */}
            <Tile name="rating-climb" title="Watch it climb">
              <div className="flex items-end justify-between">
                <Sparkline />
                <span className={`font-mono text-sm font-semibold ${POS}`}>
                  +340
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                XP, streaks, and a solve heatmap track your progress across
                every judge.
              </p>
            </Tile>

            {/* Sample runner */}
            <Tile name="sample-runner" title="Run the samples">
              <div className="space-y-1.5 font-mono text-[12px]">
                <RunRow ok label="test 1" time="4ms" />
                <RunRow ok label="test 2" time="3ms" />
                <RunRow label="test 3" time="WA" />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                C++, Python, Java &amp; JS against the problem&apos;s sample
                I/O.
              </p>
            </Tile>

            {/* Streak heatmap */}
            <Tile name="streak" title="Keep the streak">
              <div className="flex flex-wrap gap-1">
                {heat.map((c) => (
                  <span
                    key={c.id}
                    className="size-3 rounded-sm"
                    style={{
                      backgroundColor:
                        c.lvl === 0
                          ? "rgb(167 139 250 / 0.14)"
                          : `rgb(251 191 36 / ${0.2 + c.lvl * 0.2})`,
                    }}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                A 12-day streak and counting — consistency beats cramming.
              </p>
            </Tile>

            {/* Multi-platform */}
            <Tile name="every-judge" title="Every judge, one place">
              <div className="flex flex-wrap gap-2">
                <Chip>LeetCode</Chip>
                <Chip>Codeforces</Chip>
                <Chip>USACO</Chip>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Interview prep and contest training without switching tabs.
              </p>
            </Tile>
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
          <div className="mt-12 grid items-start gap-4 sm:grid-cols-3">
            {tiers.map((t) => (
              <PriceCard key={t.name} tier={t} />
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
        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
          <h2 className={DISPLAY_L}>
            Pick a problem.
            <br />
            <span className="text-primary">Get your first hint.</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Interview prep or contest training — start solving smarter in under
            thirty seconds.
          </p>
          <Link href="/auth/signup" className={`${btnPrimary} mt-8`}>
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

// ── Shared recipes (the only button + card patterns used on the page) ───────
const card =
  "rounded-xl border border-border bg-card p-6 transition-colors duration-200 hover:border-primary/40";
const btnPrimary =
  "group inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-transform duration-150 hover:-translate-y-px active:translate-y-0";
const btnSecondary =
  "inline-flex h-11 items-center rounded-lg border border-border bg-card px-6 text-[15px] font-medium text-foreground transition-colors duration-150 hover:border-primary/50 hover:bg-muted";

// ── Building blocks ─────────────────────────────────────────────────────────
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
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
      {/* Editor chrome: traffic lights · filename tab · language pill */}
      <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[var(--syntax-neg)]" />
          <span className="size-2.5 rounded-full bg-[var(--syntax-caution)]" />
          <span className="size-2.5 rounded-full bg-[var(--syntax-pos)]" />
        </div>
        <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11.5px] text-foreground">
          {title}
        </span>
        <span className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[9.5px] tracking-widest text-muted-foreground">
          {tag}
        </span>
      </div>
      {children}
    </div>
  );
}

function HintRow({
  label,
  tag,
  locked,
  children,
}: {
  label: string;
  tag: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-b border-l-2 border-border px-4 py-3 ${
        locked ? "opacity-60" : "border-l-primary"
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px]">
        <span
          className={`font-semibold ${
            locked ? "text-muted-foreground" : "text-primary"
          }`}
        >
          {label}
        </span>
        <span className="text-muted-foreground">· {tag}</span>
      </div>
      <p
        className={`text-[12.5px] leading-relaxed ${
          locked ? "italic text-muted-foreground" : "text-foreground"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

function ReviewRow({
  accent,
  label,
  last,
  children,
}: {
  accent: "info" | "pos" | "caution";
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  const edge =
    accent === "info"
      ? "border-l-primary"
      : accent === "pos"
        ? "border-l-[var(--syntax-pos)]"
        : "border-l-[var(--syntax-caution)]";
  const tone =
    accent === "info" ? "text-primary" : accent === "pos" ? POS : CAUTION;
  return (
    <div
      className={`border-l-2 px-4 py-3 ${edge} ${
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

function Tile({
  span,
  name,
  title,
  children,
}: {
  span?: string;
  name: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${card} ${span ?? ""}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={DISPLAY_S}>{title}</h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {name}
        </span>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

function RunRow({
  ok,
  label,
  time,
}: {
  ok?: boolean;
  label: string;
  time: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="flex items-center gap-2">
        <span className={ok ? POS : NEG}>{ok ? "✓" : "✗"}</span>
        <span className="text-muted-foreground">{label}</span>
      </span>
      <span className={ok ? "text-muted-foreground" : NEG}>{time}</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-foreground">
      {children}
    </span>
  );
}

function Sparkline() {
  return (
    <svg
      viewBox="0 0 200 64"
      width="124"
      height="44"
      fill="none"
      className="text-[var(--syntax-pos)]"
      aria-hidden="true"
    >
      <title>Rating trend</title>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points="0,52 28,46 56,50 84,38 112,42 140,26 168,30 200,12 200,64 0,64"
        fill="url(#sparkFill)"
      />
      <polyline
        className="spark"
        points="0,52 28,46 56,50 84,38 112,42 140,26 168,30 200,12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ "--len": "300" } as React.CSSProperties}
      />
      <circle cx="200" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}

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
      className={`mt-[3px] shrink-0 ${POS}`}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PriceCard({ tier }: { tier: (typeof tiers)[number] }) {
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border bg-card p-6 ${
        tier.featured ? "border-primary" : "border-border"
      }`}
    >
      {/* Pro gets a violet top-rule, never a white inversion */}
      {tier.featured && (
        <span
          className="absolute inset-x-0 top-0 h-0.5 bg-primary"
          aria-hidden="true"
        />
      )}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {tier.name}
        </span>
        {tier.featured && (
          <span className="rounded-full border border-primary/40 px-2 py-0.5 font-mono text-[10px] font-medium text-primary">
            popular
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className={`font-mono text-3xl font-semibold tracking-tight ${NUM}`}
        >
          {tier.price}
        </span>
        <span className="text-xs text-muted-foreground">{tier.cadence}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tier.note}</p>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
        {tier.feats.map((f) => (
          <li key={f} className="flex items-start gap-2 text-muted-foreground">
            <Check />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={tier.href}
        className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-all duration-150 ${
          tier.featured
            ? "bg-primary text-primary-foreground hover:-translate-y-px"
            : "border border-border text-foreground hover:border-primary/50 hover:bg-muted"
        }`}
      >
        {tier.cta}
      </Link>
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
      <span className="font-mono text-[12px] text-primary">
        <span className={PREFIX}>{"// "}</span>
        {kicker}
      </span>
      <h2 className={`mt-3 text-pretty ${DISPLAY_M}`}>{title}</h2>
      {sub && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {sub}
        </p>
      )}
    </div>
  );
}
