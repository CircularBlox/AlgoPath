"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll-reveal container. Adds `.in` once it enters the viewport; the CSS in
 * globals.css (`.reveal.in .ri`, `.spark`, `.hcell`) does the rest.
 */
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

/** Count-up number that animates 0 → value when scrolled into view. */
export function StatNum({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isNumeric = /^\d+$/.test(value);
  const [display, setDisplay] = useState(isNumeric ? "0" : value);

  useEffect(() => {
    if (!isNumeric) return;
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const target = Number.parseInt(value, 10);
    const run = () => {
      const t0 = performance.now();
      const dur = 900;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - (1 - p) ** 3;
        setDisplay(String(Math.round(eased * target)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            run();
          }
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, isNumeric]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

const TESTS = [
  { label: "test 1", time: "4ms", fail: false },
  { label: "test 2", time: "3ms", fail: false },
  { label: "test 3", time: "WA", fail: true },
];

/** Sample-runner that checks tests off green → green → rose `WA` on view. */
export function SampleRunner() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      setShown(TESTS.length);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            TESTS.forEach((_, i) => {
              timers.push(setTimeout(() => setShown(i + 1), 240 * (i + 1)));
            });
          }
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  return (
    <div ref={ref} className="space-y-1.5 font-mono text-[12px]">
      {TESTS.map((t, i) => {
        const revealed = i < shown;
        return (
          <div
            key={t.label}
            className={`flex items-center justify-between border-l-2 bg-muted/40 px-3 py-1.5 transition-all duration-200 ${
              revealed
                ? t.fail
                  ? "border-l-rose opacity-100"
                  : "border-l-green opacity-100"
                : "border-l-border opacity-30"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={t.fail ? "text-rose" : "text-green"}>
                {revealed ? (t.fail ? "✗" : "✓") : "·"}
              </span>
              <span className="text-muted-foreground">{t.label}</span>
            </span>
            <span className={t.fail ? "text-rose" : "text-muted-foreground"}>
              {revealed ? t.time : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
