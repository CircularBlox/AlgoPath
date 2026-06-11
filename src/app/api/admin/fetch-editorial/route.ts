import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import {
  extractEditorialLink,
  extractTypography,
  fetchCfHtml,
  htmlToMarkdown,
  isCodeforcesUrl,
  parseContestRef,
  sliceProblemSection,
} from "~/lib/cf-editorial";
import { getAuthContext } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";

// Scraping does up to two sequential CF fetches (problem page + blog), each
// with retries — well past Vercel's default 10s budget.
export const maxDuration = 30;

/**
 * POST /api/admin/fetch-editorial
 *
 * Scrapes the Codeforces editorial for a problem and returns it as markdown the
 * admin can review and save into the solution explanation. Resolves the
 * editorial blog from the problem's "Contest materials" sidebar when no
 * editorial_url is stored, and backfills editorial_url when it finds one.
 *
 * Body: { problem_number: number, editorial_url?: string }
 *   - editorial_url: optional override when auto-resolution fails.
 */
export async function POST(request: NextRequest) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { problem_number?: unknown; editorial_url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const problemNumber = Number(body.problem_number);
  if (!problemNumber || Number.isNaN(problemNumber)) {
    return NextResponse.json(
      { error: "problem_number is required." },
      { status: 400 },
    );
  }
  const override =
    typeof body.editorial_url === "string" && body.editorial_url.trim()
      ? body.editorial_url.trim()
      : null;

  const supabase = createAdminClient();
  const { data: problem } = await supabase
    .from("problems")
    .select("title, url, platform, editorial_url")
    .eq("problem_number", problemNumber)
    .single();

  if (!problem) {
    return NextResponse.json(
      { error: `Problem #${problemNumber} not found.` },
      { status: 404 },
    );
  }
  if (problem.platform !== "codeforces") {
    return NextResponse.json(
      { error: "Editorial scraping is only supported for Codeforces." },
      { status: 422 },
    );
  }

  const ref = parseContestRef(problem.url ?? "");
  if (!ref) {
    return NextResponse.json(
      { error: `Could not parse a contest/problem id from "${problem.url}".` },
      { status: 422 },
    );
  }

  try {
    // 1. Resolve the editorial blog URL: explicit override → stored value →
    //    scrape the problem page's "Contest materials" sidebar.
    let blogUrl =
      override ??
      (problem.editorial_url && isCodeforcesUrl(problem.editorial_url)
        ? problem.editorial_url
        : null);

    if (!blogUrl) {
      const problemHtml = await fetchCfHtml(problem.url);
      blogUrl = extractEditorialLink(problemHtml);
    }

    if (!blogUrl) {
      return NextResponse.json(
        {
          error:
            "No editorial link found in the problem's contest materials. Paste the blog URL manually.",
        },
        { status: 404 },
      );
    }

    // 2. Fetch and parse the editorial blog.
    const blogHtml = await fetchCfHtml(blogUrl);
    const typography = extractTypography(blogHtml);
    const { html: section, sliced } = sliceProblemSection(
      typography,
      ref,
      problem.title ?? undefined,
    );
    const content = htmlToMarkdown(section).slice(0, 12000);

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Fetched the editorial but extracted no readable content." },
        { status: 422 },
      );
    }

    // 3. Backfill editorial_url so the public "Read editorial ↗" link works.
    if (problem.editorial_url !== blogUrl) {
      await supabase
        .from("problems")
        .update({ editorial_url: blogUrl })
        .eq("problem_number", problemNumber);
    }

    return NextResponse.json({
      editorial_url: blogUrl,
      problem_index: ref.index,
      sliced,
      content,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch the editorial.";
    Sentry.captureException(err, {
      tags: { route: "admin/fetch-editorial" },
      extra: { problemNumber, url: problem.url },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
