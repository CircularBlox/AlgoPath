import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { description: string; page_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json(
      { error: "Description is required." },
      { status: 400 },
    );
  }
  if (description.length > 2000) {
    return NextResponse.json(
      { error: "Description too long." },
      { status: 400 },
    );
  }

  const user = await getUser();
  const supabase = await createClient();

  const { error } = await supabase.from("bug_reports").insert({
    user_id: user?.id ?? null,
    description,
    page_url: body.page_url?.slice(0, 500) ?? null,
  });

  if (error) {
    Sentry.captureException(error, { tags: { route: "bug-report" } });
    return NextResponse.json(
      { error: "Failed to submit report." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
