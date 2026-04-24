import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Password recovery flow — send user to set a new password
    if (searchParams.get("type") === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.user.id)
        .maybeSingle();
    
      // No profile → first time user
      if (!profile) {
        return NextResponse.redirect(`${origin}/auth/setup-username`);
      }
    
      // Not onboarded → onboarding flow
      if (!profile.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/display-problem`);
}
