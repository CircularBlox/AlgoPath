"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient, getUser } from "~/lib/supabase/server";

export async function deleteAccount(): Promise<void> {
  const user = await getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // Sign out first so the session cookie is cleared
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Delete the auth user — cascades to profiles table
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(user.id);

  redirect("/");
}
