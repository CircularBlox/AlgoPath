import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "~/lib/is-admin";
import { getUser } from "~/lib/supabase/server";

/**
 * Extracts <pre> block inner content from the CF sample-test section.
 * CF structure: <div class="sample-test"><div class="input"><pre>...</pre></div>...
 */
function extractSamplePres(html: string): string[] {
  const sampleIdx = html.indexOf('class="sample-test"');
  if (sampleIdx === -1) return [];

  // Scope to sample-test section (stop at notes or end of problem statement)
  const noteIdx = html.indexOf('class="note"', sampleIdx);
  const section =
    noteIdx !== -1
      ? html.slice(sampleIdx, noteIdx)
      : html.slice(sampleIdx, sampleIdx + 30000);

  const results: string[] = [];
  const preRe = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  for (let m = preRe.exec(section); m !== null; m = preRe.exec(section)) {
    results.push(m[1]);
  }
  return results;
}

/**
 * Replaces no-newline <pre> blocks in storedContent with correctly-newlined
 * versions from the CF page (in encounter order).
 */
function proposeFixedContent(storedContent: string, cfPres: string[]): string {
  let idx = 0;
  return storedContent.replace(
    /<pre([^>]*)>([\s\S]*?)<\/pre>/gi,
    (match, attrs: string, inner: string) => {
      if (
        !inner.includes("\n") &&
        inner.trim().length > 15 &&
        idx < cfPres.length
      ) {
        return `<pre${attrs}>${cfPres[idx++]}</pre>`;
      }
      return match;
    },
  );
}

/** POST /api/admin/refetch-problem — fetch a CF problem page and propose fixed <pre> blocks */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { url: string; current_content: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { url, current_content } = body;
  if (
    !url ||
    typeof url !== "string" ||
    !current_content ||
    typeof current_content !== "string"
  ) {
    return NextResponse.json(
      { error: "url and current_content are required strings." },
      { status: 400 },
    );
  }

  // Validate URL — only Codeforces to prevent SSRF
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }
  if (!parsed.hostname.endsWith("codeforces.com")) {
    return NextResponse.json(
      { error: "Only Codeforces URLs are supported." },
      { status: 400 },
    );
  }

  let html: string;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlgoPath/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Codeforces returned HTTP ${resp.status}.` },
        { status: 502 },
      );
    }
    html = await resp.text();
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "admin/refetch-problem" } });
    return NextResponse.json(
      { error: "Failed to fetch the problem page." },
      { status: 502 },
    );
  }

  const cfPres = extractSamplePres(html);
  if (cfPres.length === 0) {
    return NextResponse.json(
      { error: "Could not find sample test data on the Codeforces page." },
      { status: 422 },
    );
  }

  const proposed_content = proposeFixedContent(current_content, cfPres);
  return NextResponse.json({ proposed_content });
}
