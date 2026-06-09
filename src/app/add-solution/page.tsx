"use client";

import { useActionState, useState } from "react";
import Editor from "react-simple-code-editor";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { highlight, languages } from "~/lib/prism-setup";
import { type AddSolutionState, addSolution } from "./actions";

const LANG_GRAMMARS: Record<string, Prism.Grammar> = {
  "C++": languages.cpp,
  Java: languages.java,
  JavaScript: languages.javascript,
  Python: languages.python,
};

const initial: AddSolutionState = { success: false };

export default function AddSolutionPage() {
  const [state, formAction, isPending] = useActionState(addSolution, initial);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("C++");
  const [explanation, setExplanation] = useState("");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Add Solution</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save or overwrite a language variant for a problem's solution.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-6">
        {/* Problem number */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="problem_number">Problem Number</Label>
          <Input
            id="problem_number"
            name="problem_number"
            type="number"
            min={1}
            placeholder="e.g. 1"
            className="max-w-[12rem] font-mono"
            required
          />
        </div>

        {/* Language */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="language">Language</Label>
          <Select
            name="language"
            required
            value={language}
            onValueChange={setLanguage}
          >
            <SelectTrigger className="max-w-[12rem]" id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="C++">C++</SelectItem>
              <SelectItem value="Python">Python</SelectItem>
              <SelectItem value="Java">Java</SelectItem>
              <SelectItem value="JavaScript">JavaScript</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Explanation */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="explanation">
            Explanation{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <textarea
            id="explanation"
            name="explanation"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Describe the approach, complexity, key observations…"
            rows={6}
            className="w-full rounded border border-input bg-input/30 px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y"
          />
          <p className="text-xs text-muted-foreground">
            Supports <code className="font-mono">**bold**</code>,{" "}
            <code className="font-mono">`code`</code>, and{" "}
            <code className="font-mono">$math$</code> formatting. Bullet lines
            start with <code className="font-mono">- </code> or{" "}
            <code className="font-mono">* </code>.
          </p>
        </div>

        {/* Solution code — IDE editor */}
        <div className="flex flex-col gap-2">
          <Label>Solution Code</Label>
          {/* Hidden input carries the code value into the server action */}
          <input type="hidden" name="solution_code" value={code} />
          <div className="code-editor overflow-hidden rounded border border-input">
            <Editor
              value={code}
              onValueChange={setCode}
              highlight={(src) =>
                highlight(
                  src,
                  LANG_GRAMMARS[language] ?? languages.clike,
                  language,
                )
              }
              padding={14}
              onPaste={(e) => {
                e.preventDefault();

                let text = e.clipboardData
                  .getData("text/plain")
                  .replace(/\r\n/g, "\n") // normalize Windows line endings
                  .replace(/\t/g, "    "); // tabs → spaces

                // remove leading + trailing blank lines
                text = text.replace(/^\n+|\n+$/g, "");

                const lines = text.split("\n");

                // remove common indentation
                const minIndent = Math.min(
                  ...lines
                    .filter((l) => l.trim())
                    .map((l) => l.match(/^ */)?.[0].length ?? 0),
                );

                text = lines.map((l) => l.slice(minIndent)).join("\n");

                const textarea = e.target as HTMLTextAreaElement;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;

                setCode(code.substring(0, start) + text + code.substring(end));

                setTimeout(() => {
                  textarea.selectionStart = textarea.selectionEnd =
                    start + text.length;
                }, 0);
              }}
              style={{
                background: "oklch(0.115 0.006 285)",
                color: "var(--color-foreground)",
                fontFamily:
                  '"JetBrains Mono","Fira Code","Fira Mono",ui-monospace,monospace',
                fontSize: 13,
                lineHeight: 1.6,
                minHeight: "22rem",
              }}
            />
          </div>
        </div>

        {state.error && (
          <p className="font-mono text-sm text-destructive">{state.error}</p>
        )}
        {state.success && state.message && (
          <p className="font-mono text-sm text-green">{state.message}</p>
        )}

        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Saving…" : "Save Solution"}
        </Button>
      </form>
    </main>
  );
}
