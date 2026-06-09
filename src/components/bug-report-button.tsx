"use client";

import { useEffect, useRef, useState } from "react";

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit() {
    const text = description.trim();
    if (!text) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: text,
          page_url: window.location.href,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
      if (res.ok) {
        setDescription("");
        setTimeout(() => {
          setOpen(false);
          setStatus("idle");
        }, 1800);
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
        }}
        title="Report a bug"
        className="fixed bottom-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded border border-border bg-card transition-colors hover:bg-muted"
        aria-label="Report a bug"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 6h8M5 12h14M8 18h8" />
          <path d="M12 2a4 4 0 0 1 4 4v1H8V6a4 4 0 0 1 4-4z" />
          <path d="M5 12H2M22 12h-3M5 8l-2-2M21 6l-2 2M5 16l-2 2M21 18l-2-2" />
        </svg>
      </button>

      {/* Modal backdrop + dialog */}
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-50 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Report a bug"
            className="fixed bottom-20 right-5 z-50 w-full max-w-sm rounded border border-border bg-card p-5 sm:bottom-auto sm:right-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Report a bug</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {status === "sent" ? (
              <p className="py-4 text-center text-sm text-green">
                Thanks — report received.
              </p>
            ) : (
              <>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what went wrong…"
                  rows={4}
                  maxLength={2000}
                  disabled={status === "sending"}
                  className="w-full resize-none rounded border border-input bg-input/30 px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50 disabled:opacity-50"
                />
                {status === "error" && (
                  <p className="mt-1 text-xs text-destructive">
                    Failed to send. Try again.
                  </p>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!description.trim() || status === "sending"}
                    className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 hover:opacity-90"
                  >
                    {status === "sending" ? "Sending…" : "Send report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
