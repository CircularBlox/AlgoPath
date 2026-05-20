import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: {
    problem_number?: unknown;
    codes?: unknown;
    explanation?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const problemNumber = Number(body.problem_number);
  if (!problemNumber || Number.isNaN(problemNumber)) {
    return NextResponse.json(
      { error: "problem_number is required." },
      { status: 400 },
    );
  }

  if (
    !body.codes ||
    typeof body.codes !== "object" ||
    Array.isArray(body.codes)
  ) {
    return NextResponse.json(
      { error: "codes must be a Record<string, string>." },
      { status: 400 },
    );
  }

  const codes = body.codes as Record<string, string>;
  const explanation =
    typeof body.explanation === "string" && body.explanation.trim()
      ? body.explanation.trim()
      : null;

  const nonEmpty = Object.entries(codes).filter(([, v]) => v.trim());
  if (nonEmpty.length === 0) {
    return NextResponse.json(
      { error: "At least one language must have code." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: problem } = await supabase
    .from("problems")
    .select("title, problem_number")
    .eq("problem_number", problemNumber)
    .single();

  if (!problem) {
    return NextResponse.json(
      { error: `Problem #${problemNumber} not found.` },
      { status: 404 },
    );
  }

  // Find or create the parent solutions row
  const { data: existing } = await supabase
    .from("solutions")
    .select("id")
    .eq("problem_number", problemNumber)
    .maybeSingle();

  let solutionId: string;

  if (existing) {
    solutionId = existing.id;
    if (explanation !== null) {
      await supabase
        .from("solutions")
        .update({ explanation })
        .eq("id", solutionId);
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from("solutions")
      .insert({
        problem_name: problem.title,
        problem_number: problem.problem_number,
        ...(explanation !== null && { explanation }),
      })
      .select("id")
      .single();

    if (createError || !created) {
      if (createError) {
        Sentry.captureException(createError, {
          tags: { route: "admin/save-solution", step: "create_solution" },
          extra: { problemNumber },
        });
      }
      return NextResponse.json(
        { error: "Failed to create solution entry." },
        { status: 500 },
      );
    }
    solutionId = created.id;
  }

  // Upsert each non-empty language
  const upserts = nonEmpty.map(([language, code]) =>
    supabase.from("solution_codes").upsert(
      {
        solution_id: solutionId,
        language,
        code: code.trim(),
        problem_number: problem.problem_number,
      },
      { onConflict: "solution_id,language" },
    ),
  );

  const results = await Promise.all(upserts);
  const firstError = results.find((r) => r.error)?.error;

  if (firstError) {
    Sentry.captureException(firstError, {
      tags: { route: "admin/save-solution", step: "upsert_codes" },
      extra: { problemNumber },
    });
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Saved ${nonEmpty.length} language(s) for Problem #${problemNumber} — ${problem.title}`,
  });
}
