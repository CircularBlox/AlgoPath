import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("problems")
    .select("*", { count: "exact", head: true });

  if (countError || !count) {
    return NextResponse.json({ error: "No problems found." }, { status: 404 });
  }

  const offset = Math.floor(Math.random() * count);

  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .range(offset, offset)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to fetch problem." },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
