#!/usr/bin/env node
// gen-hints-ollama.mjs — generate hints for every problem missing them, using a
// local Ollama model, writing results to a JSONL file. Fully unattended and
// resumable: re-running skips problems already in the DB or already in the out
// file. No Next.js dev server / browser needed — just Ollama + this script.
//
// Run (the real unattended run — inserts into the DB live, survives stopping):
//   caffeinate -i node --env-file=.env.local scripts/gen-hints-ollama.mjs --db
//
// Other forms:
//   node --env-file=.env.local scripts/gen-hints-ollama.mjs            # JSONL only, no DB
//   node --env-file=.env.local scripts/gen-hints-ollama.mjs --limit 1  # quick test
//   ... --only 88,102          # regenerate specific problems
//   ... --model qwen2.5-coder:3b   # override model (default = $OLLAMA_MODEL)
//
// Flags: --db (insert each hint into the DB as it's generated), --model, --only,
//        --limit, --provider ollama|openrouter, --max-tokens N, --out PATH.
//
// Output log: scripts/hints-output.jsonl. Without --db, import afterwards with:
//   node --env-file=.env.local scripts/import-hints.mjs

import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- args ---------------------------------------------------------------
const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
};
const MODEL = getArg("--model", process.env.OLLAMA_MODEL || "qwen2.5-coder:3b");
const OUT = getArg("--out", "scripts/hints-output.jsonl");
const LIMIT = Number(getArg("--limit", "0")); // 0 = all
// --only 108,119,88 : restrict to these problem_numbers (regenerates them,
// ignoring the already-hinted/already-in-file filters). Useful for spot tests.
const ONLY = getArg("--only", "")
  .split(",")
  .map((x) => parseInt(x, 10))
  .filter((x) => !Number.isNaN(x));
