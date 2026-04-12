import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      const provider = data.user.app_metadata?.provider as string | undefined;
      // GitHub and email signups always have a profile (created by trigger).
      // Only Google OAuth may lack one — skip the DB round-trip otherwise.
      if (provider !== "github" && provider !== "email") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();
        if (!profile) {
          return NextResponse.redirect(`${origin}/auth/setup-username`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/display-problem`);
}
