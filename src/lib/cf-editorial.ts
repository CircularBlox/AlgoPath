/**
 * Codeforces editorial scraping helpers.
 *
 * Codeforces has no API for tutorial/editorial content — editorials are blog
 * entries (`/blog/entry/NNN`) linked from a contest's "Contest materials"
 * sidebar, and one blog usually covers every problem in the contest. These
 * helpers resolve the blog URL for a problem, fetch the page, slice out the
 * section for the specific problem, and convert the HTML to the lightweight
 * markdown (`**bold**`, `` `code` ``, `$math$`, fenced code) that the app's
 * explanation/FormattedText renderer understands.
 *
 * All functions are pure except {@link fetchCfHtml}, so the parsing can be unit
 * tested without network access.
 */

const CF_ORIGIN = "https://codeforces.com";

export type ContestRef = { contestId: string; index: string };

/** Pulls the contest id + problem index out of a Codeforces problem URL. */
export function parseContestRef(url: string): ContestRef | null {
  const contestForm = url.match(
    /(?:contest|gym)\/(\d+)\/problem\/([A-Za-z0-9]+)/i,
  );
  if (contestForm) {
    return { contestId: contestForm[1], index: contestForm[2].toUpperCase() };
  }
  const problemsetForm = url.match(
    /problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/i,
  );
  if (problemsetForm) {
    return {
      contestId: problemsetForm[1],
      index: problemsetForm[2].toUpperCase(),
    };
  }
  return null;
}

/** True for Codeforces URLs only — used as an SSRF guard before fetching. */
export function isCodeforcesUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("codeforces.com");
  } catch {
    return false;
  }
}

/**
 * Finds the editorial/tutorial blog link inside a problem page's "Contest
 * materials" sidebar. Returns an absolute codeforces.com URL or null.
 */
export function extractEditorialLink(problemPageHtml: string): string | null {
  // The sidebar box is captioned "Contest materials" (or the Russian
  // "Материалы"); collect blog links that appear after that caption.
  const materialsIdx = problemPageHtml.search(
    /Contest materials|Материалы\s+(?:соревнования|раунда)/i,
  );
  const scope =
    materialsIdx === -1
      ? problemPageHtml
      : problemPageHtml.slice(materialsIdx, materialsIdx + 4000);

  const linkRe = /<a[^>]*href="(\/blog\/entry\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const links: { href: string; text: string }[] = [];
  for (const m of scope.matchAll(linkRe)) {
    links.push({ href: m[1], text: stripTags(m[2]).toLowerCase() });
  }
  if (links.length === 0) return null;

  // Prefer a link whose text mentions a tutorial/editorial; else take the first.
  const tutorial = links.find((l) => /tutorial|editorial|разбор/i.test(l.text));
  const chosen = tutorial ?? links[0];
  return `${CF_ORIGIN}${chosen.href}`;
}

/**
 * Extracts the main typography block from a blog entry page. Falls back to the
 * whole document if the wrapper can't be located. The result is then sliced per
 * problem by {@link sliceProblemSection}.
 */
export function extractTypography(blogHtml: string): string {
  const start = blogHtml.indexOf('class="ttypography"');
  if (start === -1) return blogHtml;
  const open = blogHtml.indexOf(">", start) + 1;
  // Cut at the comments section / footer that follows the article body.
  const tail = blogHtml.slice(open);
  const endMarkers = [/id="comments"/i, /class="comment-form"/i, /<\/footer>/i];
  let end = tail.length;
  for (const re of endMarkers) {
    const m = tail.search(re);
    if (m !== -1 && m < end) end = m;
  }
  return tail.slice(0, end);
}

/**
 * Slices the editorial down to the section covering a single problem. Editorials
 * link each problem (e.g. `/contest/123/problem/C`); we cut from this problem's
 * link to the next problem's link. Returns `sliced: false` (and the full text)
 * when the boundaries can't be found.
 */
