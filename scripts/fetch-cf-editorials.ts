#!/usr/bin/env node
// fetch-cf-editorials.ts — backfill Codeforces editorials into editorial_content.
//
// Codeforces is behind Cloudflare, which binds cf_clearance to the browser's TLS
// fingerprint — so a plain Node fetch is 403'd even with a valid cookie. The
// reliable path runs the fetch loop IN YOUR BROWSER (same session, cookies and
// TLS as the page), then imports the results with Node:
//
//   1. Generate a browser script for the problems still missing editorials:
//        npx tsx scripts/fetch-cf-editorials.ts --emit-browser
//      (respects --limit / --only / --all). Writes scripts/cf-editorials-browser.js.
//   2. Open https://codeforces.com signed in (past the "Just a moment" check),
//      open DevTools → Console, paste the whole generated script, run it. It
//      hits CF's own /data/problemTutorial endpoint for each problem and, when
//      done, downloads cf-editorials.json to your Downloads folder.
//   3. Import that file into the DB (parses with the app's own parser):
//        npx tsx scripts/fetch-cf-editorials.ts --import ~/Downloads/cf-editorials.json
//
// Resumable: --emit-browser only lists problems without editorial_content (unless
// --all), and --import upserts by problem_number so re-imports are safe.
//
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// (No cookie/UA needed — your browser provides the session.)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { extractTypography, htmlToMarkdown } from "../src/lib/codeforces/cf-editorial";

// ── env ──────────────────────────────────────────────────────────────────────
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
const ALL = argv.includes("--all");
const EMIT_BROWSER = argv.includes("--emit-browser");
const IMPORT_FILE = getArg("--import", "");
const BROWSER_OUT = getArg("--browser-out", "scripts/cf-editorials-browser.js");
const MAX_CONTENT = 16000;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Row = {
  problem_number: number;
  title: string | null;
  url: string | null;
  platform: string | null;
  editorial_content: string | null;
};

/** Page past PostgREST's 1000-row cap. */
async function fetchAllProblems(): Promise<Row[]> {
  const out: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("problems")
      .select("problem_number, title, url, platform, editorial_content")
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

/** Codeforces problemCode (e.g. "2233B") from a problem URL. */
function problemCodeFromUrl(url: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/(?:contest|gym)\/(\d+)\/problem\/([A-Za-z0-9]+)/i) ??
    url.match(/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/i);
  return m ? `${m[1]}${m[2].toUpperCase()}` : null;
}

// ── browser script template ──────────────────────────────────────────────────
// Runs in the Codeforces tab's console: same-origin fetch, real session + TLS.
function buildBrowserScript(jobs: { n: number; code: string }[]): string {
  return `// Paste this whole block into the DevTools Console on https://codeforces.com
// (signed in, past the "Just a moment" check). It fetches ${jobs.length} editorial(s)
// and downloads cf-editorials.json. Then import it with:
//   npx tsx scripts/fetch-cf-editorials.ts --import ~/Downloads/cf-editorials.json
(async () => {
  const JOBS = ${JSON.stringify(jobs)};
  const csrf =
    document.querySelector('meta[name="X-Csrf-Token"]')?.getAttribute("content") ||
    (window.Codeforces && Codeforces.csrf && Codeforces.csrf());
  if (!csrf) { console.error("No csrf token on this page — open a normal CF page and retry."); return; }
  const out = [];
  let ok = 0, none = 0, fail = 0;
  for (let i = 0; i < JOBS.length; i++) {
    const { n, code } = JOBS[i];
    try {
      const r = await fetch("/data/problemTutorial?rv=" + Math.random().toString(36).slice(2), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Csrf-Token": csrf,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: new URLSearchParams({ csrf_token: csrf, problemCode: code }).toString(),
        credentials: "include",
      });
      const j = await r.json();
      if (String(j.success) === "true" && j.html) { out.push({ n, code, html: j.html }); ok++; console.log("✓ " + (i+1) + "/" + JOBS.length + " " + code); }
      else { none++; console.log("– " + code + " (no editorial)"); }
    } catch (e) { fail++; console.log("✗ " + code + " — " + (e && e.message)); }
    await new Promise((res) => setTimeout(res, 700));
  }
  const blob = new Blob([JSON.stringify(out)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cf-editorials.json";
  document.body.appendChild(a); a.click(); a.remove();
  console.log("Done — " + ok + " editorials, " + none + " none, " + fail + " failed. Downloaded cf-editorials.json");
})();
`;
}

