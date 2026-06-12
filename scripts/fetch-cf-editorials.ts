#!/usr/bin/env node
// fetch-cf-editorials.ts — fetch Codeforces editorials from YOUR machine (past
// Cloudflare's anti-bot block) using your logged-in browser's cookie, and write
// editorial_content straight to Supabase. Fully resumable: re-running skips
// problems that already have editorial_content.
//
// Uses Codeforces' own AJAX endpoint POST /data/problemTutorial, which returns
// exactly one problem's editorial as JSON {public, success, html} — no contest
// blog scraping or section-slicing needed. The `rv` query param is a throwaway
// random nonce (CF's JS generates it; the server doesn't validate it), so this
// script makes its own. The real credentials are your session cookie + the
// page's csrf_token (sent both as a form field and the X-Csrf-Token header).
//
// ── One-time setup ──────────────────────────────────────────────────────────
// 1. Open https://codeforces.com in your browser, signed in, and let the
//    "Just a moment" check finish so you see the real site.
// 2. DevTools → Application → Cookies → https://codeforces.com → copy the whole
//    cookie (at least `cf_clearance` and the session cookie `JSESSIONID`).
//    DevTools → Console → run `navigator.userAgent` and copy it.
// 3. Add to .env.local (the UA MUST match the browser that got the cookie):
//      CF_COOKIE="cf_clearance=…; JSESSIONID=…"
//      CF_UA="Mozilla/5.0 (… exact UA …) Chrome/120.0.0.0 Safari/537.36"
//    The csrf_token is auto-read from a CF page using your cookie. If that ever
//    fails, grab it yourself (DevTools → Network → click a problem's "Tutorial"
//    → the problemTutorial request's `csrf_token` form field) and set CF_CSRF.
//    Cookies expire after a while; if a run starts failing, re-copy and re-run.
//
// ── Run ─────────────────────────────────────────────────────────────────────
//   npx tsx scripts/fetch-cf-editorials.ts --dry-run     # show the to-do list
//   npx tsx scripts/fetch-cf-editorials.ts               # fetch + store missing
//   npx tsx scripts/fetch-cf-editorials.ts --limit 5     # quick test
//   npx tsx scripts/fetch-cf-editorials.ts --only 42,108 # specific problems
//   npx tsx scripts/fetch-cf-editorials.ts --all         # re-scrape everything

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  extractTypography,
  htmlToMarkdown,
  isChallengePage,
  parseContestRef,
} from "../src/lib/cf-editorial";

// ── env ──────────────────────────────────────────────────────────────────────
// Load .env.local into process.env (so `npx tsx` works without --env-file).
function loadEnv(path = ".env.local") {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CF_COOKIE = process.env.CF_COOKIE;
const CF_UA =
  process.env.CF_UA ||
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
let CF_CSRF = process.env.CF_CSRF || "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
};
const LIMIT = Number(getArg("--limit", "0")); // 0 = all
const ONLY = getArg("--only", "")
  .split(",")
  .map((x) => Number.parseInt(x, 10))
  .filter((x) => !Number.isNaN(x));
const ALL = argv.includes("--all"); // re-scrape problems that already have content
const DRY_RUN = argv.includes("--dry-run");
const DELAY_MS = Number(getArg("--delay", "1200"));
const MAX_CONTENT = 16000;

if (!CF_COOKIE && !DRY_RUN) {
  console.error(
    "Missing CF_COOKIE in .env.local — see the setup notes at the top of this file.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomRv = () => Math.random().toString(36).slice(2, 11);

const BASE_HEADERS = {
  "User-Agent": CF_UA,
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: CF_COOKIE as string,
};

/** GET a Codeforces page with the browser cookie. Throws if blocked. */
async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      ...BASE_HEADERS,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: "https://codeforces.com/",
    },
  });
  const text = await resp.text();
  if (!resp.ok || isChallengePage(text)) {
    throw new Error(
      `blocked (HTTP ${resp.status}) — cookie likely expired; re-copy cf_clearance`,
    );
  }
  return text;
}