export function sliceProblemSection(
  typographyHtml: string,
  ref: ContestRef,
  title?: string,
): { html: string; sliced: boolean } {
  // Every link to a problem in this contest, with its position in the HTML.
  const anchorRe = new RegExp(
    `(?:contest|gym)/${ref.contestId}/problem/([A-Za-z0-9]+)|problemset/problem/${ref.contestId}/([A-Za-z0-9]+)`,
    "gi",
  );
  const anchors: { pos: number; index: string }[] = [];
  for (const m of typographyHtml.matchAll(anchorRe)) {
    const idx = (m[1] ?? m[2]).toUpperCase();
    anchors.push({ pos: m.index ?? 0, index: idx });
  }

  let start = anchors.find((a) => a.index === ref.index)?.pos ?? -1;

  // Fallback: locate the section by the problem title text.
  if (start === -1 && title) {
    const t = typographyHtml.toLowerCase().indexOf(title.toLowerCase());
    if (t !== -1) start = t;
  }

  if (start === -1) return { html: typographyHtml, sliced: false };

  // Back up to the start of the enclosing heading/paragraph for a clean cut.
  const tagStart = typographyHtml.lastIndexOf("<", start);
  if (tagStart !== -1 && start - tagStart < 200) start = tagStart;

  // End = the next problem anchor after this one (any index but ours). Cut at
  // the start of its enclosing tag so we don't leave a dangling half-open tag.
  const next = anchors
    .filter((a) => a.pos > start && a.index !== ref.index)
    .sort((a, b) => a.pos - b.pos)[0];
  let end = next ? next.pos : Math.min(typographyHtml.length, start + 20000);
  if (next) {
    const tagOpen = typographyHtml.lastIndexOf("<", next.pos);
    if (tagOpen > start) end = tagOpen;
  }

  return { html: typographyHtml.slice(start, end), sliced: true };
}

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&mdash;": "—",
  "&ndash;": "–",
  "&le;": "≤",
  "&ge;": "≥",
  "&times;": "×",
  "&rarr;": "→",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? e)
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)));
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

// Unlikely-to-collide marker for extracted code blocks (no control chars).
const CODE_TOKEN = (n: number) => `@@CFCODE${n}@@`;

/**
 * Converts a fragment of Codeforces editorial HTML into the lightweight markdown
 * the app renders: fenced code for `<pre>`/spoilers, `**bold**`, `*italic*`,
 * `` `inline code` ``, `- ` lists, and `$math$` (CF uses `$$$…$$$`).
 */
export function htmlToMarkdown(html: string): string {
  const codeBlocks: string[] = [];
  let s = html;

  // Pull <pre> blocks (including spoiler code) out into fenced placeholders so
  // tag-stripping below can't mangle the code.
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner) => {
    const code = decodeEntities(
      stripTags(String(inner).replace(/<br\s*\/?>/gi, "\n")),
    ).replace(/\s+$/g, "");
    const token = CODE_TOKEN(codeBlocks.length);
    codeBlocks.push(`\`\`\`\n${code}\n\`\`\``);
    return `\n${token}\n`;
  });

  // Inline code.
  s = s.replace(
    /<code[^>]*>([\s\S]*?)<\/code>/gi,
    (_m, inner) => "`" + decodeEntities(stripTags(String(inner))).trim() + "`",
  );

  // Spoiler title (e.g. "Tutorial", "Solution") — surface it as a bold line.
  s = s.replace(
    /<b[^>]*class="spoiler-title"[^>]*>([\s\S]*?)<\/b>/gi,
    (_m, inner) => `\n**${stripTags(String(inner)).trim()}**\n`,
  );

  // Block-level tags → newlines; list items → bullets.
  s = s.replace(/<li[^>]*>/gi, "\n- ");
  s = s.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|tr|table)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<h[1-6][^>]*>/gi, "\n### ");

  // Emphasis.
  s = s
    .replace(/<(strong|b)\b[^>]*>/gi, "**")
    .replace(/<\/(strong|b)>/gi, "**");
  s = s.replace(/<(em|i)\b[^>]*>/gi, "*").replace(/<\/(em|i)>/gi, "*");

  // Drop everything else.
  s = stripTags(s);
  s = decodeEntities(s);

  // CF inline math `$$$x$$$` → `$x$` (FormattedText/KaTeX uses single `$`).
  s = s.replace(/\$\$\$/g, "$");

  // Reinsert code blocks.
  s = s.replace(/@@CFCODE(\d+)@@/g, (_m, n) => codeBlocks[Number(n)] ?? "");

  // Tidy whitespace: collapse empty bold, trailing spaces, 3+ blank lines.
  return s
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://codeforces.com/",
};

/**
 * Fetches a Codeforces page with retries. Throws on non-Codeforces URLs (SSRF
 * guard) or after exhausting attempts.
 */
export async function fetchCfHtml(url: string, attempts = 3): Promise<string> {
  if (!isCodeforcesUrl(url)) {
    throw new Error("Only Codeforces URLs are supported.");
  }
  let lastStatus = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(12000),
      });
      if (!resp.ok) {
        lastStatus = resp.status;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      const text = await resp.text();
      if (text.length > 1000) return text;
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error(
    lastStatus
      ? `Codeforces returned HTTP ${lastStatus}.`
      : "Failed to fetch the Codeforces page.",
  );
}
