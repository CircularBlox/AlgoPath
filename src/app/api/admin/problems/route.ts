import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { getUser } from "~/lib/supabase/server";

const VALID_PLATFORMS = ["leetcode", "codeforces", "usaco", "atcoder", "other"];
const VALID_DIFFICULTIES = [
  "Easy",
  "Medium",
  "Hard",
  // numeric CF ratings also accepted
];

function isValidDifficulty(d: unknown): d is string {
  if (typeof d !== "string") return false;
  if (VALID_DIFFICULTIES.includes(d)) return true;
  const n = Number(d);
  return Number.isInteger(n) && n >= 400 && n <= 3500;
}

/** POST /api/admin/problems — create a new problem */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { title, url, platform, difficulty, tags, content } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json(
      { error: "title is required and must be a non-empty string." },
      { status: 400 },
    );
  }
  if (!url || typeof url !== "string" || !url.trim()) {
    return NextResponse.json(
      { error: "url is required and must be a non-empty string." },
      { status: 400 },
    );
  }
  if (
    platform !== undefined &&
    (typeof platform !== "string" ||
      !VALID_PLATFORMS.includes(platform.toLowerCase()))
  ) {
    return NextResponse.json(
      { error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}.` },
      { status: 400 },
    );
  }
  if (difficulty !== undefined && !isValidDifficulty(difficulty)) {
    return NextResponse.json(
      {
        error:
          "difficulty must be Easy, Medium, Hard, or a numeric CF rating (400–3500).",
      },
      { status: 400 },
    );
  }
  if (
    tags !== undefined &&
    (!Array.isArray(tags) || tags.some((t) => typeof t !== "string"))
  ) {
    return NextResponse.json(
      { error: "tags must be an array of strings." },
      { status: 400 },
    );
  }
  if (content !== undefined && typeof content !== "string") {
    return NextResponse.json(
      { error: "content must be a string (HTML)." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("problems")
    .insert({
      title: title.trim(),
      url: url.trim(),
      platform: (platform as string | undefined)?.toLowerCase() ?? "codeforces",
      difficulty: difficulty as string | null ?? null,
      tags: (tags as string[] | undefined) ?? [],
      content: (content as string | undefined) ?? null,
    })
    .select("id, problem_number, title, url, platform, difficulty, tags")
    .single();

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "admin/problems", method: "POST" },
    });
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A problem with that URL already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create problem.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ problem: data }, { status: 201 });
}

/** GET /api/admin/problems — list all problems (lightweight, for admin tooling) */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));
  const from = (page - 1) * limit;

  const supabase = createAdminClient();

  const { data, error, count } = await supabase
    .from("problems")
    .select(
      "id, problem_number, title, url, platform, difficulty, tags",
      { count: "exact" },
    )
    .order("problem_number")
    .range(from, from + limit - 1);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "admin/problems", method: "GET" },
    });
    return NextResponse.json(
      { error: "Failed to fetch problems.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    problems: data,
    total: count,
    page,
    limit,
  });
}
