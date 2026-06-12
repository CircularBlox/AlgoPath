import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdmin } from "~/lib/security/is-admin";
import { getUser } from "~/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    redirect("/");
  }
  return <>{children}</>;
}
