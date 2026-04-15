"use client";

import { useActionState, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { type SaveHintsState, saveHints } from "./actions";

const initial: SaveHintsState = { success: false };

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
    </main>
  );
}
