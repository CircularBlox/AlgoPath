import { redirect } from "next/navigation";
import { generateCsrfToken } from "~/lib/security/csrf";
import { createClient, getUser } from "~/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const [user, supabase, csrfToken] = await Promise.all([
    getUser(),
    createClient(),
    generateCsrfToken(),
  ]);

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/display-problem");

  return <OnboardingForm csrfToken={csrfToken} />;
}
