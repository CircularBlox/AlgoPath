#!/usr/bin/env node
/**
 * upload_problems.js
 *
 * Reads problem JSON files from leetscrape_data/questions_full/ and HTML
 * content from mdx_questions/, then upserts them into Supabase.
 *
 * No npm install required — uses only Node.js built-ins + native fetch (Node 18+).
 *
 * Setup:
 *   1. Create a .env file in this folder (see .env.example)
 *   2. node upload_problems.js
 *
 * Usage:
 *   node upload_problems.js              # upload all
 *   node upload_problems.js --dry-run    # preview without writing
 *   node upload_problems.js --limit 50   # stop after 50 uploads
 *   node upload_problems.js --start 101  # skip problems with QID < 101
 */

const fs = require("node:fs");
const path = require("node:path");

// ---------------------------------------------------------------------------
// Load .env manually (no dotenv needed)
// ---------------------------------------------------------------------------
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.\n" +
      "Create a .env file in this folder (see .env.example).",
  );
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

const JSON_DIR = path.join(__dirname, "leetscrape_data/questions_full");
const MDX_DIR = path.join(__dirname, "mdx_questions");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");

const limitIdx = argv.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(argv[limitIdx + 1], 10) : Infinity;

const startIdx = argv.indexOf("--start");
const START_QID = startIdx !== -1 ? parseInt(argv[startIdx + 1], 10) : 0;

// ---------------------------------------------------------------------------
// Supabase helpers (native fetch)
// ---------------------------------------------------------------------------

// Returns true if inserted, false if duplicate (title unique constraint).
async function insertProblem(record) {
  const res = await fetch(`${REST}/problems`, {
    method: "POST",
    headers: {
      ...HEADERS,
      Prefer: "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const rows = await res.json();
  return rows.length > 0; // empty = duplicate ignored
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(JSON_DIR)) {
    console.error(`ERROR: JSON directory not found:\n  ${JSON_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(JSON_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  console.log(
    `Found ${files.length} JSON files.` +
      (DRY_RUN ? "  [DRY RUN — nothing will be written]" : ""),
  );
  if (START_QID) console.log(`Skipping QIDs below ${START_QID}.`);
  if (LIMIT !== Infinity) console.log(`Stopping after ${LIMIT} uploads.`);
  console.log("");

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    if (uploaded >= LIMIT) break;

    // --- Parse JSON ---
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, file), "utf8"));
    } catch (err) {
      console.warn(`WARN  could not parse ${file}: ${err.message}`);
      failed++;
      continue;
    }

    const { QID, title, titleSlug, difficulty, topics, isPaidOnly } = data;

    if (!QID || !title || !titleSlug) {
      console.warn(`WARN  ${file}: missing QID/title/titleSlug — skipping`);
      skipped++;
      continue;
    }

    if (QID < START_QID) {
      skipped++;
      continue;
    }

    if (isPaidOnly) {
      console.log(`SKIP  #${QID} ${title} — paid only`);
      skipped++;
      continue;
    }

    // --- Resolve HTML content ---
    const mdxPath = path.join(MDX_DIR, file.replace(".json", ".mdx"));
    let content = data.Body ?? null;
    if (fs.existsSync(mdxPath)) {
      content = fs.readFileSync(mdxPath, "utf8");
    }

    const DIFF_RANGE = {
      Easy: [300, 800],
      Medium: [800, 1400],
      Hard: [1400, 2000],
    };
    const range = DIFF_RANGE[difficulty];
    const rating = range
      ? (Math.floor(Math.random() * (range[1] / 100 - range[0] / 100 + 1)) +
          range[0] / 100) *
        100
      : 600;
    const diffLabel = String(rating);

    const record = {
      problem_number: QID,
      title,
      url: `https://leetcode.com/problems/${titleSlug}/`,
      platform: "leetcode",
      difficulty: diffLabel,
      tags: topics ?? [],
      content,
    };

    if (DRY_RUN) {
      console.log(
        `DRY   #${String(QID).padEnd(5)} ${title} (${diffLabel ?? "?"})` +
          `  [${(topics ?? []).join(", ")}]`,
      );
      uploaded++;
      continue;
    }

    // --- Insert (backend deduplicates by title) ---
    try {
      const inserted = await insertProblem(record);
      if (inserted) {
        console.log(`OK    #${String(QID).padEnd(5)} ${title}`);
        uploaded++;
      } else {
        console.log(`SKIP  #${QID} ${title} — already exists`);
        skipped++;
      }
    } catch (err) {
      console.error(`FAIL  #${QID} ${title}: ${err.message}`);
      failed++;
    }
  }

  console.log(
    `\n${"─".repeat(50)}\n` +
      `Uploaded : ${uploaded}\n` +
      `Skipped  : ${skipped}\n` +
      `Failed   : ${failed}\n`,
  );
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
