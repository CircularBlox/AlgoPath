"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { type SaveHintsState, saveHints } from "./actions";

const initial: SaveHintsState = { success: false };

type BulkLogEntry = {
  problem_number: number;
  title: string;
  success: boolean;
  error?: string;
};

type BulkProgress = {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
};

export default function AddHintsPage() {
  const [state, formAction, isPending] = useActionState(saveHints, initial);

  const [problemNumber, setProblemNumber] = useState("");
  const [hint1, setHint1] = useState("");
  const [hint2, setHint2] = useState("");
  const [hint3, setHint3] = useState("");
  const [loadStatus, setLoadStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [genError, setGenError] = useState<string | null>(null);

  const [bulkStatus, setBulkStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [bulkProgress, setBulkProgress] = useState<BulkProgress>({
    current: 0,
    total: 0,
    succeeded: 0,
    failed: 0,
  });
  const [bulkLog, setBulkLog] = useState<BulkLogEntry[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  async function handleLoad() {
    const n = Number(problemNumber);
    if (!n) return;
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const res = await fetch(`/api/problems/${n}/hints`);
      const data = await res.json();
      if (!res.ok) {
        setLoadStatus("error");
        setLoadError(data.error ?? "Failed to load hints.");
        return;
      }
      setHint1(data.hint_1 ?? "");
      setHint2(data.hint_2 ?? "");
      setHint3(data.hint_3 ?? "");
      setLoadStatus("loaded");
    } catch {
      setLoadStatus("error");
      setLoadError("Failed to reach the server.");
    }
  }

  function handleBulkFill() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setBulkStatus("running");
    setBulkProgress({ current: 0, total: 0, succeeded: 0, failed: 0 });
    setBulkLog([]);
    setBulkError(null);

    const es = new EventSource("/api/admin/generate-hints-bulk");
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
        setBulkProgress((p) => ({ ...p, total: data.total ?? 0 }));
      } else if (data.type === "progress") {
        setBulkProgress((p) => ({
          current: data.current ?? p.current,
          total: data.total ?? p.total,
          succeeded: p.succeeded + (data.success ? 1 : 0),
          failed: p.failed + (data.success ? 0 : 1),
        }));
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

  async function handleGenerate() {
    const n = Number(problemNumber);
    if (!n) return;
    setGenStatus("loading");
    setGenError(null);
    try {
      const res = await fetch("/api/admin/generate-hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_number: n }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenStatus("error");
        setGenError(data.error ?? "Failed to generate hints.");
        return;
      }
      setHint1(data.hint_1 ?? "");
      setHint2(data.hint_2 ?? "");
      setHint3(data.hint_3 ?? "");
      setGenStatus("done");
    } catch {
      setGenStatus("error");
      setGenError("Failed to reach the server.");
    }
  }

  const textareaClass =
    "w-full min-h-[7rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 resize-y";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Add Hints</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Load existing hints, generate with AI, edit, and save.
        </p>
      </div>

      {/* Problem number + actions */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <Label htmlFor="problem_number_input">Problem Number</Label>
          <div className="flex gap-2">
            <Input
              id="problem_number_input"
              type="number"
              min={1}
              placeholder="e.g. 1"
              className="max-w-[10rem]"
              value={problemNumber}
              onChange={(e) => setProblemNumber(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleLoad}
              disabled={!problemNumber || loadStatus === "loading"}
            >
              {loadStatus === "loading" ? "Loading…" : "Load"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={!problemNumber || genStatus === "loading"}
            >
              {genStatus === "loading" ? "Generating…" : "Generate with AI"}
            </Button>
          </div>
        </div>

        {loadStatus === "error" && loadError && (
          <p className="text-sm text-destructive">{loadError}</p>
        )}
        {loadStatus === "loaded" && (
          <p className="text-sm text-muted-foreground">Hints loaded.</p>
        )}
        {genStatus === "error" && genError && (
          <p className="text-sm text-destructive">{genError}</p>
        )}
        {genStatus === "done" && (
          <p className="text-sm text-muted-foreground">
            AI hints generated — review and save below.
          </p>
        )}
      </div>

      {/* Save form */}
      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="problem_number" value={problemNumber} />

        {(
          [
            {
              n: 1,
              label: "Hint 1 — Observation",
              value: hint1,
              set: setHint1,
              name: "hint_1",
            },
            {
              n: 2,
              label: "Hint 2 — Direction",
              value: hint2,
              set: setHint2,
              name: "hint_2",
            },
            {
              n: 3,
              label: "Hint 3 — Outline",
              value: hint3,
              set: setHint3,
              name: "hint_3",
            },
          ] as const
        ).map(({ n, label, value, set, name }) => (
          <div key={n} className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <input type="hidden" name={name} value={value} />
            <textarea
              id={name}
              className={textareaClass}
              placeholder={`Hint ${n} text… (use $term$ for inline code)`}
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </div>
        ))}

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.success && state.message && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {state.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending || !problemNumber}
          className="self-start"
        >
          {isPending ? "Saving…" : "Save Hints"}
        </Button>
      </form>

      {/* Bulk fill section */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Bulk Fill Missing Hints
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Automatically generate and save AI hints for every problem that
            doesn&apos;t have them yet.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleBulkFill}
          disabled={bulkStatus === "running"}
        >
          {bulkStatus === "running" ? "Running…" : "Fill All Missing Hints"}
        </Button>

        {bulkStatus !== "idle" && (
          <div className="mt-4 flex flex-col gap-3">
            {/* Progress bar */}
            {bulkProgress.total > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">
                  {bulkStatus === "done"
                    ? `Done — ${bulkProgress.succeeded} succeeded, ${bulkProgress.failed} failed`
                    : `Processing ${bulkProgress.current} / ${bulkProgress.total}`}
                </p>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width:
                        bulkProgress.total > 0
                          ? `${(bulkProgress.current / bulkProgress.total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            )}

            {bulkProgress.total === 0 && bulkStatus === "done" && (
              <p className="text-sm text-muted-foreground">
                All problems already have hints.
              </p>
            )}

            {bulkError && (
              <p className="text-sm text-destructive">{bulkError}</p>
            )}

            {/* Live log */}
            {bulkLog.length > 0 && (
              <div
                ref={logRef}
                className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 flex flex-col gap-1"
              >
                {bulkLog.map((entry) => (
                  <div
                    key={entry.problem_number}
                    className="flex items-start gap-2 text-xs font-mono"
                  >
                    <span
                      className={
                        entry.success
                          ? "text-green-600 dark:text-green-400 shrink-0"
                          : "text-destructive shrink-0"
                      }
                    >
                      {entry.success ? "✓" : "✗"}
                    </span>
                    <span className="text-muted-foreground shrink-0">
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
      </div>
    </main>
  );
}
