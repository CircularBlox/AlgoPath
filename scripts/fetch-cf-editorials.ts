#!/usr/bin/env node
// fetch-cf-editorials.ts — fetch Codeforces editorials from YOUR machine (past
// Cloudflare's anti-bot block) using your logged-in browser's cookie, parse
// them with the app's own parser, and write editorial_content + editorial_url
// straight to Supabase. Fully resumable: re-running skips problems that already
// have editorial_content.
//
// Why local: codeforces.com sits behind a Cloudflare "Just a moment" challenge
// that 403s the Vercel server. Your browser already passed it, so we borrow its
// cf_clearance cookie + User-Agent and fetch from your residential IP.
//
// ── One-time setup ──────────────────────────────────────────────────────────
// 1. Open https://codeforces.com in your browser and let the "Just a moment"
//    check finish so you see the real site.
// 2. DevTools → Application → Cookies → https://codeforces.com → copy the value
//    of `cf_clearance` (and `JSESSIONID` if present). DevTools → Console → run
//    `navigator.userAgent` and copy it.
// 3. Add to .env.local (the UA MUST match the browser that got the cookie):
//      CF_COOKIE="cf_clearance=PASTE_HERE"
//      CF_UA="Mozilla/5.0 (… exact UA …) Chrome/120.0.0.0 Safari/537.36"
//    The cookie expires after a while; if a run starts failing, re-copy it and
//    re-run — already-stored problems are skipped.
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
  extractEditorialLink,
  isChallengePage,
  isCodeforcesUrl,
  parseContestRef,
  scrapeEditorial,
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}
// A cookie is only needed to actually fetch — --dry-run just lists the to-do.
if (!CF_COOKIE && !process.argv.includes("--dry-run")) {
  console.error(
    "Missing CF_COOKIE in .env.local — see the setup notes at the top of this file.",
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
const DELAY_MS = Number(getArg("--delay", "1500"));

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FETCH_HEADERS = {
  "User-Agent": CF_UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: CF_COOKIE as string,
  Referer: "https://codeforces.com/",
};

/** Fetch a Codeforces page with the browser cookie. Throws if blocked. */
async function fetchCf(url: string): Promise<string> {
  const resp = await fetch(url, { headers: FETCH_HEADERS });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(
      isChallengePage(text)
        ? `blocked (HTTP ${resp.status}) — cookie likely expired; re-copy cf_clearance`
        : `HTTP ${resp.status}`,
    );
  }
  if (isChallengePage(text)) {
    throw new Error("blocked (anti-bot page) — cookie likely expired; re-copy");
  }
  return text;
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

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i++) {
    const p = todo[i];
    const tag = `#${p.problem_number} ${p.title ?? ""}`.trim();
    try {
      const ref = p.url ? parseContestRef(p.url) : null;
      if (!ref) throw new Error(`unparseable url: ${p.url}`);

      // Resolve the editorial blog URL (stored, else from the problem page).
      let blogUrl =
        p.editorial_url && isCodeforcesUrl(p.editorial_url)
          ? p.editorial_url
          : "";
      if (!blogUrl) {
        const problemHtml = await fetchCf(p.url as string);
        blogUrl = extractEditorialLink(problemHtml) ?? "";
        if (!blogUrl) throw new Error("no editorial link in contest materials");
        await sleep(DELAY_MS);
      }

      // Fetch the blog and parse it with the app's parser (no network in parse).
      const blogHtml = await fetchCf(blogUrl);
      const { editorial_url, sliced, content } = await scrapeEditorial(p, {
        blogHtml,
        override: blogUrl,
      });

      const { error } = await supabase
        .from("problems")
        .update({ editorial_url, editorial_content: content })
        .eq("problem_number", p.problem_number);
      if (error) throw new Error(error.message);

      ok++;
      console.log(
        `✓ ${tag} — ${content.length} chars${sliced ? "" : " (full contest editorial — not sliced)"}`,
      );
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${tag} — ${msg}`);
      // A block almost always means the cookie died; stop early so we don't
      // hammer Cloudflare and rack up failures.
      if (/blocked/.test(msg)) {
        console.error(
          "\nStopping: Codeforces is blocking requests. Re-copy your cf_clearance cookie into CF_COOKIE and run again (finished problems are skipped).",
        );
        break;
      }
    }
    if (i < todo.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone — ${ok} stored, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
