import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/csrf";
import { createClient } from "~/lib/supabase/server";

const VALID_FOCUS = ["interviews", "comp_programming", "both"] as const;

export async function POST(request: NextRequest) {
  if (!(await validateCsrfToken(request.headers.get(CSRF_HEADER)))) {
    return NextResponse.json(
      { error: "Invalid or expired request token." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { focus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { focus } = body;
  if (!focus || !(VALID_FOCUS as readonly string[]).includes(focus)) {
    return NextResponse.json(
      { error: "Invalid focus value." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ focus })
    .eq("id", user.id);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "profiles/focus" },
      extra: { userId: user.id },
    });
    return NextResponse.json(
      { error: "Failed to save focus." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
