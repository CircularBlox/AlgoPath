import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "~/lib/is-admin";
import { getUser } from "~/lib/supabase/server";

/**
 * Extracts plain text from a <pre> block's inner HTML.
 * Handles CF's test-example-line div format and plain newline text.
 */
function extractTextFromPre(inner: string): string {
  if (inner.includes("test-example-line")) {
    // Each line is wrapped in a <div class="test-example-line ...">
    const lineRe = /<div[^>]*test-example-line[^>]*>([\s\S]*?)<\/div>/gi;
    const lines = [...inner.matchAll(lineRe)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim(),
    );
    return lines.join("\n");
  }
  // Plain text — normalize <br> to newlines, strip remaining tags
  return inner
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Finds CF sample-test input and output sections separately using string
 * position tracking (avoids nested-div regex issues).
 */
function extractCFData(html: string): { inputs: string[]; outputs: string[] } {
  const sampleIdx = html.indexOf('class="sample-test"');
  if (sampleIdx === -1) return { inputs: [], outputs: [] };

  const noteIdx = html.indexOf('class="note"', sampleIdx);
  const section =
    noteIdx !== -1
      ? html.slice(sampleIdx, noteIdx)
      : html.slice(sampleIdx, sampleIdx + 30000);

  const inputs: string[] = [];
  const outputs: string[] = [];

  let pos = 0;
  while (true) {
    const nextInput = section.indexOf('<div class="input">', pos);
    const nextOutput = section.indexOf('<div class="output">', pos);
    if (nextInput === -1 && nextOutput === -1) break;

    const isInput =
      nextInput !== -1 && (nextOutput === -1 || nextInput < nextOutput);
    const divStart = isInput ? nextInput : nextOutput;

    // Find the first <pre> after this div marker
    const preTagStart = section.indexOf("<pre", divStart);
    if (preTagStart === -1) {
      pos = divStart + 1;
      continue;
    }
    const innerStart = section.indexOf(">", preTagStart) + 1;
    const innerEnd = section.indexOf("</pre>", innerStart);
    if (innerEnd === -1) {
      pos = preTagStart + 4;
      continue;
    }

    const text = extractTextFromPre(section.slice(innerStart, innerEnd));
    if (text) {
      if (isInput) inputs.push(text);
      else outputs.push(text);
    }

    pos = innerEnd + 6;
  }

  return { inputs, outputs };
}

/**
 * Replaces no-newline <pre> blocks in storedContent using context-aware
 * heading detection (Input/Output) to put the right CF data in the right place.
 * Falls back to ordered replacement if no headings match.
 */
function proposeFixedContent(
  storedContent: string,
  cfData: { inputs: string[]; outputs: string[] },
): string {
  let inputIdx = 0;
  let outputIdx = 0;
  let replacedCount = 0;

  // Context-aware: look for <p> or <hN> heading containing "input"/"output"
  // immediately before a no-newline <pre> block
  const withContext = storedContent.replace(
    /(<(?:p|h[1-6])[^>]*>[\s\S]{0,300}?\b(input|output)\b[\s\S]{0,300}?<\/(?:p|h[1-6])>)\s*(<pre([^>]*)>([\s\S]*?)<\/pre>)/gi,
    (match, heading, typeWord, _preTag, attrs, inner) => {
      if (inner.includes("\n") || inner.trim().length <= 15) return match;
      const isInput = typeWord.toLowerCase() === "input";
      if (isInput && inputIdx < cfData.inputs.length) {
        replacedCount++;
        return `${heading}\n<pre${attrs}>${cfData.inputs[inputIdx++]}</pre>`;
      }
      if (!isInput && outputIdx < cfData.outputs.length) {
        replacedCount++;
        return `${heading}\n<pre${attrs}>${cfData.outputs[outputIdx++]}</pre>`;
      }
      return match;
    },
  );

  if (replacedCount > 0) return withContext;

  // Fallback: ordered replacement (all inputs then all outputs)
  const allCf = [...cfData.inputs, ...cfData.outputs];
  let idx = 0;
  return storedContent.replace(
    /<pre([^>]*)>([\s\S]*?)<\/pre>/gi,
    (match, attrs, inner) => {
      if (
        !inner.includes("\n") &&
        inner.trim().length > 15 &&
        idx < allCf.length
      ) {
        return `<pre${attrs}>${allCf[idx++]}</pre>`;
      }
      return match;
    },
  );
}

/** POST /api/admin/refetch-problem — fetch CF page and propose fixed sample I/O */
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

  // Only Codeforces to prevent SSRF
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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
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

  const cfData = extractCFData(html);
  if (cfData.inputs.length === 0 && cfData.outputs.length === 0) {
    return NextResponse.json(
      { error: "Could not find sample test data on the Codeforces page." },
      { status: 422 },
    );
  }

  const proposed_content = proposeFixedContent(current_content, cfData);
  return NextResponse.json({ proposed_content });
}
