import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .ilike("title", `%${query}%`)
    .limit(20);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "search" },
      extra: { query },
    });
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No problems found." }, { status: 404 });
  }

  // Score and rank: exact > starts-with > contains
  const q = query.toLowerCase();
  const ranked = data
    .map((p) => {
      const t = p.title.toLowerCase();
      const score = t === q ? 0 : t.startsWith(q) ? 1 : 2;
      return { ...p, _score: score };
    })
    .sort((a, b) => a._score - b._score)
    .slice(0, 5)
    .map(({ _score, ...p }) => p);

  return NextResponse.json(ranked);
}
