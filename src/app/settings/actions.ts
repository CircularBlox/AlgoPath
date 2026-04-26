"use server";

import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient, getUser } from "~/lib/supabase/server";

export async function deleteAccount(): Promise<void> {
  const user = await getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError)
    Sentry.captureException(signOutError, {
      tags: { action: "deleteAccount", step: "sign_out" },
    });

  const adminClient = createAdminClient();
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
  );
  if (deleteError)
    Sentry.captureException(deleteError, {
      tags: { action: "deleteAccount", step: "delete_user" },
      extra: { userId: user.id },
    });

  redirect("/");
}