const BASE = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(
  /\/$/,
  "",
);
const TIMEOUT_MS = 180_000;
// --provider ollama (default) | openrouter
const PROVIDER = getArg("--provider", "ollama");
// --max-tokens N : cap completion length to speed up generation (0 = unset).
// Three 1–2 sentence hints fit comfortably in ~220 tokens.
const MAX_TOKENS = Number(getArg("--max-tokens", "0"));
// --dry-run : write/preview the to-do list, then exit without generating.
const DRY_RUN = argv.includes("--dry-run");
// --db : insert each problem's hints into the `hints` table immediately after
// it's generated (not at the end), so stopping mid-run loses nothing. The JSONL
// file is still written as a backup log. Resuming skips rows already in the DB.
const WRITE_DB = argv.includes("--db");
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
if (PROVIDER === "openrouter" && !OPENROUTER_KEY) {
  console.error("--provider openrouter needs OPENROUTER_API_KEY in env.");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env. Run with: node --env-file=.env.local …");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- prompt (kept identical to buildHintPrompt in the API routes) --------
// Strip HTML/entities and the boilerplate header (echoed title + time/memory
// limits) so the model reads the real statement, not the misleading title.
function cleanStatement(html) {
  let c = (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  const m = c.search(/\bProblem\b/);
  if (m !== -1 && m < 200) c = c.slice(m + "Problem".length).trim();
  return c.slice(0, 2500);
}

function buildPrompt(problem) {
  const tags = (problem.tags ?? []).join(", ") || "none";
  const statement = cleanStatement(problem.content);
  return `You are a competitive-programming mentor writing three short, progressive hints for the problem under "PROBLEM STATEMENT" below. Work ONLY from that statement — never from the problem's title or name (titles are often misleading or name the very idea the solver should discover).

How the hints should feel:
- Orient, don't instruct. Each hint shifts the solver's attention toward a productive way of seeing the problem, then stops. Never name an algorithm, data structure, or complexity, and never lay out steps or a recipe.
- Lead forward, and vary the phrasing — not every hint is a question. Mix a quiet observation with the occasional question that already reframes the problem. Avoid hollow prompts like "what does it ask?". The strongest nudges quietly change the unit of thinking. Adapt these PATTERNS to this problem's own nouns — do NOT copy the words:
   • "How much does each <element> contribute to the <total>, counted on its own?"
   • "What are all the ways to produce a single <thing>?"
   • "This <quantity> gets re-counted many times — could it be tallied just once?"
   • "Fix <one part> and imagine its outcome; how much freedom is left in the rest?"
- Progress in depth, and make the three deliberately UNEQUAL. Hints 1 and 2 are gentle steps that only orient: hint 1 nudges the angle of approach, hint 2 narrows to the key quantity or structure — neither hands over the method, and neither names or alludes to any technique even if the statement mentions one. Hint 3 is the payoff: bring the solver almost all the way — surface the crucial observation, relationship, or quantity to exploit, phrased naturally as something to notice, so a stuck solver can see the path. Do NOT announce it (never write "the key insight", "the trick is", or any such label), stay a touch lighter than a full explanation, and leave the final connection to them (never give the construction, final formula, or code).
- Stay specific to THIS problem's real elements, constraints, and quantities; use $term$ for key symbols.

PROBLEM STATEMENT:
${statement}

Difficulty: ${problem.difficulty ?? "unknown"}
Topic tags (use sparingly, only to steer the general direction — never name or restate them): ${tags}

Respond with ONLY this JSON object, no other text:
{"hint_1": "...", "hint_2": "...", "hint_3": "..."}

Rules:
- Three hints, each 1–2 sentences, deliberately escalating: 1 and 2 are gentle steps, 3 is the real unlock.
- Hints 1 and 2 only orient and reframe — they must NOT give the method or a recipe, and must NOT name or allude to any technique, even one named in the statement.
- Hint 3 brings the solver almost all the way: surface the crucial observation or relationship to exploit, phrased naturally as something to notice — but do NOT preface it with "the key insight", "the trick is", or similar labels, keep it a touch lighter than a full explanation, and never give the complete solution, final formula, or step-by-step construction.
- Vary the phrasing — not every hint should be a question.
- Be specific to THIS statement's real elements; use $term$ for key symbols. Use the patterns above only as phrasing models, with this problem's own nouns.
- Do not name an algorithm, data structure, or complexity in hints 1–2 (even if the statement uses one); in hint 3 you may name the core idea if it is the crux, but never spell out the full algorithm or code.
- No labels, bullets, or headers inside the hint text.`;
}

async function callModel(prompt) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const url =
      PROVIDER === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : `${BASE}/v1/chat/completions`;
    const headers = { "Content-Type": "application/json" };
    if (PROVIDER === "openrouter") {
      headers.Authorization = `Bearer ${OPENROUTER_KEY}`;
      headers["X-Title"] = "AlgoPath hint gen";
    }
    const payload = {
      model: MODEL,
      stream: false,
      messages: [{ role: "user", content: prompt }],
    };
    if (MAX_TOKENS > 0) payload.max_tokens = MAX_TOKENS;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    const raw = await res.text();
    if (!res.ok)
      throw new Error(`${PROVIDER} ${res.status}: ${raw.slice(0, 160)}`);
    const body = JSON.parse(raw);
    const text = body.choices?.[0]?.message?.content ?? "";
    const trimmed = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const hints = JSON.parse(trimmed);
    if (!hints.hint_1 || !hints.hint_2 || !hints.hint_3) {
      throw new Error("incomplete hints");
    }
    return hints;
  } finally {
    clearTimeout(t);
  }
}

// --- gather work --------------------------------------------------------
function doneFromOutFile() {
  const done = new Set();
  if (!existsSync(OUT)) return done;
  for (const line of readFileSync(OUT, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      if (o.ok && o.problem_number) done.add(o.problem_number);
    } catch {}
  }
  return done;
}

// PostgREST caps a single select at 1000 rows — paginate to get all problems.
async function fetchAll(table, columns) {
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("problem_number")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`Failed to load ${table}:`, error.message);
      process.exit(1);
    }
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const allProblems = await fetchAll(
  "problems",
  "problem_number, title, difficulty, tags, content, url",
);
const hinted = await fetchAll("hints", "problem_number");
const hintedSet = new Set((hinted ?? []).map((h) => h.problem_number));
const outDone = doneFromOutFile();

