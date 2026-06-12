#!/usr/bin/env node
// import-editorial-solutions.ts — turn a cf-editorials.json (from
// `fetch-cf-editorials.ts --emit-browser` → browser → download) into rows in the
// `solutions` / `solution_codes` tables that the app's problem page reads.
//
// For each entry it parses the editorial HTML with the app's own parser, splits
// it into prose (→ solutions.explanation) and any embedded code blocks
// (→ solution_codes, one per detected language). Many CF editorials are
// prose-only — those get an explanation and no code, which is fine.
//
// Mirrors the /api/admin/save-solution upsert exactly: one solutions row per
// problem_number (problem_name + explanation), code variants keyed by
// (solution_id, language). Safe to re-run; explanations aren't overwritten
// unless --overwrite is passed.
//
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
//   npx tsx scripts/import-editorial-solutions.ts --dry-run
//   npx tsx scripts/import-editorial-solutions.ts                  # default in: scripts/cf-editorials.json
//   npx tsx scripts/import-editorial-solutions.ts --in ~/Downloads/cf-editorials.json
//   npx tsx scripts/import-editorial-solutions.ts --overwrite      # replace existing explanations too

import { existsSync, readFileSync } from "node:fs";
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

const argv = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
};
const IN = getArg("--in", "scripts/cf-editorials.json");
const DRY = argv.includes("--dry-run");
const OVERWRITE = argv.includes("--overwrite");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// The app's solution UI/storage uses these exact display names.
type Lang = "C++" | "Python" | "Java" | "JavaScript";

/** Heuristic language guess for an editorial code block. Defaults to C++. */
function detectLanguage(code: string): Lang {
  const c = code;
  if (/#include|std::|cout\s*<<|cin\s*>>|int\s+main\s*\(/.test(c)) return "C++";
  if (/\bpublic\s+(static\s+)?(class|void)\b|System\.out\./.test(c))
    return "Java";
  if (/console\.log|=>|\bfunction\b|\bconst\b|\blet\b/.test(c))
    return "JavaScript";
  if (/\bdef\s+\w+\s*\(|print\(|^\s*import\s+\w+|:\s*$/m.test(c))
    return "Python";
  return "C++";
}

/**
 * Split editorial markdown into prose + code blocks. Fenced ``` blocks become
 * code (one kept per detected language, longest wins); the rest is explanation.
 */
function splitContent(markdown: string): {
  explanation: string;
  codes: Partial<Record<Lang, string>>;
} {
  const codes: Partial<Record<Lang, string>> = {};
  for (const m of markdown.matchAll(/```[\w+#-]*\n([\s\S]*?)\n```/g)) {
    const code = m[1].trim();
    if (code.length < 20) continue; // skip tiny inline-ish snippets
    const lang = detectLanguage(code);
    if (!codes[lang] || code.length > (codes[lang] as string).length) {
      codes[lang] = code;
    }
  }
  const explanation = markdown
    .replace(/```[\w+#-]*\n[\s\S]*?\n```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { explanation, codes };
}

type Entry = { n?: number; code?: string; html?: string };

async function main() {
  if (!existsSync(IN)) {
    console.error(`Input file not found: ${IN}`);
    process.exit(1);
  }
  let items: Entry[];
  try {
    items = JSON.parse(readFileSync(IN, "utf8"));
  } catch {
    console.error("Could not parse the JSON file.");
    process.exit(1);
  }
  if (!Array.isArray(items)) {
    console.error("Expected a JSON array of { n, code, html }.");
    process.exit(1);
  }

  let wroteExpl = 0;
  let wroteCode = 0;
  const skipped = 0;
  let failed = 0;

  for (const item of items) {
    const n = Number(item.n);
    if (!n || typeof item.html !== "string") {
      failed++;
      continue;
    }

    try {
      const markdown = htmlToMarkdown(extractTypography(item.html));
      const { explanation, codes } = splitContent(markdown);
      const langs = Object.keys(codes) as Lang[];

      // Resolve problem (need problem_name; also validates it exists).
      const { data: problem } = await supabase
        .from("problems")
        .select("title, problem_number")
        .eq("problem_number", n)
        .single();
      if (!problem) {
        failed++;
        console.log(`✗ #${n} — not in problems table`);
        continue;
      }

      const codeSummary = langs.length ? langs.join("+") : "no code";
      if (DRY) {
        console.log(
          `· #${n} ${problem.title} — ${explanation.length} chars expl, ${codeSummary}`,
        );
        continue;
      }

      // Find or create the canonical solutions row (one per problem_number).
      const { data: existing } = await supabase
        .from("solutions")
        .select("id, explanation")
        .eq("problem_number", n)
        .maybeSingle();

      let solutionId: string;
      if (existing) {
        solutionId = existing.id;
        const keepExisting = existing.explanation && !OVERWRITE;
        if (!keepExisting && explanation) {
          const { error } = await supabase
            .from("solutions")
            .update({ explanation })
            .eq("id", solutionId);
          if (error) throw new Error(error.message);
          wroteExpl++;
        }
      } else {
        const { data: created, error } = await supabase
          .from("solutions")
          .insert({
            problem_name: problem.title,
            problem_number: n,
            ...(explanation && { explanation }),
          })
          .select("id")
          .single();
        if (error || !created)
          throw new Error(error?.message ?? "insert failed");
        solutionId = created.id;
        if (explanation) wroteExpl++;
      }

      // Upsert each detected language's code.
      for (const lang of langs) {
        const { error } = await supabase.from("solution_codes").upsert(
          {
            solution_id: solutionId,
            language: lang,
            code: codes[lang],
            problem_number: n,
          },
          { onConflict: "solution_id,language" },
        );
        if (error) throw new Error(error.message);
        wroteCode++;
      }

      console.log(`✓ #${n} ${problem.title} — explanation, ${codeSummary}`);
    } catch (err) {
      failed++;
      console.log(`✗ #${n} — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(
    DRY
      ? `\n(dry run) ${items.length} entries previewed.`
      : `\nDone — ${wroteExpl} explanation(s), ${wroteCode} code block(s), ${skipped} skipped, ${failed} failed.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
