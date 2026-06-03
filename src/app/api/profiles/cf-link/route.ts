import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { handle?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();

  if (body.handle === null || body.handle === "") {
    await supabase
      .from("profiles")
      .update({
        cf_handle: null,
        cf_rating: null,
        cf_max_rating: null,
        cf_rank: null,
      })
      .eq("id", user.id);
    return NextResponse.json({ ok: true, unlinked: true });
  }

  const handle = body.handle?.trim();
  if (!handle || !/^[a-zA-Z0-9_\-.]{1,24}$/.test(handle)) {
    return NextResponse.json(
      { error: "Invalid Codeforces handle" },
      { status: 400 },
    );
  }

  let cfData: {
    status: string;
    result?: {
      handle: string;
      rating?: number;
      maxRating?: number;
      rank?: string;
    }[];
    comment?: string;
  };

  try {
    const cfRes = await fetch(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    cfData = (await cfRes.json()) as typeof cfData;
  } catch {
    return NextResponse.json(
      { error: "Could not reach Codeforces API. Try again later." },
      { status: 502 },
    );
  }

  if (cfData.status !== "OK" || !cfData.result?.[0]) {
    return NextResponse.json(
      { error: cfData.comment ?? "Codeforces handle not found." },
      { status: 404 },
    );
  }

  const cfUser = cfData.result[0];
  await supabase
    .from("profiles")
    .update({
      cf_handle: cfUser.handle,
      cf_rating: cfUser.rating ?? null,
      cf_max_rating: cfUser.maxRating ?? null,
      cf_rank: cfUser.rank ?? null,
    })
    .eq("id", user.id);

  return NextResponse.json({
    handle: cfUser.handle,
    rating: cfUser.rating ?? null,
    max_rating: cfUser.maxRating ?? null,
    rank: cfUser.rank ?? null,
  });
}
