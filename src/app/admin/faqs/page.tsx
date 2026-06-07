"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_at: string;
};

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faqs");
      if (res.ok) {
        const data = (await res.json()) as { faqs: Faq[] };
        setFaqs(data.faqs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on mount only
  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer,
          sortOrder: Number(sortOrder) || 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg(`Error: ${d.error ?? "Failed"}`);
        return;
      }
      setQuestion("");
      setAnswer("");
      setSortOrder("0");
      setMsg("FAQ added");
      await load();
    } catch {
      setMsg("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    setMsg(null);
    try {
      const res = await fetch("/api/admin/faqs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg(`Error: ${d.error ?? "Failed"}`);
        return;
      }
      await load();
    } catch {
      setMsg("Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">FAQ Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add questions and answers shown on the public /faq page. Lower sort
          order appears first.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Answer"
          rows={5}
          className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center gap-3">
          <label htmlFor="sort-order" className="text-sm font-medium shrink-0">
            Sort order
          </label>
          <input
            id="sort-order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            size="sm"
            className="ml-auto"
            disabled={saving || !question.trim() || !answer.trim()}
          >
            {saving ? "Adding…" : "Add FAQ"}
          </Button>
        </div>
        {msg && (
          <p
            className={`text-xs ${msg.startsWith("Error") ? "text-destructive" : "text-primary"}`}
          >
            {msg}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Existing ({faqs.length})
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        ) : (
          faqs.map((faq) => (
            <div
              key={faq.id}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{faq.question}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(faq.id)}
                  className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  Delete
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
              <span className="mt-1 text-xs text-muted-foreground/60">
                sort {faq.sort_order}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
