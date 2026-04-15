import { redirect } from "next/navigation";
import { isAdmin } from "~/lib/is-admin";
import { getUser } from "~/lib/supabase/server";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!isAdmin(user?.email)) redirect("/");
  return <>{children}</>;
}
