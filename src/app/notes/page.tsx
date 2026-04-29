"use client";

import { useEffect, useState } from "react";
import { useSettings } from "~/components/settings-provider";
import { createClient } from "~/lib/supabase/client";

interface Note {
  id: string;
  title: string;
  content: string;
  problem_number: number | null;
  updatedAt: number;
}

const STORAGE_KEY = "lumos-notes";
const MIGRATION_KEY = "lumos-notes-migrated";

function loadLocalNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (
      JSON.parse(raw) as Array<{
        id: string;
        title: string;
        content: string;
        updatedAt: number;
        problem_number?: number | null;
      }>
    ).map((n) => ({ ...n, problem_number: n.problem_number ?? null }));
  } catch {
    return [];
  }
}

function saveLocalNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export default function NotesPage() {
  const { settings } = useSettings();
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [problemInput, setProblemInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const autoSave = settings.autoSave === "on";

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      if (user) {
        // Load from Supabase first to confirm the table is available
        let apiAvailable = false;
        try {
          const res = await fetch("/api/notes");
          if (res.ok) {
            apiAvailable = true;
            const data = (await res.json()) as Array<{
              id: string;
              title: string;
              content: string;
              problem_number: number | null;
              updated_at: string;
            }>;
            setNotes(
              data.map((n) => ({
                id: n.id,
                title: n.title,
                content: n.content,
                problem_number: n.problem_number,
                updatedAt: new Date(n.updated_at).getTime(),
              })),
            );
          } else {
            // API unavailable (table may not exist yet) — show localStorage
            setNotes(loadLocalNotes());
          }
        } catch {
          setNotes(loadLocalNotes());
        }

        // One-time migration from localStorage — only runs when API is confirmed working
        if (apiAvailable && !localStorage.getItem(MIGRATION_KEY)) {
          const local = loadLocalNotes();
          if (local.length > 0) {
            const results = await Promise.allSettled(
              local.map((n) =>
                fetch("/api/notes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: n.title,
                    content: n.content,
                    problem_number: n.problem_number,
                  }),
                }),
              ),
            );
            // Only mark migrated if all succeeded
            if (results.every((r) => r.status === "fulfilled")) {
              localStorage.setItem(MIGRATION_KEY, "1");
              // Reload to show migrated notes with their new Supabase IDs
              const res2 = await fetch("/api/notes");
              if (res2.ok) {
                const data2 = (await res2.json()) as Array<{
                  id: string;
                  title: string;
                  content: string;
                  problem_number: number | null;
                  updated_at: string;
                }>;
                setNotes(
                  data2.map((n) => ({
                    id: n.id,
                    title: n.title,
                    content: n.content,
                    problem_number: n.problem_number,
                    updatedAt: new Date(n.updated_at).getTime(),
                  })),
                );
              }
            }
          } else {
            localStorage.setItem(MIGRATION_KEY, "1");
          }
        }
      } else {
        // Unauthenticated: localStorage
        setNotes(loadLocalNotes());
      }

      setLoading(false);
    }
    init();
  }, []);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setProblemInput(note.problem_number ? String(note.problem_number) : "");
    setSaveStatus("idle");
  }

  async function createNote() {
    if (userId) {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Untitled",
            content: "",
            problem_number: null,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            id: string;
            title: string;
            content: string;
            problem_number: number | null;
            updated_at: string;
          };
          const note: Note = {
            id: data.id,
            title: data.title,
            content: data.content,
            problem_number: data.problem_number,
            updatedAt: new Date(data.updated_at).getTime(),
          };
          setNotes((prev) => [note, ...prev]);
          selectNote(note);
          return;
        }
      } catch {
        // fall through
      }
    }

    // Unauthenticated fallback
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Untitled",
      content: "",
      problem_number: null,
      updatedAt: Date.now(),
    };
    setNotes((prev) => {
      const next = [note, ...prev];
      saveLocalNotes(next);
      return next;
    });
    selectNote(note);
  }

  async function updateNote() {
    if (!selectedId) return;
    const problemNum =
      problemInput.trim() && Number(problemInput) > 0
        ? Number(problemInput)
        : null;
    const updatedAt = Date.now();

    if (userId) {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/notes/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, problem_number: problemNum }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }

    setNotes((prev) => {
      const next = prev.map((n) =>
        n.id === selectedId
          ? { ...n, title, content, problem_number: problemNum, updatedAt }
          : n,
      );
      if (!userId) saveLocalNotes(next);
      return next;
    });
  }

  async function deleteNote() {
    if (!selectedId) return;

    if (userId) {
      try {
        await fetch(`/api/notes/${selectedId}`, { method: "DELETE" });
      } catch {
        // fail silently
      }
    }

    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== selectedId);
      if (!userId) saveLocalNotes(next);
      return next;
    });
    setSelectedId(null);
    setTitle("");
    setContent("");
    setProblemInput("");
    setSaveStatus("idle");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <button
          type="button"
          onClick={createNote}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New Note
        </button>
      </div>

      <div className="grid flex-1 grid-cols-[240px_1fr] gap-4 overflow-hidden rounded-lg border border-border">
        {/* Sidebar */}
        <div className="flex flex-col gap-1 overflow-y-auto border-r border-border p-2">
          {loading && (
            <p className="p-3 text-sm text-muted-foreground">Loading…</p>
          )}
          {!loading && notes.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              No notes yet. Create one to get started.
            </p>
          )}
          {notes.map((note) => (
            <button
              type="button"
              key={note.id}
              onClick={() => selectNote(note)}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                note.id === selectedId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <span className="block truncate font-medium">{note.title}</span>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs opacity-60">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                {note.problem_number && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] text-primary">
                    #{note.problem_number}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex flex-col gap-3 p-4">
          {selected ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={autoSave ? updateNote : undefined}
                placeholder="Note title"
                className="bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
              />

              {/* Problem link row */}
              <div className="flex items-center gap-2 border-b border-border/50 pb-2 text-xs text-muted-foreground">
                <span>Problem #</span>
                <input
                  type="number"
                  min={1}
                  value={problemInput}
                  onChange={(e) => setProblemInput(e.target.value)}
                  onBlur={autoSave ? updateNote : undefined}
                  placeholder="—"
                  className="w-16 bg-transparent outline-none placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                {problemInput && Number(problemInput) > 0 && (
                  <a
                    href={`/display-problem?p=${problemInput}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Open ↗
                  </a>
                )}
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={autoSave ? updateNote : undefined}
                placeholder="Start writing..."
                className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {saveStatus === "saving" && "Saving…"}
                  {saveStatus === "saved" && "Saved"}
                  {saveStatus === "error" && (
                    <span className="text-destructive">Save failed</span>
                  )}
                </span>
                <div className="flex gap-2">
                  {!autoSave && (
                    <button
                      type="button"
                      onClick={updateNote}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      {saveStatus === "saving" ? "Saving…" : "Save"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={deleteNote}
                    className="rounded-md px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a note or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
