"use client";

import { useRef, useState } from "react";
import { FormattedText } from "~/app/display-problem/formatting";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type FetchResult = {
  problem_number: number;
  title: string | null;
  editorial_url: string;
  sliced: boolean;
  saved: boolean;
  content: string;
};

type BulkLogEntry = {
  problem_number: number;
  title: string;
  success: boolean;
  error?: string;
};

type BulkProgress = { current: number; total: number };

export default function AdminEditorialsPage() {
  // Single / random fetch state.
  const [problemNumber, setProblemNumber] = useState("");
  const [save, setSave] = useState(true);
  const [missingOnly, setMissingOnly] = useState(true);
  const [fetching, setFetching] = useState<"single" | "random" | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Paste-HTML fallback for when Codeforces blocks automated fetches.
  const [pasteOpen, setPasteOpen] = useState(false);
  const [blogHtml, setBlogHtml] = useState("");
  const [editorialUrl, setEditorialUrl] = useState("");

  // Bulk state.
  const [bulkScope, setBulkScope] = useState<"missing" | "all">("missing");
  const [bulkStatus, setBulkStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [bulkProgress, setBulkProgress] = useState<BulkProgress>({
    current: 0,
    total: 0,
  });
  const [bulkSucceeded, setBulkSucceeded] = useState(0);
  const [bulkFailed, setBulkFailed] = useState(0);
  const [bulkLog, setBulkLog] = useState<BulkLogEntry[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  async function runFetch(mode: "single" | "random") {
    if (mode === "single" && !problemNumber) return;
    setFetching(mode);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/fetch-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "random"
            ? { random: true, missing_only: missingOnly, save }
            : {
                problem_number: Number(problemNumber),
                save,
                // Paste fallback only applies to a chosen problem.
                ...(blogHtml.trim() && { blog_html: blogHtml }),
                ...(editorialUrl.trim() && { editorial_url: editorialUrl }),
              },
        ),
      });
      const data = (await res.json()) as FetchResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Fetch failed.");
        // Surface the paste fallback when CF blocks the automated fetch.
        if (/anti-bot|blocking automated|HTTP 403/i.test(data.error ?? "")) {
          setPasteOpen(true);
        }
        return;
      }
      setResult(data);
      if (mode === "random") setProblemNumber(String(data.problem_number));
    } catch {
      setError("Network error while fetching the editorial.");
    } finally {
      setFetching(null);
    }
  }

  function runBulk() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setBulkStatus("running");
    setBulkProgress({ current: 0, total: 0 });
    setBulkSucceeded(0);
    setBulkFailed(0);
    setBulkLog([]);
    setBulkError(null);

    const es = new EventSource(
      `/api/admin/fetch-editorial-bulk?scope=${bulkScope}`,
    );
    esRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        total?: number;
        current?: number;
        problem_number?: number;
        title?: string;
        success?: boolean;
        error?: string;
        succeeded?: number;
        failed?: number;
      };

      if (data.type === "start") {
        setBulkProgress({ current: 0, total: data.total ?? 0 });
      } else if (data.type === "progress") {
        setBulkProgress({
          current: data.current ?? 0,
          total: data.total ?? 0,
        });
        if (data.success) setBulkSucceeded((n) => n + 1);
        else setBulkFailed((n) => n + 1);
        setBulkLog((log) => {
          const next = [
            ...log,
            {
              problem_number: data.problem_number ?? 0,
              title: data.title ?? "",
              success: data.success ?? false,
              error: data.error,
            },
          ];
          setTimeout(() => {
            if (logRef.current)
              logRef.current.scrollTop = logRef.current.scrollHeight;
          }, 0);
          return next;
        });
      } else if (data.type === "done") {
        setBulkStatus("done");
        es.close();
        esRef.current = null;
      }
    };

    es.onerror = () => {
      setBulkStatus("error");
      setBulkError("Connection lost or server error.");
      es.close();
      esRef.current = null;
    };
  }

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Codeforces Editorials
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scrape the official Codeforces editorial for a chosen problem, a
          random one, or every Codeforces problem at once. Backfills the
          editorial link; optionally stores the editorial body.
        </p>
      </div>

      {/* Single + random */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Single / Random
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="problem_number">Problem Number</Label>
            <Input
              id="problem_number"
              type="number"
              min={1}
              placeholder="e.g. 42"
              value={problemNumber}
              onChange={(e) => setProblemNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runFetch("single");
              }}
              className="w-40 font-mono"
            />
          </div>
          <Button
            onClick={() => runFetch("single")}
            disabled={!problemNumber || fetching !== null}
          >
            {fetching === "single" ? "Fetching…" : "Fetch"}
          </Button>
          <Button
            variant="outline"
            onClick={() => runFetch("random")}
            disabled={fetching !== null}
          >
            {fetching === "random" ? "Fetching…" : "Fetch Random CF"}
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={(e) => setMissingOnly(e.target.checked)}
            />
            Random: only without an editorial
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
            />
            Save editorial body to DB
          </label>
        </div>

        {/* Paste-HTML fallback — works when Codeforces blocks the auto-fetch. */}
        <div className="rounded border border-border bg-muted/20">
          <button
            type="button"
            onClick={() => setPasteOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="font-mono text-xs">{pasteOpen ? "▾" : "▸"}</span>
            Paste editorial HTML (use when CF blocks the auto-fetch)
          </button>
          {pasteOpen && (
            <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Codeforces blocks automated requests with an anti-bot challenge.
                Open the editorial blog in your browser, view page source
                (Ctrl/Cmd+U), copy all, and paste it here — then click{" "}
                <span className="font-mono">Fetch</span> for the chosen problem
                number. Optionally paste the blog URL so the “Read editorial”
                link is stored.
              </p>
              <Input
                placeholder="Editorial blog URL (optional) — https://codeforces.com/blog/entry/…"
                value={editorialUrl}
                onChange={(e) => setEditorialUrl(e.target.value)}
                className="font-mono text-xs"
              />
              <textarea
                value={blogHtml}
                onChange={(e) => setBlogHtml(e.target.value)}
                placeholder="Paste the full editorial blog page HTML here…"
                rows={6}
                className="w-full rounded border border-input bg-input/30 px-3 py-2 font-mono text-xs leading-relaxed outline-none resize-y"
              />
              {blogHtml.trim() && (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-green">
                    {blogHtml.length.toLocaleString()} chars ready — Fetch will
                    parse this instead of calling CF.
                  </span>
                  <button
                    type="button"
                    onClick={() => setBlogHtml("")}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="font-mono text-sm text-destructive">{error}</p>}

        {result && (
          <div className="flex flex-col gap-3 rounded border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-cyan font-mono">
                #{result.problem_number}
              </span>
              <span className="font-medium text-foreground">
                {result.title}
              </span>
              <a
                href={result.editorial_url}
                target="_blank"
                rel="noreferrer"
                className="text-violet underline underline-offset-2"
              >
                editorial ↗
              </a>
              <span
                className={
                  result.sliced
                    ? "font-mono text-xs text-green"
                    : "font-mono text-xs text-amber"
                }
              >
                {result.sliced
                  ? "sliced to this problem"
                  : "full contest editorial — trim before use"}
              </span>
              {result.saved && (
                <span className="font-mono text-xs text-green">saved ✓</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-muted-foreground">
                  {"// rendered"}
                </span>
                <div className="rounded border border-border bg-muted/20 p-4 text-sm leading-relaxed max-h-[28rem] overflow-auto">
                  <FormattedText text={result.content} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-muted-foreground">
                  {"// markdown"}
                </span>
                <textarea
                  readOnly
                  value={result.content}
                  className="h-[28rem] w-full rounded border border-input bg-input/30 px-3 py-2 font-mono text-xs leading-relaxed outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bulk */}
      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            All Codeforces Problems
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scrape and store editorials across every Codeforces problem. Saves
            the editorial body and link for each. Runs ~1.5s apart to stay
            polite to Codeforces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="radio"
              name="scope"
              checked={bulkScope === "missing"}
              onChange={() => setBulkScope("missing")}
            />
            Only missing editorials
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="radio"
              name="scope"
              checked={bulkScope === "all"}
              onChange={() => setBulkScope("all")}
            />
            Re-scrape all
          </label>
          <Button
            variant="outline"
            onClick={runBulk}
            disabled={bulkStatus === "running"}
          >
            {bulkStatus === "running" ? "Running…" : "Fetch All CF Editorials"}
          </Button>
        </div>

        {bulkStatus !== "idle" && (
          <div className="flex flex-col gap-3">
            {bulkProgress.total > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="font-mono text-sm text-muted-foreground">
                  {bulkStatus === "done"
                    ? `Done — ${bulkSucceeded} succeeded, ${bulkFailed} failed`
                    : `Processing ${bulkProgress.current} / ${bulkProgress.total} (${bulkSucceeded} ok, ${bulkFailed} failed)`}
                </p>
                <div className="h-2 w-full rounded bg-muted overflow-hidden">
                  <div
                    className="h-full rounded bg-primary transition-all duration-300"
                    style={{
                      width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              bulkStatus === "done" && (
                <p className="font-mono text-sm text-muted-foreground">
                  No Codeforces problems matched.
                </p>
              )
            )}

            {bulkError && (
              <p className="font-mono text-sm text-destructive">{bulkError}</p>
            )}

            {bulkLog.length > 0 && (
              <div
                ref={logRef}
                className="max-h-72 overflow-y-auto rounded border border-border bg-muted/30 px-3 py-2 flex flex-col gap-1"
              >
                {bulkLog.map((entry) => (
                  <div
                    key={entry.problem_number}
                    className="flex items-start gap-2 text-xs font-mono"
                  >
                    <span
                      className={
                        entry.success
                          ? "text-green shrink-0"
                          : "text-destructive shrink-0"
                      }
                    >
                      {entry.success ? "✓" : "✗"}
                    </span>
                    <span className="text-cyan shrink-0">
                      #{entry.problem_number}
                    </span>
                    <span className="text-foreground">{entry.title}</span>
                    {entry.error && (
                      <span className="text-destructive ml-1">
                        — {entry.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
