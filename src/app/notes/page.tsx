"use client";

import { useEffect, useState } from "react";
import { useSettings } from "~/components/settings-provider";
import { highlight, languages } from "~/lib/prism-setup";
import { createClient } from "~/lib/supabase/client";

const LANG_GRAMMARS: Record<string, Prism.Grammar> = {
  "C++": languages.cpp,
  Java: languages.java,
  JavaScript: languages.javascript,
  Python: languages.python,
};

const EDITOR_FONT =
  '"JetBrains Mono","Fira Code","Fira Mono",ui-monospace,monospace';

interface Note {
  id: string;
  title: string;
  content: string;
  code: string;
  code_language: string;
  problem_number: number | null;
  updatedAt: number;
}

const STORAGE_KEY = "lumos-notes";
const MIGRATION_KEY = "lumos-notes-migrated";

type ApiNote = {
  id: string;
  title: string;
  content: string;
  code?: string;
  code_language?: string;
  problem_number: number | null;
  updated_at: string;
};

function apiToNote(n: ApiNote): Note {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    code: n.code ?? "",
    code_language: n.code_language ?? "C++",
    problem_number: n.problem_number,
    updatedAt: new Date(n.updated_at).getTime(),
  };
}

function loadLocalNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map((n) => ({
      id: String(n.id ?? ""),
      title: String(n.title ?? ""),
      content: String(n.content ?? ""),
      code: String(n.code ?? ""),
      code_language: String(n.code_language ?? "C++"),
      problem_number:
        typeof n.problem_number === "number" ? n.problem_number : null,
      updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
    }));
  } catch {
    return [];
  }
}

function saveLocalNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

const LANGUAGES = ["C++", "Python", "Java", "JavaScript"] as const;

export default function NotesPage() {
  const { settings } = useSettings();
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [code, setCode] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("C++");
  const [problemInput, setProblemInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [activeSection, setActiveSection] = useState<"notes" | "code">("notes");

  const autoSave = settings.autoSave === "on";

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      if (user) {
        let apiAvailable = false;
        try {
          const res = await fetch("/api/notes");
          if (res.ok) {
            apiAvailable = true;
            const data = (await res.json()) as ApiNote[];
            setNotes(data.map(apiToNote));
          } else {
            setNotes(loadLocalNotes());
          }
        } catch {
          setNotes(loadLocalNotes());
        }

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
                    code: n.code,
                    code_language: n.code_language,
                    problem_number: n.problem_number,
                  }),
                }),
              ),
            );
            if (results.every((r) => r.status === "fulfilled")) {
              localStorage.setItem(MIGRATION_KEY, "1");
              const res2 = await fetch("/api/notes");
              if (res2.ok) {
                const data2 = (await res2.json()) as ApiNote[];
                setNotes(data2.map(apiToNote));
              }
            }
          } else {
            localStorage.setItem(MIGRATION_KEY, "1");
          }
        }
      } else {
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
    setCode(note.code);
    setCodeLanguage(note.code_language);
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
            code: "",
            code_language: "C++",
            problem_number: null,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as ApiNote;
          const note = apiToNote(data);
          setNotes((prev) => [note, ...prev]);
          selectNote(note);
          return;
        }
      } catch {
        // fall through
      }
    }

    const note: Note = {
      id: crypto.randomUUID(),
      title: "Untitled",
      content: "",
      code: "",
      code_language: "C++",
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
          body: JSON.stringify({
            title,
            content,
            code,
            code_language: codeLanguage,
            problem_number: problemNum,
          }),
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
          ? {
              ...n,
              title,
              content,
              code,
              code_language: codeLanguage,
              problem_number: problemNum,
              updatedAt,
            }
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
    setCode("");
    setCodeLanguage("C++");
    setProblemInput("");
    setSaveStatus("idle");
  }

  function handleCodeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = `${ta.value.substring(0, start)}  ${ta.value.substring(end)}`;
      setCode(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", start - 1) + 1;
      const line = ta.value.substring(lineStart, start);
      const indent = line.match(/^(\s*)/)?.[1] ?? "";
      const next = `${ta.value.substring(0, start)}\n${indent}${ta.value.substring(ta.selectionEnd)}`;
      setCode(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1 + indent.length;
      });
    }
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

      <div className="grid flex-1 grid-cols-[240px_1fr] gap-4 overflow-hidden rounded border border-border">
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
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs opacity-60">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                {note.problem_number && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] text-primary">
                    #{note.problem_number}
                  </span>
                )}
                {note.code && (
                  <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground font-mono">
                    {note.code_language}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex flex-col gap-0 overflow-hidden">
          {selected ? (
            <>
              {/* Header fields */}
              <div className="flex flex-col gap-2 p-4 pb-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={autoSave ? updateNote : undefined}
                  placeholder="Note title"
                  maxLength={200}
                  className="bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
              </div>

              {/* Section tabs */}
              <div className="flex border-b border-border bg-muted/20">
                {(["notes", "code"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSection(tab)}
                    className={`px-4 py-2 text-xs font-medium transition-colors capitalize ${
                      activeSection === tab
                        ? "border-b-2 border-primary bg-background text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "notes" ? "Notes" : "Code Editor"}
                  </button>
                ))}
              </div>

              {/* Notes section */}
              {activeSection === "notes" && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={autoSave ? updateNote : undefined}
                  placeholder="Start writing..."
                  maxLength={10000}
                  className="flex-1 resize-none bg-transparent p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
                />
              )}

              {/* Code editor section */}
              {activeSection === "code" && (
                <div className="flex flex-1 flex-col gap-0 overflow-hidden">
                  <div className="flex items-center gap-1 flex-wrap border-b border-border/50 px-3 py-2 bg-muted/10">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setCodeLanguage(lang)}
                        className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          codeLanguage === lang
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {code.length}/50000
                    </span>
                  </div>
                  {/* Prism overlay editor */}
                  <div
                    className="relative flex-1 overflow-hidden"
                    style={{ background: "#1e1e2e" }}
                  >
                    <pre
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        margin: 0,
                        padding: "1rem",
                        fontFamily: EDITOR_FONT,
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        overflowY: "auto",
                        overflowX: "hidden",
                        pointerEvents: "none",
                        color: "#cdd6f4",
                        background: "transparent",
                        tabSize: 2,
                      }}
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: Prism output is sanitised HTML
                      dangerouslySetInnerHTML={{
                        __html: `${highlight(
                          code || " ",
                          LANG_GRAMMARS[codeLanguage] ?? languages.clike,
                          codeLanguage,
                        )}\n`,
                      }}
                    />
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onBlur={autoSave ? updateNote : undefined}
                      onKeyDown={handleCodeKeyDown}
                      onScroll={(e) => {
                        const pre = e.currentTarget
                          .previousElementSibling as HTMLPreElement | null;
                        if (pre) pre.scrollTop = e.currentTarget.scrollTop;
                      }}
                      placeholder={`Write or paste ${codeLanguage} code here…`}
                      maxLength={50000}
                      spellCheck={false}
                      style={{
                        position: "absolute",
                        inset: 0,
                        margin: 0,
                        padding: "1rem",
                        fontFamily: EDITOR_FONT,
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        overflowY: "auto",
                        overflowX: "hidden",
                        resize: "none",
                        background: "transparent",
                        color: "transparent",
                        caretColor: "#cdd6f4",
                        outline: "none",
                        tabSize: 2,
                        zIndex: 1,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border px-4 py-2">
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
