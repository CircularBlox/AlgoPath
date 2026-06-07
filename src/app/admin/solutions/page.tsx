"use client";

import Editor from "react-simple-code-editor";
import "prismjs/themes/prism-okaidia.css";
import { useCallback, useState } from "react";
import { FormattedText } from "~/app/display-problem/formatting";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { highlight, languages } from "~/lib/prism-setup";
import { cn } from "~/lib/utils";

const LANGUAGES = ["C++", "Python", "Java", "JavaScript"] as const;
type Lang = (typeof LANGUAGES)[number];

const LANG_GRAMMARS: Record<Lang, Prism.Grammar> = {
  "C++": languages.cpp,
  Python: languages.python,
  Java: languages.java,
  JavaScript: languages.javascript,
};

type Problem = {
  title: string;
  difficulty: string | null;
  tags: string[] | null;
};

type SolutionCode = {
  id: string;
  solution_id: string;
  language: string;
  code: string;
};

export default function AdminSolutionsPage() {
  const [problemNumber, setProblemNumber] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [codes, setCodes] = useState<Record<Lang, string>>({
    "C++": "",
    Python: "",
    Java: "",
    JavaScript: "",
  });
  const [explanation, setExplanation] = useState("");
  const [activeTab, setActiveTab] = useState<Lang>("C++");

  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Preview state
  const [previewLang, setPreviewLang] = useState<Lang>("C++");
  const [previewCodeVisible, setPreviewCodeVisible] = useState(true);
  const [previewCopied, setPreviewCopied] = useState(false);

  const previewCodes = LANGUAGES.filter((l) => codes[l].trim()).map((l) => ({
    language: l,
    code: codes[l],
  }));
  const activePreview =
    previewCodes.find((c) => c.language === previewLang) ?? previewCodes[0];

  async function handleLoad() {
    const num = Number(problemNumber);
    if (!num) return;
    setLoading(true);
    setLoadError(null);
    setProblem(null);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const [probRes, solRes] = await Promise.all([
        fetch(`/api/problems/${num}`),
        fetch(`/api/problems/${num}/solution`),
      ]);

      if (!probRes.ok) {
        const j = (await probRes.json()) as { error?: string };
        setLoadError(j.error ?? "Problem not found.");
        setLoading(false);
        return;
      }

      const probData = (await probRes.json()) as Problem;
      setProblem(probData);

      if (solRes.ok) {
        const solData = (await solRes.json()) as {
          explanation?: string | null;
          solution_codes?: SolutionCode[];
        };
        const newCodes: Record<Lang, string> = {
          "C++": "",
          Python: "",
          Java: "",
          JavaScript: "",
        };
        for (const sc of solData.solution_codes ?? []) {
          if (LANGUAGES.includes(sc.language as Lang)) {
            newCodes[sc.language as Lang] = sc.code ?? "";
          }
        }
        setCodes(newCodes);
        setExplanation(solData.explanation ?? "");
      }
    } catch {
      setLoadError("Failed to load problem.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(lang: Lang) {
    if (!problemNumber || !problem) return;
    setGenerating(lang);
    try {
      const res = await fetch("/api/admin/generate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_number: Number(problemNumber),
          language: lang,
        }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) {
        alert(data.error ?? "Generation failed.");
        return;
      }
      setCodes((prev) => ({ ...prev, [lang]: data.code as string }));
    } catch {
      alert("Network error during generation.");
    } finally {
      setGenerating(null);
    }
  }

  async function handleGenerateExplanation() {
    if (!problemNumber || !problem) return;
    setGeneratingExplanation(true);
    try {
      const res = await fetch("/api/admin/generate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_number: Number(problemNumber),
          type: "explanation",
          codes,
        }),
      });
      const data = (await res.json()) as {
        explanation?: string;
        error?: string;
      };
      if (!res.ok || !data.explanation) {
        alert(data.error ?? "Generation failed.");
        return;
      }
      setExplanation(data.explanation);
    } catch {
      alert("Network error during generation.");
    } finally {
      setGeneratingExplanation(false);
    }
  }

  async function handleSave() {
    if (!problemNumber || !problem) return;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/save-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_number: Number(problemNumber),
          codes,
          explanation: explanation || null,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setSaveError(data.error ?? "Save failed.");
      } else {
        setSaveMessage(data.message ?? "Saved.");
      }
    } catch {
      setSaveError("Network error during save.");
    } finally {
      setSaving(false);
    }
  }

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget as HTMLTextAreaElement;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;
        const newVal = `${val.substring(0, start)}  ${val.substring(end)}`;
        setCodes((prev) => ({ ...prev, [activeTab]: newVal }));
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        }, 0);
      }
    },
    [activeTab],
  );

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Solutions Panel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Load a problem, generate or write solutions per language, then save
          all at once.
        </p>
      </div>

      {/* Problem loader */}
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="problem_number">Problem Number</Label>
          <Input
            id="problem_number"
            type="number"
            min={1}
            placeholder="e.g. 42"
            value={problemNumber}
            onChange={(e) => setProblemNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLoad();
            }}
            className="w-40"
          />
        </div>
        <Button onClick={handleLoad} disabled={loading || !problemNumber}>
          {loading ? "Loading…" : "Load"}
        </Button>
        {problem && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{problem.title}</span>
            {problem.difficulty && (
              <span className="text-muted-foreground">
                · {problem.difficulty}
              </span>
            )}
            {problem.tags && problem.tags.length > 0 && (
              <span className="text-muted-foreground">
                · {(problem.tags as string[]).join(", ")}
              </span>
            )}
          </div>
        )}
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[55fr_45fr] gap-6 items-start">
        {/* Left — editor */}
        <div className="flex flex-col gap-5">
          {/* Language tabs */}
          <div className="flex flex-wrap gap-1 border-b border-border pb-3">
            {LANGUAGES.map((lang) => (
              <div key={lang} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab(lang)}
                  className={cn(
                    "rounded px-3 py-1 text-sm font-medium transition-colors",
                    activeTab === lang
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {lang}
                  {codes[lang].trim() && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500 align-middle" />
                  )}
                </button>
                {problem && (
                  <button
                    type="button"
                    disabled={generating === lang}
                    onClick={() => handleGenerate(lang)}
                    className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating === lang ? "…" : "Gen"}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Code editor */}
          <div className="flex flex-col gap-2">
            <Label>Code — {activeTab}</Label>
            <div className="overflow-hidden rounded-md border border-input">
              <Editor
                value={codes[activeTab]}
                onValueChange={(val) =>
                  setCodes((prev) => ({ ...prev, [activeTab]: val }))
                }
                highlight={(src) =>
                  highlight(
                    src,
                    LANG_GRAMMARS[activeTab] ?? languages.clike,
                    activeTab,
                  )
                }
                padding={14}
                onKeyDown={handleTabKeyDown}
                onPaste={(e) => {
                  e.preventDefault();
                  let text = e.clipboardData
                    .getData("text/plain")
                    .replace(/\r\n/g, "\n")
                    .replace(/\t/g, "    ");
                  text = text.replace(/^\n+|\n+$/g, "");
                  const lines = text.split("\n");
                  const minIndent = Math.min(
                    ...lines
                      .filter((l) => l.trim())
                      .map((l) => l.match(/^ */)?.[0].length ?? 0),
                  );
                  text = lines.map((l) => l.slice(minIndent)).join("\n");
                  const ta = e.target as HTMLTextAreaElement;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const current = codes[activeTab];
                  setCodes((prev) => ({
                    ...prev,
                    [activeTab]:
                      current.substring(0, start) +
                      text +
                      current.substring(end),
                  }));
                  setTimeout(() => {
                    ta.selectionStart = ta.selectionEnd = start + text.length;
                  }, 0);
                }}
                style={{
                  background: "#272822",
                  color: "#f8f8f2",
                  fontFamily:
                    '"JetBrains Mono","Fira Code","Fira Mono",ui-monospace,monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                  minHeight: "18rem",
                }}
              />
            </div>
          </div>

          {/* Explanation */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="explanation">Explanation</Label>
            <textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Describe the approach, complexity, key observations…"
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Supports <code className="font-mono">**bold**</code>,{" "}
              <code className="font-mono">`code`</code>, and{" "}
              <code className="font-mono">$math$</code> formatting.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={!problem || generatingExplanation}
            onClick={handleGenerateExplanation}
            className="self-start"
          >
            {generatingExplanation ? "Generating…" : "Generate Explanation"}
          </Button>

          {/* Save */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            {saveMessage && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {saveMessage}
              </p>
            )}
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            <Button
              type="button"
              disabled={saving || !problem}
              onClick={handleSave}
              className="self-start"
            >
              {saving ? "Saving…" : "Save All Languages"}
            </Button>
          </div>
        </div>

        {/* Right — preview */}
        <div className="sticky top-6 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Preview
          </span>

          {previewCodes.length === 0 ? (
            <div className="flex items-center justify-center rounded border border-border bg-card px-6 py-12 text-sm text-muted-foreground">
              Add code above to see a live preview
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border">
                <span className="font-semibold text-sm">Code Solution</span>

                {previewCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1 flex-1">
                    {previewCodes.map((c) => (
                      <button
                        key={c.language}
                        type="button"
                        onClick={() => setPreviewLang(c.language as Lang)}
                        className={cn(
                          "rounded px-2.5 py-0.5 text-xs font-medium transition-colors",
                          c.language === (activePreview?.language ?? "")
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {c.language}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewCodeVisible((v) => !v)}
                    className="rounded px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {previewCodeVisible ? "Hide" : "Show"}
                  </button>
                  {activePreview?.code && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!activePreview?.code) return;
                        navigator.clipboard.writeText(activePreview.code);
                        setPreviewCopied(true);
                        setTimeout(() => setPreviewCopied(false), 2000);
                      }}
                      className="rounded px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {previewCopied ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
              </div>

              {/* Code block */}
              {previewCodeVisible && (
                <div className="px-5">
                  {activePreview?.code ? (
                    <div className="overflow-hidden rounded-md border border-input">
                      <pre
                        style={{
                          background: "#272822",
                          color: "#f8f8f2",
                          fontFamily:
                            '"JetBrains Mono","Fira Code","Fira Mono",ui-monospace,monospace',
                          fontSize: 13,
                          lineHeight: 1.6,
                          padding: 14,
                          margin: 0,
                          overflowX: "auto",
                        }}
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: Prism output is sanitised HTML
                        dangerouslySetInnerHTML={{
                          __html: highlight(
                            activePreview.code,
                            LANG_GRAMMARS[activePreview.language as Lang] ??
                              languages.clike,
                            activePreview.language,
                          ),
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No solutions available yet.
                    </p>
                  )}
                </div>
              )}

              {/* Shared explanation */}
              {explanation && (
                <div className="flex flex-col gap-1 px-5 pb-4">
                  <span className="text-sm font-medium">Explanation</span>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    <FormattedText text={explanation} />
                  </div>
                </div>
              )}

              {!explanation && <div className="pb-1" />}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
