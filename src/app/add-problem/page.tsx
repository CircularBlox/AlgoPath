"use client";

import { useActionState, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { type AddProblemState, addProblem } from "./actions";

const initialState: AddProblemState = { success: false };

export default function AddProblemPage() {
  const [state, formAction, isPending] = useActionState(
    addProblem,
    initialState,
  );
  const [contentHtml, setContentHtml] = useState("");

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Add Problem</h1>
      <p className="mb-8 text-muted-foreground">
        Add a competitive programming problem to the pool.
      </p>

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="The Equalizer" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="url">Problem URL</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://codeforces.com/contest/2217/problem/A"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="platform">Platform</Label>
          <select
            id="platform"
            name="platform"
            defaultValue="codeforces"
            className={cn(
              "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              "dark:bg-input/30",
            )}
          >
            <option value="codeforces">Codeforces</option>
            <option value="leetcode">LeetCode</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="difficulty">
            Difficulty{" "}
            <span className="font-normal text-muted-foreground">
              (optional — numeric CF rating, classified by AI later)
            </span>
          </Label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue=""
            className={cn(
              "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              "dark:bg-input/30",
            )}
          >
            <option value="">— none —</option>
            {Array.from({ length: 32 }, (_, i) => (i + 4) * 100).map((v) => (
              <option key={v} value={String(v)}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tags">
            Tags{" "}
            <span className="font-normal text-muted-foreground">
              (comma-separated, optional)
            </span>
          </Label>
          <Input id="tags" name="tags" placeholder="games, math, greedy" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="content">Problem Content (HTML)</Label>
          <textarea
            id="content"
            name="content"
            rows={12}
            placeholder="<h2>Problem Title</h2><p>Problem statement...</p>"
            value={contentHtml}
            onChange={(e) => setContentHtml(e.target.value)}
            required
            className={cn(
              "w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              "dark:bg-input/30",
            )}
          />
        </div>

        {contentHtml && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Preview</p>
            <div className="cf-problem min-h-32 rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm">
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: admin-only page, content authored by the site owner */}
              <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
            </div>
          </div>
        )}

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Problem added successfully!
          </p>
        )}

        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Adding..." : "Add Problem"}
        </Button>
      </form>
    </main>
  );
}
