import { createAdminClient } from "~/lib/supabase/admin";
import { type Report, ReportsList } from "./reports-list";

export default async function ReportsPage() {
  const supabase = createAdminClient();

  const { data: reports } = await supabase
    .from("problem_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Report[]>();

  const all = reports ?? [];
  const pendingCount = all.filter((r) => r.status === "pending").length;
  const resolvedCount = all.filter((r) => r.status !== "pending").length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        Problem Reports
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {pendingCount} pending · {resolvedCount} resolved
      </p>
      <ReportsList reports={all} />
    </main>
  );
}