let toProcess;
if (ONLY.length) {
  const only = new Set(ONLY);
  toProcess = (allProblems ?? []).filter((p) => only.has(p.problem_number));
} else {
  toProcess = (allProblems ?? []).filter(
    (p) => !hintedSet.has(p.problem_number) && !outDone.has(p.problem_number),
  );
  if (LIMIT > 0) toProcess = toProcess.slice(0, LIMIT);
}

console.log(
  `model=${MODEL}  provider=${PROVIDER}  out=${OUT}  db=${WRITE_DB ? "ON (live insert)" : "off"}`,
);
console.log(
  `problems=${allProblems?.length ?? 0}  in-db=${hintedSet.size}  already-in-file=${outDone.size}  to-do=${toProcess.length}`,
);

// Write the full to-do list to a file (the "collapsible" view — open/fold it in
// your editor), and print just a short preview so the terminal isn't flooded.
const TODO_LIST = "scripts/todo-list.txt";
if (toProcess.length) {
  const fmt = (p) => `#${p.problem_number}\t${p.difficulty ?? "?"}\t${p.title}`;
  writeFileSync(
    TODO_LIST,
    `${toProcess.length} problems to do (model=${MODEL}):\n${toProcess
      .map(fmt)
      .join("\n")}\n`,
  );
  const preview = 12;
  console.log(`\n▸ Problems to do (full list → ${TODO_LIST}):`);
  for (const p of toProcess.slice(0, preview)) console.log(`   ${fmt(p)}`);
  if (toProcess.length > preview) {
    console.log(
      `   … and ${toProcess.length - preview} more (see ${TODO_LIST})`,
    );
  }
  console.log("");
}

if (DRY_RUN) {
  console.log("--dry-run: not generating. Remove the flag to start.");
  process.exit(0);
}

// --- run ----------------------------------------------------------------
let ok = 0;
let fail = 0;
const startedAt = Date.now();
for (let i = 0; i < toProcess.length; i++) {
  const p = toProcess[i];
  let lastErr = "";
  let saved = false;
  for (let attempt = 0; attempt <= 2 && !saved; attempt++) {
    try {
      const hints = await callModel(buildPrompt(p));
      // Insert into the DB live (part of the success criterion in --db mode, so
      // a failed insert is retried and never silently logged as done).
      if (WRITE_DB) {
        const { error } = await supabase.from("hints").insert({
          problem_number: p.problem_number,
          problem_name: p.title,
          hint_1: hints.hint_1,
          hint_2: hints.hint_2,
          hint_3: hints.hint_3,
        });
        if (error) throw new Error(`db insert: ${error.message}`);
      }
      appendFileSync(
        OUT,
        `${JSON.stringify({
          ok: true,
          problem_number: p.problem_number,
          problem_name: p.title,
          hint_1: hints.hint_1,
          hint_2: hints.hint_2,
          hint_3: hints.hint_3,
        })}\n`,
      );
      ok++;
      saved = true;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!saved) {
    fail++;
    appendFileSync(
      OUT,
      `${JSON.stringify({ ok: false, problem_number: p.problem_number, error: lastErr })}\n`,
    );
  }
  const elapsed = (Date.now() - startedAt) / 1000;
  const rate = (i + 1) / elapsed;
  const eta = Math.round((toProcess.length - i - 1) / rate / 60);
  process.stdout.write(
    `\r[${i + 1}/${toProcess.length}] ok=${ok} fail=${fail} ~${(1 / rate).toFixed(1)}s/ea ETA ${eta}m   `,
  );
}
console.log(`\nDone. ok=${ok} fail=${fail}. Wrote ${OUT}`);
console.log(
  WRITE_DB
    ? "Hints were inserted into the DB live. Re-run anytime to continue where you left off."
    : "Import into the DB with: node --env-file=.env.local scripts/import-hints.mjs",
);
