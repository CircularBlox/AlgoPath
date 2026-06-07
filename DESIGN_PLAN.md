# AlgoPath — Terminal/IDE Redesign Plan (v2)

**Aesthetic direction:** Terminal IDE. True-black, monospace-forward, box-drawing
borders, a full syntax-highlight color system, subtle CRT/grid atmosphere, and
editor-flavored motion. The target feeling is *"a tool a competitive programmer
already uses,"* not *"a startup landing page about competitive programmers."*
Reference point: CPOS, plus the One Dark / Tokyo Night / Dracula color-scheme family.

**Status:** Execute in phase order. Do not bundle later phases into Phase 1.

---

## 0. The One Bug That Has Broken Every Previous Attempt

Cards keep rendering **white**. This is not a styling preference that keeps getting
forgotten — it has a root cause in code, and until the cause is fixed, styling
instructions will not stick.

Root cause:
- `theme-provider.tsx` sets `defaultTheme="light"` and `enableSystem={false}`.
- `layout.tsx` hardcodes `className="dark"` on `<html>`, which `next-themes`
  strips on hydration.
- New visitors therefore fall back to light mode, and any card styled with a
  light/inverted token (`bg-white`, `bg-card` resolving light, `bg-background`
  used as a surface) renders white.

**Fix the cause before touching any card styling.** Hard-lock dark, delete the
theme system, then make every surface token dark. See Phase 1A–1B. After that,
"all cards are dark" becomes structurally true instead of a request that gets
re-violated every iteration.

**Hard rule, repeated everywhere below:** there is no white, near-white, or light
card anywhere on this site. Every panel, card, row, and code block sits on a dark
surface. If a generated style is about to emit a light card background, that is the
bug returning — stop and use the dark surface token.

---

## 1. Color System — the CPOS syntax palette

The site uses a lot of color *on purpose*. The difference between "techy" and
"vibecoded" is not the number of colors — it is whether each color has exactly
one job. This is a syntax-highlighting palette: every hue is a token with a fixed
meaning, used for that meaning only, never decoratively.

Define all of these as CSS variables in `globals.css` (`@theme inline`, no `.dark`
block). Values given as both oklch (preferred, for the token file) and approximate
hex (for reference / Tailwind arbitrary values).

### Base / structure
| Token | oklch | ~hex | Role |
|---|---|---|---|
| `--color-background` | `oklch(0.03 0 0)` | `#080808` | page — true black, reads "terminal" |
| `--color-card` | `oklch(0.055 0.006 285)` | `#0d0d12` | every surface/panel (faint cool tint) |
| `--color-muted` | `oklch(0.09 0.006 285)` | `#141419` | rows, inset fields, hovered states |
| `--color-border` | `oklch(0.17 0.01 285)` | `#26262e` | box-drawing borders — visible, structural |
| `--color-border-bright` | `oklch(0.30 0.02 285)` | `#45454f` | dividers under active headers |
| `--color-foreground` | `oklch(0.95 0 0)` | `#f1f1f1` | primary text |
| `--color-muted-foreground` | `oklch(0.62 0.01 285)` | `#8b8b94` | secondary/body text |
| `--color-dim` | `oklch(0.45 0.01 285)` | `#5c5c63` | metadata, `//` and `$` prefixes |

