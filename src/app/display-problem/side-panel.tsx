"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { highlight, languages } from "~/lib/prism-setup";
import type { ChatMessage, NoteItem } from "./types";

const MIN_PANEL_W = 300;
const MAX_PANEL_W = 900;

const LANG_GRAMMARS: Record<string, Prism.Grammar> = {
  "C++": languages.cpp,
  Java: languages.java,
  JavaScript: languages.javascript,
  Python: languages.python,
};

const EDITOR_FONT =
  '"JetBrains Mono","Fira Code","Fira Mono",ui-monospace,monospace';

const TABS = [
  {
    id: "notes" as const,
    label: "Notes",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "code" as const,
    label: "Code",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: "ai" as const,
    label: "AI",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
] as const;

export interface SidePanelProps {
  // panel
  activeTab: "notes" | "code" | "ai" | null;
  setActiveTab: (tab: "notes" | "code" | "ai" | null) => void;
  panelWidth: number;
  setPanelWidth: (w: number) => void;
  startDrag: (e: React.MouseEvent) => void;
  // code editor
  reviewCode: string;
  setReviewCode: (v: string) => void;
  reviewLanguage: string;
  setReviewLanguage: (v: string) => void;
  codeFullscreen: boolean;
  setCodeFullscreen: (v: boolean) => void;
  editorSaveStatus: "idle" | "saving" | "saved" | "error";
  onSaveCodeAsNote: () => void;
  // notes
  problemNotes: NoteItem[];
  notesLoading: boolean;
  notesLoaded: boolean;
  quickTitle: string;
  setQuickTitle: (v: string) => void;
  quickContent: string;
  setQuickContent: (v: string) => void;
  quickSaving: boolean;
  notesLimitError: string | null;
  onLoadNotes: () => void;
  onSaveQuickNote: () => void;
  onExportNotes: () => void;
  plan: "free" | "pro" | "elite";
  // chat
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatLoading: boolean;
  chatError: string | null;
  setChatError: (v: string | null) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  chatReviewsLeft: number | null;
  setChatReviewsLeft: (v: number | null) => void;
  chatMessagesLeft: number | null;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  onChat: () => void;
}

export function SidePanel({
  activeTab,
  setActiveTab,
  panelWidth,
  setPanelWidth,
  startDrag,
  reviewCode,
  setReviewCode,
  reviewLanguage,
  setReviewLanguage,
  codeFullscreen,
  setCodeFullscreen,
  editorSaveStatus,
  onSaveCodeAsNote,
  problemNotes,
  notesLoading,
  notesLoaded,
  quickTitle,
  setQuickTitle,
  quickContent,
  setQuickContent,
  quickSaving,
  notesLimitError,
  onLoadNotes,
  onSaveQuickNote,
  onExportNotes,
  plan,
  chatMessages,
  setChatMessages,
  chatLoading,
  chatError,
  setChatError,
  chatInput,
  setChatInput,
  chatReviewsLeft,
  setChatReviewsLeft,
  chatMessagesLeft,
  chatBottomRef,
  onChat,
}: SidePanelProps) {
  const isOpen = activeTab !== null;

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = `${ta.value.substring(0, start)}  ${ta.value.substring(end)}`;
      setReviewCode(next);
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
      setReviewCode(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1 + indent.length;
      });
    }
  }

  return (
    <>
      {/* Tab buttons fixed to right edge */}
      <div
        style={{
          position: "fixed",
          right: isOpen ? panelWidth : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          transition: "right 0.25s ease",
        }}
      >
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (activeTab === id) {
                setActiveTab(null);
              } else {
                setActiveTab(id);
                if (id === "notes" && !notesLoaded) onLoadNotes();
              }
            }}
            className={`flex flex-col items-center gap-2 rounded-l-md border-2 border-r-0 px-3 py-4 text-xs font-semibold transition-colors shadow-md ${
              activeTab === id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60"
            }`}
          >
            <div className="scale-125">{icon}</div>
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Slide-out panel */}
      <div
        style={{
          position: "fixed",
          top: "3.5rem",
          right: 0,
          bottom: 0,
          width: panelWidth,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
        }}
        className="border-l border-border bg-background shadow-2xl"
      >
        {/* Drag handle */}
        <div
          aria-hidden="true"
          onMouseDown={startDrag}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            cursor: "col-resize",
            zIndex: 2,
          }}
          className="hover:bg-primary/30 transition-colors"
        />

        {/* Panel header */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-2">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "notes" && !notesLoaded) onLoadNotes();
                setActiveTab(id);
              }}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                activeTab === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {icon}
              {id === "code"
                ? "Code Editor"
                : id === "ai"
                  ? "AI Review"
                  : label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveTab(null)}
            className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close panel"
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

        {/* ── Notes panel ── */}
        {activeTab === "notes" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {problemNotes.length > 0 && (
              <div className="flex shrink-0 items-center justify-end border-b border-border px-3 py-1.5">
                {plan !== "free" ? (
                  <button
                    type="button"
                    onClick={onExportNotes}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title="Export notes as Markdown"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export .md
                  </button>
                ) : (
                  <Link
                    href="/pricing"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title="Export notes (Pro feature)"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Export .md
                  </Link>
                )}
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
              {notesLoading && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {!notesLoading && problemNotes.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No notes for this problem yet.
                </p>
              )}
              {problemNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-snug">
                      {note.title}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {note.code && (
                        <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                          {note.code_language}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {note.content && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {note.content}
                    </p>
                  )}
                  <a
                    href="/notes"
                    className="mt-0.5 self-start text-[11px] text-primary hover:underline"
                  >
                    Open in Notes ↗
                  </a>
                </div>
              ))}
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                New Note
              </p>
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Title…"
                maxLength={200}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={quickContent}
                onChange={(e) => setQuickContent(e.target.value)}
                placeholder="Write a note…"
                rows={3}
                maxLength={10000}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                size="sm"
                className="self-start"
                onClick={onSaveQuickNote}
                disabled={
                  quickSaving || (!quickTitle.trim() && !quickContent.trim())
                }
              >
                {quickSaving ? "Saving…" : "Save Note"}
              </Button>
              {notesLimitError && (
                <p className="text-xs text-muted-foreground">
                  {notesLimitError}{" "}
                  <Link
                    href="/pricing"
                    className="text-primary underline underline-offset-2"
                  >
                    Upgrade →
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Code editor panel ── */}
        {activeTab === "code" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-muted/10 px-3 py-2">
              {(["C++", "Python", "Java", "JavaScript"] as const).map(
                (lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setReviewLanguage(lang)}
                    className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      reviewLanguage === lang
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang}
                  </button>
                ),
              )}
              <span className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {reviewCode.length}/50000
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (codeFullscreen) {
                      setPanelWidth(420);
                      setCodeFullscreen(false);
                    } else {
                      setPanelWidth(
                        Math.min(
                          Math.max(
                            Math.floor(window.innerWidth * 0.62),
                            MIN_PANEL_W,
                          ),
                          MAX_PANEL_W,
                        ),
                      );
                      setCodeFullscreen(true);
                    }
                  }}
                  className="rounded px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={
                    codeFullscreen ? "Collapse editor" : "Expand to split view"
                  }
                >
                  {codeFullscreen ? "↙ Collapse" : "↗ Expand"}
                </button>
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
                  padding: "0.75rem 1rem",
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
                    reviewCode || " ",
                    LANG_GRAMMARS[reviewLanguage] ?? languages.clike,
                    reviewLanguage,
                  )}\n`,
                }}
              />
              <textarea
                value={reviewCode}
                onChange={(e) => setReviewCode(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                onScroll={(e) => {
                  const pre = e.currentTarget
                    .previousElementSibling as HTMLPreElement | null;
                  if (pre) pre.scrollTop = e.currentTarget.scrollTop;
                }}
                placeholder={`Write or paste your ${reviewLanguage} code here…`}
                maxLength={50000}
                spellCheck={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  margin: 0,
                  padding: "0.75rem 1rem",
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
            <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2.5">
              <Button
                size="sm"
                variant="outline"
                disabled={!reviewCode.trim() || editorSaveStatus === "saving"}
                onClick={onSaveCodeAsNote}
              >
                {editorSaveStatus === "saving"
                  ? "Saving…"
                  : editorSaveStatus === "saved"
                    ? "Saved ✓"
                    : "Save as Note"}
              </Button>
              {editorSaveStatus === "error" && (
                <span className="text-xs text-destructive">Save failed</span>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground">
                Tab · Enter auto-indents
              </span>
            </div>
          </div>
        )}

        {/* ── AI Review panel ── */}
        {activeTab === "ai" && plan === "free" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">Pro feature</p>
              <p className="text-xs text-muted-foreground">
                AI code review is available on Pro and Elite plans.
              </p>
            </div>
            <Link
              href="/pricing"
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-80"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}
        {activeTab === "ai" && plan !== "free" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/10 px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {chatReviewsLeft !== null
                  ? `${chatReviewsLeft} request${chatReviewsLeft !== 1 ? "s" : ""} left today${chatMessagesLeft !== null ? ` · ${chatMessagesLeft} left in chat` : ""}.`
                  : chatMessagesLeft !== null
                    ? `${chatMessagesLeft} left in chat.`
                    : "10 requests/day · 15s between messages."}
              </p>
              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setChatMessages([]);
                    setChatError(null);
                    setChatReviewsLeft(null);
                  }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            {reviewCode ? (
              <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/5 px-4 py-2">
                <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                  {reviewLanguage}
                </span>
                <span className="text-xs text-muted-foreground">
                  {reviewCode.split("\n").length} lines
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Edit ↗
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/5 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  No code yet —
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className="text-xs text-primary hover:underline"
                >
                  open Code Editor ↗
                </button>
              </div>
            )}

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
              {chatMessages.length === 0 && !chatLoading && !chatError && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Write your code in the Code Editor tab, then ask a question
                  here.
                </p>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {msg.role === "user" ? "You" : "AI Mentor"}
                  </span>
                  <div
                    className={`max-w-[92%] rounded-lg px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary/10 text-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    AI Mentor
                  </span>
                  <div className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              )}

              {chatError && (
                <p className="text-xs text-destructive">{chatError}</p>
              )}

              <div ref={chatBottomRef} />
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border p-2.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onChat();
                  }
                }}
                placeholder="Ask about your code…"
                maxLength={2000}
                disabled={chatLoading}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <Button
                size="sm"
                disabled={chatLoading || !chatInput.trim()}
                onClick={onChat}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
