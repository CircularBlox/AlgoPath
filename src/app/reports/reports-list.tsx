"use client";

import { useRef, useState, useTransition } from "react";
import { resolveReport } from "./actions";

export type Report = {
  id: string;
  problem_number: number;
  user_id: string;
  description: string | null;
  status: string;
  type: string;
  suggested_difficulty: string | null;
  recommended_difficulty: string | null;
  created_at: string;
};

type Tab = "general" | "difficulty";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  done: "Done",
  rejected: "Rejected",
};

const STATUS_CLASS: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function ReportsList({ reports }: { reports: Report[] }) {
  const [tab, setTab] = useState<Tab>("general");

  const generalReports = reports.filter((r) => r.type !== "difficulty");
  const diffReports = reports.filter((r) => r.type === "difficulty");

  const shown = tab === "general" ? generalReports : diffReports;
  const pending = shown.filter((r) => r.status === "pending");
  const resolved = shown.filter((r) => r.status !== "pending");

  const generalPending = generalReports.filter(
    (r) => r.status === "pending",
  ).length;
  const diffPending = diffReports.filter((r) => r.status === "pending").length;

  return (
    <>
      {/* Tabs */}
      <div className="mb-8 flex border-b border-border">
        <TabButton
          active={tab === "general"}
          badge={generalPending}
          onClick={() => setTab("general")}
        >
          General Reports
        </TabButton>
        <TabButton
          active={tab === "difficulty"}
          badge={diffPending}
          onClick={() => setTab("difficulty")}
        >
          Difficulty Suggestions
        </TabButton>
      </div>

      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      )}

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pending
          </h2>
          <div className="flex flex-col gap-4">
            {pending.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Resolved
          </h2>
          <div className="flex flex-col gap-4">
            {resolved.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function TabButton({
  active,
  badge,
  onClick,
  children,
}: {
  active: boolean;
  badge: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {badge > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

function ReportCard({ report }: { report: Report }) {
  const isPending = report.status === "pending";
  const diffInputRef = useRef<HTMLInputElement>(null);
  const [confirmDiff, setConfirmDiff] = useState<string | null>(null);
  const [isPending2, startTransition] = useTransition();

  const date = new Date(report.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function handleMarkDone() {
    const diff = diffInputRef.current?.value.trim() ?? "";
    if (diff) {
      // Show inline confirmation when a difficulty is being applied
      setConfirmDiff(diff);
    } else {
      submitResolve("done", "");
    }
  }

  function submitResolve(status: string, diff: string) {
    const formData = new FormData();
    formData.set("report_id", report.id);
    formData.set("problem_number", String(report.problem_number));
    formData.set("status", status);
    if (diff) formData.set("recommended_difficulty", diff);
    startTransition(() => resolveReport(formData));
    setConfirmDiff(null);
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">
            Problem #{report.problem_number}
          </span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[report.status] ?? ""}`}
        >
          {STATUS_LABEL[report.status] ?? report.status}
        </span>
      </div>

      {report.type === "difficulty" && report.suggested_difficulty && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Suggested:</span>
          <span className="text-sm font-semibold">
            {report.suggested_difficulty}
          </span>
        </div>
      )}

      {report.description && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {report.description}
        </p>
      )}

      {report.recommended_difficulty && (
        <p className="text-xs text-muted-foreground">
          Applied difficulty:{" "}
          <span className="font-medium text-foreground">
            {report.recommended_difficulty}
          </span>
        </p>
      )}

      {isPending && (
        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`diff-${report.id}`}
              className="text-xs text-muted-foreground"
            >
              Recommended difficulty (optional)
            </label>
            <input
              ref={diffInputRef}
              id={`diff-${report.id}`}
              type="text"
              placeholder="e.g. 1200"
              defaultValue={report.suggested_difficulty ?? ""}
              className="h-8 w-36 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {confirmDiff ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Change difficulty to{" "}
                <span className="font-semibold text-foreground">
                  {confirmDiff}
                </span>
                ?
              </span>
              <button
                type="button"
                disabled={isPending2}
                onClick={() => submitResolve("done", confirmDiff)}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending2 ? "Saving…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDiff(null)}
                className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={isPending2}
                onClick={handleMarkDone}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Mark Done
              </button>
              <button
                type="button"
                disabled={isPending2}
                onClick={() => submitResolve("rejected", "")}
                className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
