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
      const provider = data.user.app_metadata?.provider as string | undefined;

      if (provider !== "github" && provider !== "email") {
        // Google OAuth may not have a profile yet
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, onboarding_completed")
          .eq("id", data.user.id)
          .maybeSingle();
        if (!profile) {
          return NextResponse.redirect(`${origin}/auth/setup-username`);
        }
        if (!profile.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      } else {
        // Email/GitHub: profile is always created by the trigger
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", data.user.id)
          .maybeSingle();
        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/display-problem`);
}
