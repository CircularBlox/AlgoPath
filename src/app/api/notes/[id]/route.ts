import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  let body: {
    title?: string;
    content?: string;
    problem_number?: number | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.title !== undefined) patch.title = body.title;
  if (body.content !== undefined) patch.content = body.content;
  if ("problem_number" in body) patch.problem_number = body.problem_number;

  const supabase = await createClient();
  const { error } = await supabase.from("notes").update(patch).eq("id", id);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "notes/[id]", method: "PATCH" },
      extra: { id },
    });
    return NextResponse.json(
      { error: "Failed to update note." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "notes/[id]", method: "DELETE" },
      extra: { id },
    });
    return NextResponse.json(
      { error: "Failed to delete note." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
