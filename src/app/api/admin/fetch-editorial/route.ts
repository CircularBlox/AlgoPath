import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { scrapeEditorial } from "~/lib/codeforces/cf-editorial";
import { getAuthContext } from "~/lib/security/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";

// Scraping does up to two sequential CF fetches (problem page + blog), each
// with retries — well past Vercel's default 10s budget.
export const maxDuration = 30;

type ProblemRow = {
  problem_number: number;
  title: string | null;
  url: string | null;
  platform: string | null;
  editorial_url: string | null;
};

/**
 * POST /api/admin/fetch-editorial
 *
 * Scrapes the Codeforces editorial for one problem and returns it as markdown.
 * Resolves the editorial blog from the problem's "Contest materials" sidebar
 * when no editorial_url is stored, and always backfills editorial_url. With
 * `save: true` it also stores the body in problems.editorial_content.
 *
 * Body:
 *   - problem_number: number — the problem to scrape (omit when random)
 *   - random: boolean — pick a random Codeforces problem instead
 *   - missing_only: boolean — with random, only pick ones without an editorial
 *   - editorial_url: string — override the resolved blog URL
 *   - save: boolean — persist editorial_content (default false)
 */
export async function POST(request: NextRequest) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: {
    problem_number?: unknown;
    random?: unknown;
    missing_only?: unknown;
    editorial_url?: unknown;
    blog_html?: unknown;
    save?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const random = body.random === true;
  const missingOnly = body.missing_only === true;
  const save = body.save === true;
  const override =
    typeof body.editorial_url === "string" && body.editorial_url.trim()
      ? body.editorial_url.trim()
      : null;
  const blogHtml =
    typeof body.blog_html === "string" && body.blog_html.trim()
      ? body.blog_html
      : null;

  const supabase = createAdminClient();
  const cols = "problem_number, title, url, platform, editorial_url";
  let problem: ProblemRow | null = null;

  if (random) {
    // Pull candidate Codeforces problems and pick one client-of-DB-side.
    let query = supabase
      .from("problems")
      .select(cols)
      .eq("platform", "codeforces");
    if (missingOnly) query = query.is("editorial_content", null);

    const { data: candidates } = await query;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        {
          error: missingOnly
            ? "No Codeforces problems without an editorial left."
            : "No Codeforces problems found.",
        },
        { status: 404 },
      );
    }
    problem = candidates[
      Math.floor(Math.random() * candidates.length)
    ] as ProblemRow;
  } else {
    const problemNumber = Number(body.problem_number);
    if (!problemNumber || Number.isNaN(problemNumber)) {
      return NextResponse.json(
        { error: "problem_number is required (or set random: true)." },
        { status: 400 },
      );
    }
    const { data } = await supabase
      .from("problems")
      .select(cols)
      .eq("problem_number", problemNumber)
      .single();
    if (!data) {
      return NextResponse.json(
        { error: `Problem #${problemNumber} not found.` },
        { status: 404 },
      );
    }
    problem = data as ProblemRow;
  }

  if (problem.platform !== "codeforces") {
    return NextResponse.json(
      { error: "Editorial scraping is only supported for Codeforces." },
      { status: 422 },
    );
  }

  try {
    const { editorial_url, sliced, content } = await scrapeEditorial(problem, {
      override,
      blogHtml,
    });

    // Backfill editorial_url when we have one; persist content only when asked.
    const update: { editorial_url?: string; editorial_content?: string } = {};
    if (editorial_url && problem.editorial_url !== editorial_url) {
      update.editorial_url = editorial_url;
    }
    if (save) update.editorial_content = content;
    if (Object.keys(update).length > 0) {
      await supabase
        .from("problems")
        .update(update)
        .eq("problem_number", problem.problem_number);
    }

    return NextResponse.json({
      problem_number: problem.problem_number,
      title: problem.title,
      editorial_url,
      sliced,
      saved: save,
      content,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch the editorial.";
    Sentry.captureException(err, {
      tags: { route: "admin/fetch-editorial" },
      extra: { problemNumber: problem.problem_number, url: problem.url },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
