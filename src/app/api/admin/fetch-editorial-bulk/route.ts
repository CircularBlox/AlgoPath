import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { scrapeEditorial } from "~/lib/codeforces/cf-editorial";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { getUser } from "~/lib/supabase/server";

export const maxDuration = 60;

function sse(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * GET /api/admin/fetch-editorial-bulk?scope=all|missing
 *
 * Streams (SSE) editorial scraping over every Codeforces problem, persisting
 * editorial_content + editorial_url for each. `scope=missing` (default) skips
 * problems that already have editorial_content; `scope=all` re-scrapes every
 * Codeforces problem. Polite ~1.5s delay between problems to avoid hammering
 * Codeforces.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const scope =
    request.nextUrl.searchParams.get("scope") === "all" ? "all" : "missing";

  const supabase = createAdminClient();
  let query = supabase
    .from("problems")
    .select("problem_number, title, url, platform, editorial_url")
    .eq("platform", "codeforces")
    .order("problem_number");
  if (scope === "missing") query = query.is("editorial_content", null);

  const { data: problems } = await query;
  const toProcess = problems ?? [];

  let succeeded = 0;
  let failed = 0;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ type: "start", total: toProcess.length }));

      for (let i = 0; i < toProcess.length; i++) {
        const problem = toProcess[i];
        try {
          const { editorial_url, content } = await scrapeEditorial(problem);
          const { error } = await supabase
            .from("problems")
            .update({ editorial_url, editorial_content: content })
            .eq("problem_number", problem.problem_number);
          if (error) throw new Error(error.message);

          succeeded++;
          controller.enqueue(
            sse({
              type: "progress",
              current: i + 1,
              total: toProcess.length,
              problem_number: problem.problem_number,
              title: problem.title,
              success: true,
            }),
          );
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : "Unknown error.";
          Sentry.captureMessage(`[fetch-editorial-bulk] ${message}`, {
            level: "warning",
            tags: { route: "admin/fetch-editorial-bulk" },
            extra: { problem_number: problem.problem_number },
          });
          controller.enqueue(
            sse({
              type: "progress",
              current: i + 1,
              total: toProcess.length,
              problem_number: problem.problem_number,
              title: problem.title,
              success: false,
              error: message,
            }),
          );
        }

        // Be polite to Codeforces between problems.
        if (i < toProcess.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      controller.enqueue(sse({ type: "done", succeeded, failed }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
