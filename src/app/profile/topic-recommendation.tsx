"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { displayTag } from "~/lib/tags";

type Rec = { tag: string; reason: string };

export function TopicRecommendation() {
  const [rec, setRec] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = "topic_rec";
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setRec(JSON.parse(cached) as Rec);
        setLoading(false);
        return;
      } catch {}
    }

    fetch("/api/profiles/topic-recommendation")
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as Rec;
          setRec(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded border border-border px-5 py-4 flex flex-col gap-2">
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!rec) return null;

  return (
    <div className="flex flex-col gap-2.5 rounded border border-l-2 border-border border-l-violet bg-card px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{displayTag(rec.tag)}</span>
        <Link
          href={`/display-problem?drill=${encodeURIComponent(rec.tag)}`}
          className="shrink-0 rounded border border-violet/40 px-3 py-1 font-mono text-xs text-violet transition-colors hover:bg-violet/10"
        >
          Drill this →
        </Link>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {rec.reason}
      </p>
    </div>
  );
}
