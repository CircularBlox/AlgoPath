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

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  // No profile → first time OAuth user needs a username
  if (!profile) {
    return NextResponse.redirect(`${origin}/auth/setup-username`);
  }

  // Not onboarded yet
  if (!profile.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}/display-problem`);
}
