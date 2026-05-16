import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { getUser } from "~/lib/supabase/server";

export type IOIssue = {
  problem_number: number;
  title: string;
  url: string;
  platform: string;
  content: string;
  proposed_content: string;
  issue_type: "merged-io" | "no-newlines";
};

/**
 * Detects <pre> blocks where Input and Output samples are merged into one block.
 * Fixes by splitting at the Output boundary and inserting a proper Output header.
 *
 * Handles multiple patterns:
 *   - "\nOutput\n", "\r\nOutput\r\n", "\nOutput\r\n" — any CRLF combination
 *   - "Output" with surrounding horizontal whitespace (spaces/tabs)
 *   - "Output" at the very start of a <pre> block
 *   - "Sample Output", "Expected Output" variants
 *   - Case-insensitive match
 */
function detectAndPropose(content: string): string | null {
  // Normalize CRLF → LF for uniform matching
  const normalized = content.replace(/\r\n/g, "\n");

  // Broad check: does any <pre> block contain "output" on its own line?
  // Covers: mid-block (\nOutput\n), at start (Output\n with no preceding \n),
  // with whitespace (\n   Output   \n), and "sample output" variants.
  const hasMerged =
    /<pre[^>]*>[\s\S]*?\n[ \t]*(?:sample\s+|expected\s+)?output[ \t]*:?[ \t]*(?:\n|<)/i.test(
      normalized,
    ) ||
    /<pre[^>]*>[ \t]*(?:sample\s+|expected\s+)?output[ \t]*:?[ \t]*\n/i.test(
      normalized,
    );

  if (!hasMerged) return null;

  const proposed = normalized.replace(
    /<pre([^>]*)>([\s\S]*?)<\/pre>/gi,
    (_match, attrs: string, inner: string) => {
      // Strip optional leading "Input" header line
      const stripped = inner.replace(
        /^[ \t]*(?:sample\s+)?input[ \t]*:?[ \t]*\n/i,
        "",
      );

      // Split at the Output boundary (anywhere in the block)
      const outputRe =
        /\n[ \t]*(?:sample\s+|expected\s+)?output[ \t]*:?[ \t]*\n/i;
      const match = outputRe.exec(stripped);
      if (!match) return `<pre${attrs}>${inner}</pre>`;

      const inputPart = stripped.slice(0, match.index).trimEnd();
      const outputPart = stripped
        .slice(match.index + match[0].length)
        .trimStart();
      return `<pre${attrs}>${inputPart}</pre>\n<p><strong>Output</strong></p>\n<pre>${outputPart}</pre>`;
    },
  );

  return proposed !== normalized ? proposed : null;
}

/**
 * Detects <pre> blocks whose content has no newlines but is longer than 15 characters.
 * This indicates the scraper stripped newlines from multi-line sample I/O.
 * Returns the content unchanged (proposed = current) since correct line breaks
 * can't be inferred automatically — the admin must edit manually.
 */
function detectNoNewlinePre(content: string): boolean {
  const normalized = content.replace(/\r\n/g, "\n");
  const preRe = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  for (let m = preRe.exec(normalized); m !== null; m = preRe.exec(normalized)) {
    const inner = m[1];
    if (!inner.includes("\n") && inner.trim().length > 15) return true;
  }
  return false;
}

/** GET /api/admin/fix-io — scan all problems and return I/O issues with proposed fixes */
export async function GET(_request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = createAdminClient();

  const issues: IOIssue[] = [];
  let totalScanned = 0;
  let from = 0;
  const PAGE_SIZE = 100;

  while (true) {
    const { data, error } = await supabase
      .from("problems")
      .select("problem_number, title, url, platform, content")
      .not("content", "is", null)
      .order("problem_number")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      Sentry.captureException(error, {
        tags: { route: "admin/fix-io", method: "GET" },
      });
      return NextResponse.json(
        { error: "Failed to fetch problems.", detail: error.message },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) break;

    for (const p of data) {
      if (!p.content) continue;
      totalScanned++;
      const proposed = detectAndPropose(p.content);
      if (proposed) {
        issues.push({
          problem_number: p.problem_number,
          title: p.title,
          url: p.url,
          platform: p.platform ?? "codeforces",
          content: p.content,
          proposed_content: proposed,
          issue_type: "merged-io",
        });
      } else if (detectNoNewlinePre(p.content)) {
        issues.push({
          problem_number: p.problem_number,
          title: p.title,
          url: p.url,
          platform: p.platform ?? "codeforces",
          content: p.content,
          proposed_content: p.content,
          issue_type: "no-newlines",
        });
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return NextResponse.json({ issues, total_scanned: totalScanned });
}

/** POST /api/admin/fix-io — apply a list of approved content fixes */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { fixes: Array<{ problem_number: number; content: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.fixes) || body.fixes.length === 0) {
    return NextResponse.json(
      { error: "fixes must be a non-empty array." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const applied: number[] = [];
  const errors: Array<{ problem_number: number; error: string }> = [];

  for (const fix of body.fixes) {
    const { error } = await supabase
      .from("problems")
      .update({ content: fix.content })
      .eq("problem_number", fix.problem_number);

    if (error) {
      errors.push({ problem_number: fix.problem_number, error: error.message });
    } else {
      applied.push(fix.problem_number);
    }
  }

  return NextResponse.json({
    applied: applied.length,
    applied_numbers: applied,
    errors,
  });
}
