import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json([]);

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("solved_problems")
    .eq("id", user.id)
    .single<{ solved_problems: number[] | null }>();

  const solvedNumbers = (profile?.solved_problems as number[] | null) ?? [];

  const [notesRes, reviewsRes] = await Promise.all([
    supabase
      .from("notes")
      .select("problem_number, updated_at")
      .eq("user_id", user.id)
      .not("problem_number", "is", null)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("code_reviews")
      .select("problem_number, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const seen = new Set<number>();
  const pairs: { num: number; ts: string }[] = [];

  for (const n of notesRes.data ?? []) {
    if (n.problem_number != null && !seen.has(n.problem_number)) {
      seen.add(n.problem_number);
      pairs.push({ num: n.problem_number, ts: n.updated_at });
    }
  }
  for (const r of reviewsRes.data ?? []) {
    if (!seen.has(r.problem_number)) {
      seen.add(r.problem_number);
      pairs.push({ num: r.problem_number, ts: r.created_at });
    }
  }

  const candidates = pairs
    .filter((p) => !solvedNumbers.includes(p.num))
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 5)
    .map((p) => p.num);

  if (candidates.length === 0) return NextResponse.json([]);

  const { data: problems } = await supabase
    .from("problems")
    .select(
      "id, problem_number, title, url, platform, difficulty, tags, content",
    )
    .in("problem_number", candidates);

  const ordered = candidates
    .map((num) => (problems ?? []).find((p) => p.problem_number === num))
    .filter(Boolean);

  return NextResponse.json(ordered);
}
