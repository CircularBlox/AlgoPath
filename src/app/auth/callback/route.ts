import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // GitHub/Google redirect errors (e.g. user denied access)
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_denied`);
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  // Password recovery flow — send user to set a new password
  if (searchParams.get("type") === "recovery") {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  // Fast path: user_metadata is stored in the JWT — zero extra DB round-trip
  // for returning users who already confirmed their username.
  const meta = data.user.user_metadata ?? {};
  if (meta.username_confirmed) {
    if (!meta.onboarding_completed) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
    return NextResponse.redirect(`${origin}/display-problem`);
  }

  // Fallback DB check for new users or those who predate metadata storage.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.redirect(`${origin}/auth/setup-username`);
  }

  if (!profile.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}/display-problem`);
}
