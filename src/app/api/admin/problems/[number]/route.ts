import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "~/lib/security/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { getUser } from "~/lib/supabase/server";

const VALID_PLATFORMS = ["leetcode", "codeforces", "usaco", "atcoder", "other"];

function isValidDifficulty(d: unknown): d is string {
  if (typeof d !== "string") return false;
  if (["Easy", "Medium", "Hard"].includes(d)) return true;
  const n = Number(d);
  return Number.isInteger(n) && n >= 400 && n <= 3500;
}

type Params = { params: Promise<{ number: string }> };

/** GET /api/admin/problems/[number] — fetch a single problem including full content */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { number: numStr } = await params;
  const problemNumber = Number(numStr);
  if (!Number.isInteger(problemNumber) || problemNumber < 1) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("problems")
    .select(
      "id, problem_number, title, url, platform, difficulty, tags, content",
    )
    .eq("problem_number", problemNumber)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Problem not found." },
        { status: 404 },
      );
    }
    Sentry.captureException(error, {
      tags: { route: "admin/problems/[number]", method: "GET" },
    });
    return NextResponse.json(
      { error: "Failed to fetch problem.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ problem: data });
}

/**
 * PATCH /api/admin/problems/[number] — partial update of any problem field.
 *
 * Body (all fields optional):
 *   title       string
 *   url         string
 *   platform    "leetcode" | "codeforces" | "usaco" | "atcoder" | "other"
 *   difficulty  "Easy" | "Medium" | "Hard" | "<CF rating 400–3500>"
 *   tags        string[]
 *   content     string  (raw HTML for the problem statement)
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { number: numStr } = await params;
  const problemNumber = Number(numStr);
  if (!Number.isInteger(problemNumber) || problemNumber < 1) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json(
      { error: "No fields provided to update." },
      { status: 400 },
    );
  }

  // Build the update payload from only the keys present in the body
  const patch: Record<string, unknown> = {};

  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "title must be a non-empty string." },
        { status: 400 },
      );
    }
    patch.title = body.title.trim();
  }

  if ("url" in body) {
    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json(
        { error: "url must be a non-empty string." },
        { status: 400 },
      );
    }
    patch.url = body.url.trim();
  }

  if ("platform" in body) {
    if (
      typeof body.platform !== "string" ||
      !VALID_PLATFORMS.includes(body.platform.toLowerCase())
    ) {
      return NextResponse.json(
        { error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}.` },
        { status: 400 },
      );
    }
    patch.platform = body.platform.toLowerCase();
  }

  if ("difficulty" in body) {
    if (body.difficulty !== null && !isValidDifficulty(body.difficulty)) {
      return NextResponse.json(
        {
          error:
            "difficulty must be Easy, Medium, Hard, a numeric CF rating (400–3500), or null.",
        },
        { status: 400 },
      );
    }
    patch.difficulty = body.difficulty ?? null;
  }

  if ("tags" in body) {
    if (
      !Array.isArray(body.tags) ||
      body.tags.some((t) => typeof t !== "string")
    ) {
      return NextResponse.json(
        { error: "tags must be an array of strings." },
        { status: 400 },
      );
    }
    patch.tags = body.tags;
  }

  if ("content" in body) {
    if (body.content !== null && typeof body.content !== "string") {
      return NextResponse.json(
        { error: "content must be a string (HTML) or null." },
        { status: 400 },
      );
    }
    patch.content = body.content ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No recognised fields provided." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("problems")
    .update(patch)
    .eq("problem_number", problemNumber)
    .select(
      "id, problem_number, title, url, platform, difficulty, tags, content",
    )
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Problem not found." },
        { status: 404 },
      );
    }
    Sentry.captureException(error, {
      tags: { route: "admin/problems/[number]", method: "PATCH" },
    });
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A problem with that URL already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update problem.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ problem: data });
}

/** DELETE /api/admin/problems/[number] — permanently remove a problem and its hints */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { number: numStr } = await params;
  const problemNumber = Number(numStr);
  if (!Number.isInteger(problemNumber) || problemNumber < 1) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("problems")
    .delete()
    .eq("problem_number", problemNumber);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "admin/problems/[number]", method: "DELETE" },
    });
    return NextResponse.json(
      { error: "Failed to delete problem.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: problemNumber });
}
