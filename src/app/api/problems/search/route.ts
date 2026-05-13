import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const query = sp.get("q")?.trim() ?? "";
  const platform = sp.get("platform")?.trim() ?? "";
  const tag = sp.get("tag")?.trim() ?? "";
  const difficulty = sp.get("difficulty")?.trim() ?? "";

  if (!query && !tag && !platform && !difficulty) {
    return NextResponse.json(
      { error: "At least one search filter is required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  let q = supabase.from("problems").select("*");
  if (query) q = q.ilike("title", `%${query}%`);
  if (platform) q = q.eq("platform", platform);
  if (difficulty) q = q.eq("difficulty", difficulty);
  if (tag) q = q.contains("tags", [tag]);

  const { data, error } = await q.limit(20);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "search" },
      extra: { query, platform, tag, difficulty },
    });
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No problems found." }, { status: 404 });
  }

  // When title query given, rank: exact > starts-with > contains
  if (query) {
    const ql = query.toLowerCase();
    const ranked = data
      .map((p) => {
        const t = p.title.toLowerCase();
        const score = t === ql ? 0 : t.startsWith(ql) ? 1 : 2;
        return { ...p, _score: score };
      })
      .sort((a, b) => a._score - b._score)
      .slice(0, 5)
      .map(({ _score, ...p }) => p);
    return NextResponse.json(ranked);
  }

  return NextResponse.json(data);
}