/** Read the session csrf_token off any CF page (cookie required). */
async function resolveCsrf(): Promise<string> {
  if (CF_CSRF) return CF_CSRF;
  const html = await fetchPage("https://codeforces.com/problemset");
  const m =
    html.match(/X-Csrf-Token"\s+content="([0-9a-f]{32})"/i) ??
    html.match(/csrf_token['"]?\s*[:=]\s*['"]([0-9a-f]{32})['"]/i);
  if (!m) {
    throw new Error(
      "couldn't read csrf_token from the page — set CF_CSRF manually (see setup notes)",
    );
  }
  CF_CSRF = m[1];
  return CF_CSRF;
}

/**
 * Calls POST /data/problemTutorial for one problem (e.g. "2233B") and returns
 * the editorial HTML. Throws "no tutorial" when CF has none, or "blocked" when
 * the anti-bot/cookie fails.
 */
async function fetchTutorialHtml(
  problemCode: string,
  refUrl: string,
): Promise<string> {
  const resp = await fetch(
    `https://codeforces.com/data/problemTutorial?rv=${randomRv()}`,
    {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Csrf-Token": CF_CSRF,
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://codeforces.com",
        Referer: refUrl,
      },
      body: new URLSearchParams({
        csrf_token: CF_CSRF,
        problemCode,
      }).toString(),
    },
  );

  const text = await resp.text();
  if (isChallengePage(text)) {
    throw new Error("blocked (anti-bot) — cookie likely expired; re-copy");
  }
  let json: { success?: unknown; html?: unknown };
  try {
    json = JSON.parse(text);
  } catch {
    // A 403/302 to an HTML page usually means the csrf/cookie is stale.
    throw new Error(
      `blocked or bad csrf (HTTP ${resp.status}) — re-copy cookie/CF_CSRF`,
    );
  }
  if (String(json.success) !== "true" || typeof json.html !== "string") {
    throw new Error("no tutorial available for this problem");
  }
  return json.html;
}

type Row = {
  problem_number: number;
  title: string | null;
  url: string | null;
  platform: string | null;
  editorial_url: string | null;
  editorial_content: string | null;
};

/** Page past PostgREST's 1000-row cap. */
async function fetchAllProblems(): Promise<Row[]> {
  const out: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("problems")
      .select(
        "problem_number, title, url, platform, editorial_url, editorial_content",
      )
      .eq("platform", "codeforces")
      .order("problem_number")
      .range(from, from + PAGE - 1);
    if (error) {
      if (/editorial_content/.test(error.message)) {
        console.error(
          "\nThe editorial_content column doesn't exist yet — run `npx supabase db push` first.",
        );
        process.exit(1);
      }
      throw error;
    }
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function main() {
  const all = await fetchAllProblems();

  let todo = all;
  if (ONLY.length) {
    todo = all.filter((p) => ONLY.includes(p.problem_number));
  } else if (!ALL) {
    todo = all.filter((p) => !p.editorial_content);
  }
  if (LIMIT > 0) todo = todo.slice(0, LIMIT);

  console.log(
    `Codeforces problems: ${all.length} total, ${todo.length} to fetch` +
      (ONLY.length ? ` (--only ${ONLY.join(",")})` : ALL ? " (--all)" : "") +
      ".",
  );
  if (DRY_RUN) {
    for (const p of todo) console.log(`  #${p.problem_number}  ${p.title}`);
    console.log("\n(dry run — nothing fetched or written)");
    return;
  }
  if (todo.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  try {
    await resolveCsrf();
    console.log(`Using csrf_token ${CF_CSRF.slice(0, 8)}… (session).`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  let ok = 0;
  let failed = 0;
  let skipped = 0;
  for (let i = 0; i < todo.length; i++) {
    const p = todo[i];
    const tag = `#${p.problem_number} ${p.title ?? ""}`.trim();
    try {
      const ref = p.url ? parseContestRef(p.url) : null;
      if (!ref) throw new Error(`unparseable url: ${p.url}`);

      const problemCode = `${ref.contestId}${ref.index}`;
      const html = await fetchTutorialHtml(problemCode, p.url as string);

      const content = htmlToMarkdown(extractTypography(html)).slice(
        0,
        MAX_CONTENT,
      );
      if (!content.trim()) throw new Error("empty editorial after parse");

      const { error } = await supabase
        .from("problems")
        .update({ editorial_content: content })
        .eq("problem_number", p.problem_number);
      if (error) throw new Error(error.message);

      ok++;
      console.log(`✓ ${tag} — ${content.length} chars`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no tutorial/.test(msg)) {
        skipped++;
        console.log(`– ${tag} — no editorial`);
      } else {
        failed++;
        console.log(`✗ ${tag} — ${msg}`);
        // A block almost always means the cookie/csrf died; stop early so we
        // don't hammer Cloudflare and rack up failures.
        if (/blocked|bad csrf/.test(msg)) {
          console.error(
            "\nStopping: Codeforces is blocking requests. Re-copy your cf_clearance cookie (and CF_CSRF if set) and run again — finished problems are skipped.",
          );
          break;
        }
      }
    }
    if (i < todo.length - 1) await sleep(DELAY_MS);
  }

  console.log(
    `\nDone — ${ok} stored, ${skipped} no editorial, ${failed} failed.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
