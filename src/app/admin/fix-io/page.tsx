"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type IOIssue = {
  problem_number: number;
  title: string;
  url: string;
  platform: string;
  content: string;
  proposed_content: string;
  issue_type: "merged-io" | "no-newlines";
};

type IssueState = {
  approved: boolean;
  expanded: boolean;
  activeTab: "current" | "proposed" | "edit";
  editedContent: string;
};

function HtmlPreview({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "cf-problem overflow-auto rounded-lg border border-border bg-muted/20 p-4 text-sm",
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-only page, content from our own DB
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function IssueRow({
  issue,
  state,
  onChange,
}: {
  issue: IOIssue;
  state: IssueState;
  onChange: (next: Partial<IssueState>) => void;
}) {
  const { expanded, approved, activeTab, editedContent } = state;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        approved
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border bg-card",
      )}
    >
      {/* Row header */}
      <div className="flex items-center gap-4 px-4 py-3">
        <span className="w-10 font-mono text-xs text-muted-foreground">
          #{issue.problem_number}
        </span>

        <div className="min-w-0 flex-1">
          <span className="block truncate font-medium text-sm">
            {issue.title}
          </span>
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {issue.url}
          </a>
        </div>

        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
          {issue.platform}
        </span>

        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-medium",
            issue.issue_type === "no-newlines"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
          )}
        >
          {issue.issue_type === "no-newlines" ? "no newlines" : "merged I/O"}
        </span>

        {/* Approve toggle */}
        <button
          type="button"
          onClick={() => onChange({ approved: !approved })}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            approved
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {approved ? (
            <>
              <svg
                viewBox="0 0 12 12"
                fill="none"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Approved
            </>
          ) : (
            "Approve"
          )}
        </button>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => onChange({ expanded: !expanded })}
          className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {issue.issue_type === "no-newlines" && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Newlines were stripped by the scraper. Auto-fix is not possible —
              add them manually in the <strong>Edit HTML</strong> tab, then
              approve.
            </div>
          )}
          {/* Tabs */}
          <div className="mb-3 flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
            {(["current", "proposed", "edit"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onChange({ activeTab: tab })}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "edit"
                  ? "Edit HTML"
                  : tab === "current"
                    ? "Current (broken)"
                    : "Proposed fix"}
              </button>
            ))}
          </div>

          {activeTab === "current" && (
            <HtmlPreview html={issue.content} className="max-h-96" />
          )}

          {activeTab === "proposed" && (
            <HtmlPreview html={editedContent} className="max-h-96" />
          )}

          {activeTab === "edit" && (
            <textarea
              value={editedContent}
              onChange={(e) => onChange({ editedContent: e.target.value })}
              className="h-96 w-full rounded-lg border border-border bg-muted/20 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
              spellCheck={false}
            />
          )}

          {activeTab === "edit" && editedContent !== issue.proposed_content && (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              Manually edited — differs from auto-generated fix.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FixIOPage() {
  const [scanning, setScanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [issues, setIssues] = useState<IOIssue[] | null>(null);
  const [states, setStates] = useState<Record<number, IssueState>>({});
  const [totalScanned, setTotalScanned] = useState<number | null>(null);
  const [applyResult, setApplyResult] = useState<{
    applied: number;
    errors: Array<{ problem_number: number; error: string }>;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  function updateState(problemNumber: number, next: Partial<IssueState>) {
    setStates((prev) => ({
      ...prev,
      [problemNumber]: { ...prev[problemNumber], ...next },
    }));
  }

  async function handleScan() {
    setScanning(true);
    setScanError(null);
    setApplyResult(null);
    setIssues(null);
    setStates({});
    setTotalScanned(null);

    try {
      const res = await fetch("/api/admin/fix-io");
      const data = await res.json();

      if (!res.ok) {
        setScanError((data as { error?: string }).error ?? "Scan failed.");
        return;
      }

      const typed = data as { issues: IOIssue[]; total_scanned: number };
      setIssues(typed.issues);
      setTotalScanned(typed.total_scanned);

      const initialStates: Record<number, IssueState> = {};
      for (const issue of typed.issues) {
        initialStates[issue.problem_number] = {
          approved: false,
          expanded: false,
          activeTab: "proposed",
          editedContent: issue.proposed_content,
        };
      }
      setStates(initialStates);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setScanning(false);
    }
  }

  async function handleApply() {
    if (!issues) return;
    const approved = issues.filter((i) => states[i.problem_number]?.approved);
    if (approved.length === 0) return;

    setApplying(true);
    setApplyError(null);
    setApplyResult(null);

    try {
      const res = await fetch("/api/admin/fix-io", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixes: approved.map((i) => ({
            problem_number: i.problem_number,
            content: states[i.problem_number].editedContent,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApplyError((data as { error?: string }).error ?? "Apply failed.");
        return;
      }

      const typed = data as {
        applied: number;
        applied_numbers: number[];
        errors: Array<{ problem_number: number; error: string }>;
      };
      setApplyResult({ applied: typed.applied, errors: typed.errors });

      // Remove successfully applied issues from the list
      if (typed.applied > 0) {
        setIssues(
          (prev) =>
            prev?.filter(
              (i) => !typed.applied_numbers.includes(i.problem_number),
            ) ?? null,
        );
      }
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setApplying(false);
    }
  }

  const approvedCount =
    issues?.filter((i) => states[i.problem_number]?.approved).length ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-1.5 text-2xl font-bold tracking-tight">
          Fix Sample I/O
        </h1>
        <p className="text-sm text-muted-foreground">
          Detects two scraper issues:{" "}
          <span className="text-sky-700 dark:text-sky-400 font-medium">
            merged I/O
          </span>{" "}
          (Input and Output in a single{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            &lt;pre&gt;
          </code>
          , auto-fixable) and{" "}
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            no newlines
          </span>{" "}
          (newlines stripped from{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            &lt;pre&gt;
          </code>{" "}
          content, requires manual editing). Review each issue, edit HTML as
          needed, then approve and apply.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center gap-4">
        <Button onClick={handleScan} disabled={scanning || applying}>
          {scanning ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Scanning…
            </span>
          ) : issues !== null ? (
            "Re-scan"
          ) : (
            "Scan problems"
          )}
        </Button>

        {totalScanned !== null && (
          <span className="text-sm text-muted-foreground">
            {totalScanned} problems scanned
            {issues !== null && (
              <>
                {" · "}
                <span
                  className={cn(
                    issues.length > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {issues.length} issue{issues.length !== 1 ? "s" : ""} found
                </span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Scan error */}
      {scanError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {scanError}
        </div>
      )}

      {/* Apply result */}
      {applyResult && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            {applyResult.applied} fix{applyResult.applied !== 1 ? "es" : ""}{" "}
            applied.
          </span>
          {applyResult.errors.length > 0 && (
            <ul className="mt-1 text-destructive">
              {applyResult.errors.map((e) => (
                <li key={e.problem_number}>
                  #{e.problem_number}: {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Apply error */}
      {applyError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {applyError}
        </div>
      )}

      {/* Issues list */}
      {issues !== null && issues.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
          No I/O issues detected.
        </div>
      )}

      {issues !== null && issues.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStates((prev) => {
                    const next = { ...prev };
                    for (const issue of issues) {
                      next[issue.problem_number] = {
                        ...next[issue.problem_number],
                        approved: true,
                      };
                    }
                    return next;
                  });
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                Approve all
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => {
                  setStates((prev) => {
                    const next = { ...prev };
                    for (const issue of issues) {
                      next[issue.problem_number] = {
                        ...next[issue.problem_number],
                        approved: false,
                      };
                    }
                    return next;
                  });
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            </div>

            {approvedCount > 0 && (
              <Button
                onClick={handleApply}
                disabled={applying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {applying ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Applying…
                  </span>
                ) : (
                  `Apply ${approvedCount} approved`
                )}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {issues.map((issue) => (
              <IssueRow
                key={issue.problem_number}
                issue={issue}
                state={states[issue.problem_number]}
                onChange={(next) => updateState(issue.problem_number, next)}
              />
            ))}
          </div>

          {approvedCount > 0 && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleApply}
                disabled={applying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {applying ? "Applying…" : `Apply ${approvedCount} approved`}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