async function emitBrowser() {
  const all = await fetchAllProblems();
  let rows = all;
  if (ONLY.length) rows = all.filter((p) => ONLY.includes(p.problem_number));
  else if (!ALL) rows = all.filter((p) => !p.editorial_content);
  if (LIMIT > 0) rows = rows.slice(0, LIMIT);

  const jobs: { n: number; code: string }[] = [];
  let skipped = 0;
  for (const p of rows) {
    const code = problemCodeFromUrl(p.url);
    if (code) jobs.push({ n: p.problem_number, code });
    else skipped++;
  }

  if (jobs.length === 0) {
    console.log("Nothing to fetch (all caught up, or no parseable CF URLs).");
    return;
  }
  writeFileSync(BROWSER_OUT, buildBrowserScript(jobs));
  console.log(
    `Wrote ${BROWSER_OUT} for ${jobs.length} problem(s)` +
      (skipped ? ` (skipped ${skipped} with unparseable URLs)` : "") +
      ".\n\nNext:\n" +
      `  1. Open https://codeforces.com signed in (past the Cloudflare check).\n` +
      `  2. DevTools → Console → paste the entire contents of ${BROWSER_OUT} and run it.\n` +
      `  3. It downloads cf-editorials.json — then run:\n` +
      `       npx tsx scripts/fetch-cf-editorials.ts --import ~/Downloads/cf-editorials.json`,
  );
}

async function importFile() {
  if (!existsSync(IMPORT_FILE)) {
    console.error(`File not found: ${IMPORT_FILE}`);
    process.exit(1);
  }
  let items: { n?: number; code?: string; html?: string }[];
  try {
    items = JSON.parse(readFileSync(IMPORT_FILE, "utf8"));
  } catch {
    console.error("Could not parse the JSON file.");
    process.exit(1);
  }
  if (!Array.isArray(items)) {
    console.error("Expected a JSON array of { n, html } objects.");
    process.exit(1);
  }

  let ok = 0;
  let failed = 0;
  for (const item of items) {
    const n = Number(item.n);
    if (!n || typeof item.html !== "string") {
      failed++;
      continue;
    }
    try {
      const content = htmlToMarkdown(extractTypography(item.html)).slice(
        0,
        MAX_CONTENT,
      );
      if (!content.trim()) throw new Error("empty after parse");
      const { error } = await supabase
        .from("problems")
        .update({ editorial_content: content })
        .eq("problem_number", n);
      if (error) throw new Error(error.message);
      ok++;
      console.log(`✓ #${n} — ${content.length} chars`);
    } catch (err) {
      failed++;
      console.log(`✗ #${n} — ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`\nImported ${ok}, failed ${failed}, of ${items.length}.`);
}

async function main() {
  if (IMPORT_FILE) return importFile();
  if (EMIT_BROWSER) return emitBrowser();

  // Default: just show what's missing and how to proceed (direct Node fetch is
  // blocked by Cloudflare's TLS fingerprinting, so we don't attempt it).
  const all = await fetchAllProblems();
  const missing = all.filter((p) => !p.editorial_content).length;
  console.log(
    `Codeforces problems: ${all.length} total, ${missing} missing an editorial.\n\n` +
      "Codeforces is behind Cloudflare, which blocks plain Node fetches even with a\n" +
      "valid cookie (TLS fingerprinting). Use the browser-based flow instead:\n\n" +
      "  npx tsx scripts/fetch-cf-editorials.ts --emit-browser   # then paste into the CF console\n" +
      "  npx tsx scripts/fetch-cf-editorials.ts --import <file>  # load the downloaded JSON\n\n" +
      "Add --limit N / --only 2233 / --all to scope --emit-browser.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
