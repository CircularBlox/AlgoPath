"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";

type UserResult = {
  id: string;
  username: string;
  plan: string;
  email: string | null;
};

const PLAN_COLORS: Record<string, string> = {
  free: "text-muted-foreground bg-muted/40 border-border",
  pro: "text-primary bg-primary/10 border-primary/40",
  elite: "text-amber bg-amber/10 border-amber/40",
};

export default function AdminPlansPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<UserResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    setSearchError(null);
    setSaveMsg(null);
    try {
      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(query.trim())}`,
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSearchError(d.error ?? "Not found");
        return;
      }
      const data = (await res.json()) as UserResult;
      setResult(data);
      setSelectedPlan(data.plan ?? "free");
    } catch {
      setSearchError("Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: result.id, plan: selectedPlan }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveMsg(`Error: ${d.error ?? "Failed"}`);
        return;
      }
      setResult({ ...result, plan: selectedPlan });
      setSaveMsg(`Plan updated to ${selectedPlan}`);
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Plan Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by username or email and update their plan.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Username or email…"
          className="flex-1 rounded border border-input bg-input/30 px-3 py-2 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
        />
        <Button type="submit" size="sm" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>

      {searchError && (
        <p className="font-mono text-sm text-destructive">{searchError}</p>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted font-mono text-sm font-semibold">
              {result.username[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold">{result.username}</p>
              {result.email && (
                <p className="font-mono text-xs text-muted-foreground">
                  {result.email}
                </p>
              )}
            </div>
            <span
              className={`ml-auto rounded border px-2.5 py-0.5 font-mono text-xs font-semibold ${PLAN_COLORS[result.plan] ?? PLAN_COLORS.free}`}
            >
              {result.plan}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label
              htmlFor="plan-select"
              className="text-sm font-medium shrink-0"
            >
              Change plan
            </label>
            <select
              id="plan-select"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="flex-1 rounded border border-input bg-input/30 px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="elite">Elite</option>
            </select>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || selectedPlan === result.plan}
            >
              {saving ? "Saving…" : "Update"}
            </Button>
          </div>

          {saveMsg && (
            <p
              className={`font-mono text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-green"}`}
            >
              {saveMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
