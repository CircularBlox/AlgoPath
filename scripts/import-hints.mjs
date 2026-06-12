#!/usr/bin/env node
// import-hints.mjs — import a hints JSONL file (from gen-hints-ollama.mjs) into
// the `hints` table. Skips problems that already have hints. Safe to re-run.
//
// Run:
//   node --env-file=.env.local scripts/import-hints.mjs                 # import
//   node --env-file=.env.local scripts/import-hints.mjs --dry-run       # preview
//   node --env-file=.env.local scripts/import-hints.mjs --in scripts/hints-output.jsonl

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
};
const IN = getArg("--in", "scripts/hints-output.jsonl");
const DRY = argv.includes("--dry-run");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

if (!existsSync(IN)) {
  console.error(`Input file not found: ${IN}`);
  process.exit(1);
}

// Parse JSONL, keep last valid success per problem_number.
const byNum = new Map();
let bad = 0;
for (const line of readFileSync(IN, "utf8").split("\n")) {
  if (!line.trim()) continue;
  try {
    const o = JSON.parse(line);
    if (o.ok && o.problem_number && o.hint_1 && o.hint_2 && o.hint_3) {
      byNum.set(o.problem_number, o);
    } else if (!o.ok) {
      bad++;
    }
  } catch {
    bad++;
  }
}

const { data: hinted } = await supabase.from("hints").select("problem_number");
const hintedSet = new Set((hinted ?? []).map((h) => h.problem_number));

const rows = [...byNum.values()]
  .filter((o) => !hintedSet.has(o.problem_number))
  .map((o) => ({
    problem_number: o.problem_number,
    problem_name: o.problem_name,
    hint_1: o.hint_1,
    hint_2: o.hint_2,
    hint_3: o.hint_3,
  }));

console.log(
  `file=${IN}  valid=${byNum.size}  failed-records=${bad}  already-in-db=${
    byNum.size - rows.length
  }  to-insert=${rows.length}`,
);

if (DRY) {
  console.log("Dry run — nothing written. Sample:");
  console.log(JSON.stringify(rows.slice(0, 2), null, 2));
  process.exit(0);
}

let inserted = 0;
for (let i = 0; i < rows.length; i += 100) {
  const batch = rows.slice(i, i + 100);
  const { error } = await supabase.from("hints").insert(batch);
  if (error) {
    console.error(`\nBatch ${i}-${i + batch.length} failed:`, error.message);
    process.exit(1);
  }
  inserted += batch.length;
  process.stdout.write(`\rinserted ${inserted}/${rows.length}`);
}
console.log(`\nDone. Inserted ${inserted} hint rows.`);