### Semantic syntax colors — each used ONLY for its role
| Token | ~hex | Role (and nothing else) |
|---|---|---|
| `--color-violet` | `#a78bfa` | **brand / selected / primary.** Logo, section eyebrows (`// how it works`), keywords in code, primary buttons, the focused/selected row. Dominant accent. |
| `--color-cyan` | `#56b6ff` | **numbers / ratings / identifiers.** Every stat figure, CF rating, difficulty number, inline code tokens (`dp[i]`), variable names in code. |
| `--color-green` | `#4ade80` | **success / solved / strings.** Solved dots, passed tests, "strengths", the rating-climb line, connected states, string literals in code. |
| `--color-amber` | `#fbbf24` | **in-progress / caution.** Streaks, "Medium" difficulty, "consider" notes, hint 2 ("direction"), warnings. |
| `--color-rose` | `#fb7185` | **failure / negative.** Failed tests, `WA`, errors, hardest-tier difficulty numbers. |
| `--color-teal` | `#2dd4bf` | **functions / secondary accent.** Function names in code, the "PROBLEM/SAMPLE" pills, sparse secondary highlights. |
| `--color-orange` | `#fb923c` | **constants / numeric literals in code.** Use sparingly, code blocks only. |
| `--color-info` | `#56a3ff` | **Codeforces blue ranks ONLY** (expert/specialist tier). Not a general-purpose accent — it exists solely so the recognized external CF rank-color standard reads correctly. Never use it for app UI; cyan covers numbers/ratings. |

Discipline rules:
- The four hero stat numbers are all **cyan** — not four different colors.
- Difficulty number color is a function of rating: cyan (≤1600) → amber (1700–1999)
  → rose (2000+). LeetCode Easy/Med/Hard maps green/amber/rose.
- Code blocks are syntax-highlighted with this exact palette (keywords violet,
  strings green, numbers/identifiers cyan, functions teal, comments dim) so the
  code matches the site instead of using a default highlighter theme.
- No gradient fills on text. Anywhere. The previous rainbow headline is dead.
- A single de-emphasis floor: nothing functional dimmer than `--color-muted-foreground`.
  The "spoiling the solve" / "Get your first hint" phrases must be readable — solid
  foreground, or violet for emphasis. Never near-black-on-black.

---

## 2. Typography

- **Display headings** (hero H1, section H2s): keep the existing tight grotesk.
  Large, heavy, low letter-spacing. This is the one non-mono element and it's fine.
- **Everything else is monospace** — Geist Mono (wire it in `layout.tsx` via
  `next/font`): nav, stats, table rows, labels, code, metadata, pricing numbers,
  buttons' secondary text. Monospace on data is the single strongest "made for a
  CP programmer" signal.
- Eyebrow labels use a `//` comment prefix in `--color-dim` (`// how it works`,
  `// pricing`, `// capabilities`). The terminal hint line uses a `$` prefix.

---

## 3. Structure & layout (box-drawing, flat panels, density)

Global structural rules, applied in every section:
- **No rounded cards.** Radius is `rounded` (4px) or `rounded-none`. No `rounded-lg`,
  no `rounded-xl`, no pill cards.
- **No drop shadows, no glow blobs, no gradient meshes** as decoration. Depth comes
  from borders, not shadows.
- **Box-drawing panel headers.** Section panels open with a header row styled like
  `┌─ Section Name ─────────────────────┐` — a label flanked by border-rule
  characters (or a `border-b` rule that visually reads the same). Bottom bars read
  like a status line.
- **Flat `border-l-2` rows** replace bordered cards for hints, code-review notes,
  and features. The colored left edge is the indicator; the row has no card fill
  beyond an optional `hover:bg-muted`.
- **Reduced vertical padding.** Landing sections cap at `py-12` (hero/CTA may use
  `py-14`). The page should feel dense, not airy. Density is the aesthetic.

### Atmosphere (honoring "depth, not flat solids" without going vibecoded)
Terminal atmosphere ≠ gradient blobs. Allowed, all subtle:
- A faint **dotted/line grid** behind the hero at very low opacity, violet-tinted,
  like an editor minimap or graph paper. (This is the *only* survivor of the old
  dot-grid — keep it whisper-quiet.)
- An optional 1px **scanline / CRT** overlay at ~2–3% opacity over the whole page.
- A very light **grain/noise** texture on the body to kill flat-black banding.
- Hairline section dividers (`border-border`) between major sections.

Delete entirely: `.hero-glow`, `.text-glow`, the blue glow blob, all emoji UI, and
the entire rank/XP emoji section (both the scroll row and the grid — they read
"mobile game"). Replace rank progression, if needed, with one mono line:
`xp per solve · harder problems + fewer hints = larger reward`.

