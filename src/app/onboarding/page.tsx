import { redirect } from "next/navigation";
import { createClient, getUser } from "~/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/display-problem");

  return <OnboardingForm />;
}
