"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";

type Problem = {
  id: string;
  title: string;
  url: string;
  platform: string;
  difficulty: string | null;
  tags: string[];
  content: string | null;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; problem: Problem; contentOpen: boolean };

export function ProblemViewer() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [searchId, setSearchId] = useState("");

  async function fetchProblem(url: string) {
    setState({ status: "loading" });
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Unknown error." });
      } else {
        setState({ status: "loaded", problem: data, contentOpen: false });
      }
    } catch {
      setState({ status: "error", message: "Failed to reach the server." });
    }
  }

  function handleSearch() {
    if (!searchId.trim()) return;
    fetchProblem(`/api/problems/${encodeURIComponent(searchId.trim())}`);
  }

  const isLoading = state.status === "loading";

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search by problem ID (UUID)…"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={isLoading}
            className="max-w-sm"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !searchId.trim()}
            variant="outline"
          >
            Search
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <Button
          onClick={() => fetchProblem("/api/problems/random")}
          disabled={isLoading}
          className="self-start"
        >
          {isLoading ? "Loading…" : "Find Random Problem"}
        </Button>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      {state.status === "loaded" &&
        (() => {
          const { problem, contentOpen } = state;
          const platformLabel =
            problem.platform === "codeforces" ? "Codeforces" : "LeetCode";

          return (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-lg">{problem.title}</CardTitle>
                      <span className="font-mono text-xs text-muted-foreground">
                        {problem.id}
                      </span>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {platformLabel}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {problem.difficulty && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Difficulty</span>
                      <Badge variant="outline">{problem.difficulty}</Badge>
                    </div>
                  )}

                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Tags
                      </span>
                      {problem.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm break-all text-muted-foreground">
                    {problem.url}
                  </div>
                </CardContent>

                <CardFooter className="gap-2">
                  {problem.content && (
                    <Button
                      onClick={() =>
                        setState({ ...state, contentOpen: !contentOpen })
                      }
                    >
                      {contentOpen ? "Hide Problem" : "Open Problem"}
                    </Button>
                  )}
                  <Button
                    variant={problem.content ? "outline" : "default"}
                    asChild
                  >
                    <Link
                      href={problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Link
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => fetchProblem("/api/problems/random")}
                    className="ml-auto"
                  >
                    Next Problem
                  </Button>
                </CardFooter>
              </Card>

              {contentOpen && problem.content && (
                <div className="cf-problem rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm">
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: content is authored by the site admin and stored in our own DB */}
                  <div dangerouslySetInnerHTML={{ __html: problem.content }} />
                </div>
              )}
            </>
          );
        })()}
    </div>
  );
}