---

## 4. Motion spec

Concentrate motion into a few orchestrated moments. CSS-first; use the Motion
library only if already present for React. Always gate behind
`@media (prefers-reduced-motion: reduce)` (disable transforms/opacity animation,
keep final state).

### Page-load "boot sequence" (the signature moment)
On first paint, the hero assembles like a terminal printing itself:
- Hero elements reveal in a staggered cascade via `animation-delay` (chip → H1 lines
  → subtitle → buttons → terminal panel), each fading up ~8px over ~400ms.
- The `$ no setup · no paywall · free forever_` line ends in a **blinking block
  cursor** (`_`), CSS `@keyframes` opacity step.
- Inside the hero terminal panel, the hint text **types in** (or, simpler and
  robust: hint rows reveal one-by-one with the left-border drawing down), and the
  `2 / 3 hints used` counter ticks up.

### Scroll-triggered (IntersectionObserver, run once per element)
- **Stat count-up:** `3`, `4`, `3` count from 0 on enter; `∞` fades/pulses in.
- **Card reveals:** "how it works" and capability panels fade-up with a small
  stagger as they enter view.
- **Rating-climb sparkline:** SVG path draws in via `stroke-dashoffset`; the `+340`
  counts up; line is `--color-green`.
- **Streak heatmap:** cells fill left-to-right in amber, fast (≤600ms total).
- **Sample-runner:** `test 1`, `test 2` check off in green sequentially, then
  `test 3` flips to rose `WA` — a tiny narrative.
- **Code-review panel:** the three left borders (violet/green/amber) "scan" in
  top-to-bottom.

### Hover / micro-interactions
- Table & list rows: `hover:bg-muted` + left-border brighten, ~120ms.
- Buttons: subtle border/underline sweep or accent-glow on the primary; no bounce.
- Topic tag marquee (already scrolling): keep it; **pause on hover**; mask edges
  with a fade (already present) so tags don't hard-cut.
- Card "lift" = border brightens to `--color-border-bright`, never a shadow.

Keep it tasteful: one strong load sequence + scroll triggers that *mean* something
(tests passing, rating climbing) beats twitchy hovers everywhere.

---

## Phase order (do not reorder)

### Phase 1 — Foundation + landing page (ship together)
The foundation (1A–1C) and the landing rebuild (1D–1L) are one shippable unit.
Foundation without the landing page is invisible; the landing page without it is
broken.

**1A — Dark lock (root-cause fix).**
- Delete `theme-toggle.tsx`. Gut `theme-provider.tsx` to a passthrough; remove
  `next-themes` (uninstall). Remove `<ThemeProvider>` from `layout.tsx`; hardcode
  `<html lang="en" className="dark">`. Remove the toggle from `navbar.tsx` and from
  settings if present. **Keep `SettingsProvider`** — only the theme provider goes.
- Verify: `grep -r "next-themes\|ThemeToggle" src/` returns nothing; `<html>` is
  permanently `class="dark"`; no white flash on hard refresh.

**1B — Token rebuild.** Replace `@theme inline` with the full palette in §1. Delete
the `.dark {}` block and every light-mode value (`oklch(1 0 0)` etc.) as dead code.
New components use `rounded` / `rounded-none` only — the radius tokens are not an
invitation to large radii.

**1C — Fonts.** Wire `Geist_Mono` (`--font-geist-mono`) in `layout.tsx`; expose as
`font-mono`. Apply mono only within `page.tsx`/`globals.css` this phase; inner pages
are Phase 3.

**1D — Hero.** Delete glow + dot-grid divs and their CSS; delete `text-glow`. Keep
the faint grid atmosphere only (§3). One mono chip `[ LeetCode · Codeforces · USACO ]`.
Headline solid (emphasis phrase in violet, readable). Buttons. `$ … free forever_`
with blinking cursor. Hero terminal panel: box-drawing header
(`── coin-change.md · LeetCode Medium ──`), three `border-l-2` hint rows
(violet / amber / dim-locked), status bar `2 / 3 hints used · solve to unlock`.
Boot-sequence animation per §4.

