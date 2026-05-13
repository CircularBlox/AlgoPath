"use client";

import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { processHtmlLatex } from "~/lib/latex";
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
  applied: boolean;
  refetching: boolean;
  refetchError: string | null;
};

function HtmlPreview({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const processed = useMemo(() => processHtmlLatex(html), [html]);
  return (
    <div
      className={cn(
        "cf-problem overflow-auto rounded-lg border border-border bg-muted/20 p-4 text-sm",
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-only page, content from our own DB
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}

function IssueRow({
  issue,
  state,
  onChange,
  onDeny,
}: {
  issue: IOIssue;
  state: IssueState;
  onChange: (next: Partial<IssueState>) => void;
  onDeny: () => void;
}) {
  const {
    expanded,
    approved,
    activeTab,
    editedContent,
    applied,
    refetching,
    refetchError,
  } = state;

  async function handleRefetch() {
    onChange({ refetching: true, refetchError: null });
    try {
      const res = await fetch("/api/admin/refetch-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: issue.url,
          current_content: issue.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onChange({
          refetchError: (data as { error?: string }).error ?? "Refetch failed.",
          refetching: false,
        });
        return;
      }
      onChange({
        editedContent: (data as { proposed_content: string }).proposed_content,
        activeTab: "proposed",
        refetching: false,
      });
    } catch (err) {
      onChange({
        refetchError: err instanceof Error ? err.message : "An error occurred.",
        refetching: false,
      });
    }
  }

  if (applied) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 opacity-60">
        <span className="w-10 font-mono text-xs text-muted-foreground">
          #{issue.problem_number}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-muted-foreground">
          {issue.title}
        </span>
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          ✓ Applied
        </span>
      </div>
    );
  }

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
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
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

        <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
          {issue.platform}
        </span>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
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
            "shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
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

        {/* Deny button */}
        <button
          type="button"
          onClick={onDeny}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          Deny
        </button>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => onChange({ expanded: !expanded })}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
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
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <p className="flex-1 text-xs text-amber-700 dark:text-amber-400">
                Newlines were stripped by the scraper. Use{" "}
                <strong>Fetch from CF</strong> to pull correct content, or add
                newlines manually in the <strong>Edit HTML</strong> tab.
              </p>
              {issue.platform === "codeforces" && (
                <button
                  type="button"
                  onClick={handleRefetch}
                  disabled={refetching}
                  className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-400"
                >
                  {refetching ? "Fetching…" : "Fetch from CF"}
                </button>
              )}
            </div>
          )}

          {refetchError && (
            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {refetchError}
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

  function handleDeny(problemNumber: number) {
    setIssues(
      (prev) => prev?.filter((i) => i.problem_number !== problemNumber) ?? null,
    );
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
          applied: false,
          refetching: false,
          refetchError: null,
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

      // Mark applied issues as done (keep in list so admin can see what was applied)
      for (const num of typed.applied_numbers) {
        updateState(num, { applied: true, approved: false });
      }
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setApplying(false);
    }
  }

  const visibleIssues =
    issues?.filter((i) => !states[i.problem_number]?.applied) ?? [];
  const approvedCount = visibleIssues.filter(
    (i) => states[i.problem_number]?.approved,
  ).length;
  const appliedCount =
    issues?.filter((i) => states[i.problem_number]?.applied).length ?? 0;

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
          content — use Fetch from CF or edit manually). Previews render LaTeX
          as it appears to users.
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
                {appliedCount > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {" · "}
                    {appliedCount} applied
                  </span>
                )}
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
                    for (const issue of visibleIssues) {
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
                    for (const issue of visibleIssues) {
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
                onDeny={() => handleDeny(issue.problem_number)}
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
