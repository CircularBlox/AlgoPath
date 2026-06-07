import Link from "next/link";
import { Reveal, SampleRunner, StatNum } from "./landing-fx";

/* ── Terminal/IDE landing — true-black, monospace-forward, box-drawing panels.
   Tokens (§1 palette) live in globals.css; every hue has exactly one job.
   Radius is `rounded` (4px) only. No white cards, no glow, no emoji. ──────────── */

const btnPrimary =
  "inline-flex h-10 items-center gap-2 rounded bg-primary px-5 font-mono text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90";
const btnSecondary =
  "inline-flex h-10 items-center rounded border border-border bg-card px-5 font-mono text-[13px] text-foreground transition-colors hover:border-border-bright hover:bg-muted";
const panel = "rounded border border-border bg-card";

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
const marqueeItems = [0, 1].flatMap((copy) =>
  topics.map((t) => ({ id: `${copy}-${t}`, t })),
);

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
  { title: "Greedy Intervals", diff: "2100", platform: "CF", solved: false },
  { title: "Cow Gymnastics", diff: "Silver", platform: "USACO", solved: true },
];

const tiers = [
  {
    name: "FREE",
    price: "$0",
    cadence: "forever",
    note: "No card. Fully usable, not a trial.",
    cta: "Start free",
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
    name: "PRO",
    price: "$8",
    cadence: "/mo",
    note: "or $65/yr — save 32%",
    cta: "Go Pro",
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
    name: "ELITE",
    price: "$16",
    cadence: "/mo",
    note: "or $130/yr — save 32%",
    cta: "Go Elite",
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

// Syntax-highlighted Python sample — §1 palette: kw=violet, fn=teal, id/num=cyan,
// str=green, op=muted. Stable ids (not index-keyed).
const codeLines: [string, "kw" | "fn" | "id" | "num" | "str" | "op"][][] = [
  [
    ["def ", "kw"],
    ["coinChange", "fn"],
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
    ["float", "fn"],
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
    ["range", "fn"],
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
    ["min", "fn"],
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
    ["float", "fn"],
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
  kw: "text-violet",
  fn: "text-teal",
  id: "text-cyan",
  num: "text-cyan",
  str: "text-green",
  op: "text-muted-foreground",
};

function diffClass(d: string): string {
  if (/^\d+$/.test(d)) {
    const n = Number(d);
    return n >= 2000 ? "text-rose" : n >= 1700 ? "text-amber" : "text-cyan";
  }
  const k = d.toLowerCase();
  if (k === "easy") return "text-green";
  if (k === "medium") return "text-amber";
  if (k === "hard") return "text-rose";
  return "text-cyan";
}

export default function Home() {
  return (
    <main className="landing-root relative min-h-screen overflow-hidden bg-background font-mono text-foreground">
      <div
        className="landing-topline pointer-events-none absolute inset-x-0 top-0 z-30 h-px"
        aria-hidden="true"
      />
      <div
        className="landing-scanlines pointer-events-none absolute inset-0 z-20"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* ── Hero (1D) ────────────────────────────────────────────────────── */}
        <section className="relative">
          <div
            className="landing-grid pointer-events-none absolute inset-0 h-[640px]"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 lg:grid-cols-[1.05fr_1fr]">
            <div className="flex flex-col items-start">
              <span
                className="rise inline-flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground"
                style={{ animationDelay: "0ms" }}
              >
                <span className="text-dim">[</span>
                LeetCode · Codeforces · USACO
                <span className="text-dim">]</span>
              </span>

              <h1
                className="rise mt-6 font-sans text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl"
                style={{ animationDelay: "80ms" }}
              >
                Get unstuck
                <br />
                without <span className="text-violet">spoiling the solve.</span>
              </h1>

              <p
                className="rise mt-5 max-w-md text-[13.5px] leading-relaxed text-muted-foreground"
                style={{ animationDelay: "160ms" }}
              >
                AlgoPath gives competitive programmers progressive hints and
                instant AI code review. Learn the idea, then solve it yourself.
              </p>

              <div
                className="rise mt-8 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "240ms" }}
              >
                <Link href="/auth/signup" className={btnPrimary}>
                  Start free
                  <span aria-hidden="true">→</span>
                </Link>
                <a href="#how" className={btnSecondary}>
                  See how it works
                </a>
              </div>

              <p
                className="rise mt-5 text-xs text-dim"
                style={{ animationDelay: "320ms" }}
              >
                <span className="text-violet">$</span> no setup · no paywall ·
                free forever<span className="caret text-violet">_</span>
              </p>
            </div>

            {/* Hero terminal panel */}
            <div
              className={`rise ${panel}`}
              style={{ animationDelay: "400ms" }}
            >
              <PanelHeader
                title="coin-change.md · LeetCode Medium"
                tag="PROBLEM"
              />
              <div className="px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
                Fewest coins to make <span className="text-cyan">amount</span>{" "}
                from <span className="text-cyan">coins[]</span>. Return{" "}
                <span className="text-cyan">-1</span> if impossible.
              </div>
              <div className="rise" style={{ animationDelay: "560ms" }}>
                <HintRow accent="violet" label="hint 1" tag="observation">
                  Build the answer from smaller subproblems — the minimum for
                  every amount below the target.
                </HintRow>
              </div>
              <div className="rise" style={{ animationDelay: "680ms" }}>
                <HintRow accent="amber" label="hint 2" tag="direction">
                  Let <span className="text-cyan">dp[i]</span> be the min coins
                  for amount <span className="text-cyan">i</span>; reuse solved
                  subproblems.
                </HintRow>
              </div>
              <div className="rise" style={{ animationDelay: "800ms" }}>
                <HintRow accent="dim" label="hint 3" tag="locked" locked>
                  Reveal once you&apos;ve spent time on hint 2.
                </HintRow>
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-dim">
                <span>
                  <span className="text-cyan">2</span> /{" "}
                  <span className="text-cyan">3</span> hints used
                </span>
                <span className="text-violet">solve to unlock →</span>
              </div>
            </div>
          </div>

          {/* Topic ticker */}
          <div className="marquee relative flex overflow-hidden border-y border-border">
            <div className="marquee-track flex shrink-0 items-center gap-2 py-2 pr-2">
              {marqueeItems.map((it) => (
                <span
                  key={it.id}
                  className="inline-flex shrink-0 items-center gap-2 border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  <span className="size-1 rounded-full bg-violet" />
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

        {/* ── Stats strip (1E) ─────────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
            {stats.map((s) => (
              <div key={s.label} className="px-6 py-8 text-center sm:text-left">
                <StatNum
                  value={s.v}
                  className="text-3xl font-semibold tracking-tight tabular-nums text-cyan"
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works (1F) ────────────────────────────────────────────── */}
        <section id="how" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <SectionHead
              kicker="how it works"
              title="From stuck to solved in three steps"
            />
            <Reveal className="mt-10 grid gap-4 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div
                  key={s.n}
                  className={`ri ${panel} p-5`}
                  style={{ "--d": `${i * 70}ms` } as React.CSSProperties}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-semibold tabular-nums text-violet">
                      {s.n}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="mt-4 text-[13px] font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ── Hint section (1G) ────────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <SectionHead
              kicker="guided hints"
              title="Hints that teach, never spoil"
            />
            <Reveal className={`mt-10 ${panel}`}>
              <PanelHeader title="coin-change.md · 3 progressive hints" />
              <div
                className="ri"
                style={{ "--d": "0ms" } as React.CSSProperties}
              >
                <HintRow accent="violet" label="hint 1" tag="observation">
                  Think about building the answer from smaller subproblems. If
                  you knew the minimum coins for every amount below the target,
                  how would that answer the original question?
                </HintRow>
              </div>
              <div
                className="ri"
                style={{ "--d": "80ms" } as React.CSSProperties}
              >
                <HintRow accent="amber" label="hint 2" tag="direction">
                  Define <span className="text-cyan">dp[i]</span> as the minimum
                  coins for amount <span className="text-cyan">i</span>. For
                  each amount, subtract every coin and take the best
                  already-solved subproblem.
                </HintRow>
              </div>
              <div
                className="ri"
                style={{ "--d": "160ms" } as React.CSSProperties}
              >
                <HintRow accent="dim" label="hint 3" tag="locked" locked>
                  Reveal after you&apos;ve spent real time on hint 2.
                </HintRow>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── AI code review (1H) ──────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <SectionHead
              kicker="ai code review"
              title="Feedback the moment you submit"
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
              <div className={panel}>
                <PanelHeader title="solution.py" tag="PYTHON" />
                <pre className="overflow-x-auto px-4 py-4 text-[12.5px] leading-relaxed">
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
              </div>

              <Reveal className={panel}>
                <PanelHeader title="review" tag="AI" />
                <div
                  className="ri"
                  style={{ "--d": "0ms" } as React.CSSProperties}
                >
                  <ReviewRow accent="violet" label="complexity">
                    O(n·m) time, O(n) space. Standard bottom-up DP — optimal for
                    this approach.
                  </ReviewRow>
                </div>
                <div
                  className="ri"
                  style={{ "--d": "100ms" } as React.CSSProperties}
                >
                  <ReviewRow accent="green" label="strengths">
                    Clean recurrence, handles the impossible case, idiomatic
                    bottom-up pattern.
                  </ReviewRow>
                </div>
                <div
                  className="ri"
                  style={{ "--d": "200ms" } as React.CSSProperties}
                >
                  <ReviewRow accent="amber" label="consider" last>
                    Inner loop can break early once{" "}
                    <span className="text-cyan">dp[i] == 1</span>. A minor win —
                    the solution is already correct.
                  </ReviewRow>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Capabilities (1I) ────────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <SectionHead
              kicker="capabilities"
              title="Everything around the solve"
            />
            <Reveal className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Tile
                span="sm:col-span-2"
                name="problem-feed"
                title="A feed tuned to your rating"
              >
                <div className="overflow-hidden rounded border border-border text-[12px]">
                  {problems.map((p) => (
                    <div
                      key={p.title}
                      className="grid grid-cols-[1rem_1fr_3.5rem_3.5rem] items-center gap-2 border-b border-border px-3 py-2 transition-colors last:border-b-0 hover:bg-muted"
                    >
                      <span className={p.solved ? "text-green" : "text-dim"}>
                        {p.solved ? "●" : "○"}
                      </span>
                      <span className="truncate text-foreground">
                        {p.title}
                      </span>
                      <span className={diffClass(p.diff)}>{p.diff}</span>
                      <span className="text-right text-muted-foreground">
                        {p.platform}
                      </span>
                    </div>
                  ))}
                </div>
              </Tile>

              <Tile name="rating-climb" title="Watch it climb">
                <div className="flex items-end justify-between">
                  <Sparkline />
                  <span className="text-sm font-semibold text-green">
                    +<StatNum value="340" />
                  </span>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  XP, streaks, and a solve heatmap track your progress across
                  every judge.
                </p>
              </Tile>

              <Tile name="sample-runner" title="Run the samples">
                <SampleRunner />
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  C++, Python, Java &amp; JS against the sample I/O.
                </p>
              </Tile>

              <Tile name="streak" title="Keep the streak">
                <StreakHeatmap />
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  A 12-day streak and counting — consistency beats cramming.
                </p>
              </Tile>

              <Tile name="every-judge" title="Every judge, one place">
                <div className="flex flex-wrap gap-2">
                  <Chip>LeetCode</Chip>
                  <Chip>Codeforces</Chip>
                  <Chip>USACO</Chip>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  Interview prep and contest training without switching tabs.
                </p>
              </Tile>
            </Reveal>
          </div>
        </section>

        {/* ── XP one-liner (1J replacement) ────────────────────────────────── */}
        <section className="border-t border-border">
          <p className="mx-auto max-w-6xl px-6 py-4 text-center text-xs text-dim">
            <span className="text-violet">$</span> xp per solve · harder
            problems + fewer hints ={" "}
            <span className="text-cyan">larger reward</span>
          </p>
        </section>

        {/* ── Pricing (1K) ─────────────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <SectionHead
              kicker="pricing"
              title="Priced by a competitive programmer"
              sub="The free plan is the whole product, not a teaser. Upgrade only when you outgrow the daily caps."
            />
            <Reveal className="mt-10 grid items-start gap-4 sm:grid-cols-3">
              {tiers.map((t, i) => (
                <PriceCard key={t.name} tier={t} delay={i * 70} />
              ))}
            </Reveal>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Payments coming soon.{" "}
              <Link
                href="/pricing"
                className="text-foreground underline underline-offset-4 transition-colors hover:text-violet"
              >
                Full comparison →
              </Link>
            </p>
          </div>
        </section>

        {/* ── Closing CTA (1L) ─────────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-14 text-center">
            <h2 className="font-sans text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Pick a problem.
              <br />
              <span className="text-violet">Get your first hint.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              Interview prep or contest training — start solving smarter in
              under thirty seconds.
            </p>
            <Link
              href="/auth/signup"
              className={`${btnPrimary} mt-8 h-11 px-7`}
            >
              Start free today →
            </Link>
            <p className="mt-5 text-xs text-dim">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-foreground underline underline-offset-4 transition-colors hover:text-violet"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────
function PanelHeader({ title, tag }: { title: string; tag?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[11px]">
      <span className="text-dim">──</span>
      <span className="whitespace-nowrap text-muted-foreground">{title}</span>
      <span className="h-px flex-1 bg-border" />
      {tag && (
        <span className="border border-border px-1.5 py-0.5 text-[9px] tracking-widest text-teal">
          {tag}
        </span>
      )}
    </div>
  );
}

function HintRow({
  accent,
  label,
  tag,
  locked,
  children,
}: {
  accent: "violet" | "amber" | "dim";
  label: string;
  tag: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  const edge =
    accent === "violet"
      ? "border-l-violet"
      : accent === "amber"
        ? "border-l-amber"
        : "border-l-border";
  const tone =
    accent === "violet"
      ? "text-violet"
      : accent === "amber"
        ? "text-amber"
        : "text-dim";
  return (
    <div
      className={`border-b border-l-2 border-border px-4 py-3 last:border-b-0 ${edge} ${
        locked ? "opacity-60" : ""
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2 text-[11px]">
        <span className={`font-semibold ${tone}`}>{label}</span>
        <span className="text-dim">· {tag}</span>
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
  accent: "violet" | "green" | "amber";
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  const edge =
    accent === "violet"
      ? "border-l-violet"
      : accent === "green"
        ? "border-l-green"
        : "border-l-amber";
  const tone =
    accent === "violet"
      ? "text-violet"
      : accent === "green"
        ? "text-green"
        : "text-amber";
  return (
    <div
      className={`border-l-2 border-border px-4 py-3 ${edge} ${
        last ? "" : "border-b border-b-border"
      }`}
    >
      <span className={`text-[11px] font-semibold ${tone}`}>{label}</span>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
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
    <div className={`ri flex flex-col ${panel} ${span ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] text-dim">{name}</span>
      </div>
      <div className="flex-1 px-4 py-4">{children}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border px-2.5 py-1 text-[11px] text-foreground">
      {children}
    </span>
  );
}

function Sparkline() {
  return (
    <svg
      viewBox="0 0 200 64"
      width="128"
      height="44"
      fill="none"
      className="text-green"
      aria-hidden="true"
    >
      <title>Rating trend</title>
      <polyline
        className="spark"
        points="0,52 28,46 56,50 84,38 112,42 140,26 168,30 200,12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ "--len": "300" } as React.CSSProperties}
      />
      <circle cx="200" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function StreakHeatmap() {
  return (
    <div className="flex flex-wrap gap-1">
      {heat.map((c, i) => (
        <span
          key={c.id}
          className="hcell size-3 rounded-[2px]"
          style={
            {
              "--d": `${i * 22}ms`,
              backgroundColor:
                c.lvl === 0
                  ? "var(--color-border)"
                  : `color-mix(in oklab, var(--color-amber) ${
                      20 + c.lvl * 20
                    }%, transparent)`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
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
      className="mt-[3px] shrink-0 text-green"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PriceCard({
  tier,
  delay,
}: {
  tier: (typeof tiers)[number];
  delay: number;
}) {
  return (
    <div
      className={`ri relative flex h-full flex-col rounded border bg-card p-5 ${
        tier.featured ? "border-violet" : "border-border"
      }`}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest text-muted-foreground">
          {tier.name}
        </span>
        {tier.featured && (
          <span className="border border-violet px-1.5 py-0.5 text-[10px] text-violet">
            [recommended]
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight text-cyan">
          {tier.price}
        </span>
        <span className="text-xs text-muted-foreground">{tier.cadence}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tier.note}</p>

      <ul className="mt-5 flex flex-1 flex-col gap-2 text-xs">
        {tier.feats.map((f) => (
          <li key={f} className="flex items-start gap-2 text-muted-foreground">
            <Check />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/auth/signup"
        className={`mt-6 inline-flex h-10 items-center justify-center rounded text-[13px] font-semibold transition-colors ${
          tier.featured
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border text-foreground hover:border-border-bright hover:bg-muted"
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
      <span className="text-[12px] text-violet">
        <span className="text-dim">{"// "}</span>
        {kicker}
      </span>
      <h2 className="mt-3 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          {sub}
        </p>
      )}
    </div>
  );
}