**1E — Stats strip.** Four figures, all cyan, mono, with count-up on scroll. Thin
column dividers (`border-border`), labels in `--color-muted-foreground`.

**1F — "How it works".** Three flat panels (4px radius, dark surface, border). Big
mono `01/02/03` in violet. Heading readable at rest (the faded-heading bug must not
return). Fade-up stagger on scroll.

**1G — Hint section.** One dark panel, box-drawing header, three `border-l-2` rows
(violet "observation" / amber "direction" / dim "locked"). No rounded cards, no card
fills.

**1H — AI code review.** Two dark panels side by side. Left: code block, box-drawing
`── Python ──` header, syntax-highlighted with the §1 palette. Right: three
`border-l-2` rows — complexity (violet), strengths (green), consider (amber).
Scan-in animation on the left borders.

**1I — Capabilities.** Six dark panels. Mono section tags top-right
(`problem-feed`, `rating-climb`, `sample-runner`, `streak`, `every-judge`). Headings
readable at rest. Problem-feed uses status dots + cyan ratings + amber/green difficulty.
Rating-climb sparkline draws in (green). Sample-runner tests check off (green→rose).
Streak heatmap fills in amber.

**1J — Rank/XP section.** **Delete entirely** (both the scroll row and the grid).
Optional one-line mono replacement only.

**1K — Pricing.** Three dark panels, `rounded` (4px). **No white cards** — Pro is
distinguished by a **violet border + inline mono `[recommended]`** tag, not by
inverting to white. Mono uppercase tiers (`FREE`/`PRO`/`ELITE`), mono cyan prices,
green check rows, `text-xs` lists.

**1L — Closing CTA.** `py-14`, no glow, headline solid and readable (kill the
near-invisible "Get your first hint" — make it violet or foreground).

**Phase 1 verification (all must pass):**
1. `grep -r "next-themes\|ThemeToggle" src/` → empty.
2. `grep -r "hero-glow\|dot-grid\|text-glow" src/` → empty (grid atmosphere is a new
   class if kept).
3. `<html class="dark">` permanent; no white flash on hard refresh.
4. **Zero white/light card backgrounds anywhere** — every panel is `--color-card`.
5. No emoji in UI; rank/XP section deleted (not hidden).
6. No `rounded-lg`/`rounded-xl` on any panel.
7. Every stat/rating/price number is monospace; stat figures are cyan.
8. Hero boot animation runs; reduced-motion disables it cleanly.
9. `pnpm build` passes with zero type errors.

### Phase 2 — Navbar
`h-14` → `h-10`. Mono bold logo. Nav links `text-xs`, `gap-3`. No toggle. Logged-in:
mono stat chip `streak {N}d · Lv.{X}` (render nothing on fetch failure). Keep the
streak banner.

### Phase 3 — Inner pages
`display-problem`, `profile`, `activity`, `insights`, `notes`, `add-problem`,
`add-hints`. Apply the language: dark surfaces only, `rounded`/`rounded-none`, flat
`border-l-2` rows, mono data, the §1 palette. Formalize `--color-stat` (cyan) and
`--color-solved` (green) tokens and use them throughout instead of raw Tailwind
colors.

### Phase 4 — Global sweep
`grep` audits: `rounded-xl|rounded-lg` (justify or kill), `py-20|py-24|py-28`
(cap `py-12`), `text-glow|hero-glow|dot-grid` (zero), UI emoji (remove), and any
`bg-white`/light card surfaces (zero). Code/`<pre>` blocks use the dark code tokens;
update the KaTeX chip to match.

---

## What "done" looks like
A true-black, dense, monospace tool. Box-drawing panels, no white anywhere, a
disciplined rainbow of semantic color where each hue means one thing, a faint grid
+ scanline atmosphere, and a boot-sequence load animation plus scroll triggers that
tell small stories (tests passing, rating climbing). It should be hard to tell apart
from a screenshot of the actual app — because that is the entire point.