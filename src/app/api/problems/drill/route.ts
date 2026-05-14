import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

function difficultyOrder(d: string | null): number {
  if (!d) return 9999;
  if (d === "Easy") return 1000;
  if (d === "Medium") return 2000;
  if (d === "Hard") return 3000;
  const n = parseInt(d, 10);
  return Number.isNaN(n) ? 9999 : n;
}

/** GET /api/problems/drill?tag=<tag>&platform=<codeforces|leetcode>
 *  Returns up to 8 unsolved problems for the tag, sorted easiest first.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const tag = sp.get("tag")?.trim();
  const platform = sp.get("platform")?.trim() ?? "";

  if (!tag) {
    return NextResponse.json({ error: "tag is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const user = await getUser();

  let q = supabase
    .from("problems")
    .select("*")
    .contains("tags", [tag])
    .limit(50);

  if (platform) q = q.eq("platform", platform);

  const { data, error } = await q;

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: "No problems found for this tag." },
      { status: 404 },
    );
  }

  let solved: number[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("solved_problems")
      .eq("id", user.id)
      .single();
    solved = (profile?.solved_problems as number[] | null) ?? [];
  }

  const unsolved = data.filter(
    (p) => p.problem_number == null || !solved.includes(p.problem_number as number),
  );

  const sorted = unsolved.sort(
    (a, b) => difficultyOrder(a.difficulty as string | null) - difficultyOrder(b.difficulty as string | null),
  );

  const queue = sorted.slice(0, 8);

  if (queue.length === 0) {
    return NextResponse.json(
      { error: "All problems in this tag are already solved." },
      { status: 404 },
    );
  }

  return NextResponse.json({ tag, queue });
}
