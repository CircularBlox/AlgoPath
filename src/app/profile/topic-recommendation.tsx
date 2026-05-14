"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
      <div className="rounded-xl border border-border px-5 py-4 flex flex-col gap-2">
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!rec) return null;

  return (
    <div className="rounded-xl border border-border px-5 py-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{rec.tag}</span>
        <Link
          href={`/display-problem?drill=${encodeURIComponent(rec.tag)}`}
          className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-80 transition-opacity shrink-0"
        >
          Drill this →
        </Link>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {rec.reason}
      </p>
    </div>
  );
}
