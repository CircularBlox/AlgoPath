import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { getUser } from "~/lib/supabase/server";

type CFProblem = {
  contestId?: number;
  index: string;
  rating?: number;
};

type CFApiResponse = {
  status: string;
  result?: { problems: CFProblem[] };
  comment?: string;
};

function parseCFContestAndIndex(
  url: string,
): { contestId: number; index: string } | null {
  const m =
    url.match(/\/contest\/(\d+)\/problem\/([A-Z0-9]+)/i) ??
    url.match(/\/problemset\/problem\/(\d+)\/([A-Z0-9]+)/i);
  if (!m) return null;
  return { contestId: Number(m[1]), index: m[2].toUpperCase() };
}

/** POST /api/admin/backfill-difficulty
 *  Fetches CF ratings for all problems with NULL difficulty and updates them.
 *  Accepts optional ?dry_run=true to preview without writing.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const dryRun = request.nextUrl.searchParams.get("dry_run") === "true";
  const supabase = createAdminClient();

  const { data: nullProblems, error: fetchError } = await supabase
    .from("problems")
    .select("problem_number, url, platform")
    .is("difficulty", null)
    .eq("platform", "codeforces");

  if (fetchError) {
    return NextResponse.json({ error: "DB fetch failed." }, { status: 500 });
  }

  if (!nullProblems || nullProblems.length === 0) {
    return NextResponse.json({
      updated: 0,
      message: "No NULL difficulties found.",
    });
  }

  let cfProblems: CFProblem[] = [];
  try {
    const res = await fetch("https://codeforces.com/api/problemset.problems", {
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json()) as CFApiResponse;
    if (json.status !== "OK" || !json.result) {
      return NextResponse.json(
        { error: `CF API error: ${json.comment ?? "unknown"}` },
        { status: 502 },
      );
    }
    cfProblems = json.result.problems;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "admin/backfill-difficulty" },
    });
    return NextResponse.json(
      { error: "Failed to fetch CF API." },
      { status: 502 },
    );
  }

  // Build lookup: "contestId-INDEX" → rating
  const ratingMap = new Map<string, number>();
  for (const p of cfProblems) {
    if (p.contestId && p.rating) {
      ratingMap.set(`${p.contestId}-${p.index.toUpperCase()}`, p.rating);
    }
  }

  const updates: { problem_number: number; difficulty: string }[] = [];
  const skipped: number[] = [];

  for (const p of nullProblems) {
    const parsed = parseCFContestAndIndex(p.url as string);
    if (!parsed) {
      skipped.push(p.problem_number as number);
      continue;
    }
    const rating = ratingMap.get(`${parsed.contestId}-${parsed.index}`);
    if (!rating) {
      skipped.push(p.problem_number as number);
      continue;
    }
    updates.push({
      problem_number: p.problem_number as number,
      difficulty: String(rating),
    });
  }

  if (!dryRun && updates.length > 0) {
    for (const u of updates) {
      await supabase
        .from("problems")
        .update({ difficulty: u.difficulty })
        .eq("problem_number", u.problem_number);
    }
  }

  return NextResponse.json({
    dry_run: dryRun,
    null_count: nullProblems.length,
    updated: updates.length,
    skipped: skipped.length,
    updates: dryRun ? updates : undefined,
  });
}
