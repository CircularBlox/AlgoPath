import { type NextRequest, NextResponse } from "next/server";

function extractProblemStatement(html: string): string | null {
  const marker = 'class="problem-statement"';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  const divStart = html.lastIndexOf("<", markerIdx);
  let depth = 0;
  let i = divStart;

  while (i < html.length) {
    const slice = html.slice(i, i + 5).toLowerCase();
    if (slice.startsWith("<div")) {
      depth++;
      i += 4;
    } else if (slice.startsWith("</div")) {
      depth--;
      if (depth === 0) {
        const end = html.indexOf(">", i) + 1;
        return html.slice(divStart, end);
      }
      i += 5;
    } else {
      i++;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach the problem page." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `Problem page responded with ${response.status}.` },
      { status: 502 },
    );
  }

  const html = await response.text();
  const statement = extractProblemStatement(html);

  if (!statement) {
    return NextResponse.json(
      { error: "Could not find the problem statement in the page." },
      { status: 404 },
    );
  }

  return NextResponse.json({ html: statement });
}
