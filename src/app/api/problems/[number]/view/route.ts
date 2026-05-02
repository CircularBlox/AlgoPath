import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json(null);

  const { number: raw } = await params;
  const problemNumber = Number(raw);
  if (!Number.isInteger(problemNumber) || problemNumber <= 0) {
    return NextResponse.json(null);
  }

  const supabase = await createClient();
  const { data: solve } = await supabase
    .from("solves")
    .select("solved_at, xp_gained, hints_used")
    .eq("user_id", user.id)
    .eq("problem_number", problemNumber)
    .order("solved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ solve: solve ?? null });
}
