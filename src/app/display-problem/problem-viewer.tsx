"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { highlight, languages } from "~/lib/prism-setup";

const LANG_GRAMMARS: Record<string, Prism.Grammar> = {
  "C++": languages.cpp,
  Java: languages.java,
  JavaScript: languages.javascript,
  Python: languages.python,
};

function InlineCode({ text }: { text: string }) {
  const html = text.replace(
    /\$([^$]+)\$/g,
    '<code class="rounded bg-[oklch(0.87_0_0)] dark:bg-[oklch(0.87_0_0)] px-1 font-mono text-xs">$1</code>',
  );
  // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored DB content, $ segments replaced with safe <code> tags
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

type Problem = {
  id: string;
  problem_number: number | null;
  title: string;
  url: string;
  platform: string;
  difficulty: string | null;
  tags: string[];
  content: string | null;
};

type SolutionCode = {
  id: string;
  solution_id: string;
  problem_number: number;
  language: string;
  code: string | null;
};

type Solution = {
  id: string | null;
  problem_name: string;
  problem_number: number;
  explanation: string | null;
  solution_codes: SolutionCode[];
};

type Hints = {
  id: string | null;
  problem_name: string;
  problem_number: number;
  hint_1: string | null;
  hint_2: string | null;
  hint_3: string | null;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "results";
      problems: Problem[];
      source: "search" | "ai";
      reasoning?: string;
    }
  | { status: "loaded"; problem: Problem; contentOpen: boolean };

type MarkDoneState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; xpGain: number; newLevel: number }
  | { status: "already_solved" }
  | { status: "error"; message: string };

type ReportState =
  | { status: "idle" }
  | { status: "open" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

type PanelState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "open"; data: T }
  | { status: "closed"; data: T };

export function ProblemViewer({
  userId,
  initialProblem = null,
  csrfToken,
}: {
  userId: string | null;
  initialProblem?: Problem | null;
  csrfToken: string;
}) {
  const [state, setState] = useState<State>(
    initialProblem
      ? { status: "loaded", problem: initialProblem, contentOpen: false }
      : { status: "idle" },
  );
  const [solutionState, setSolutionState] = useState<PanelState<Solution>>({
    status: "idle",
  });
  const [hintsState, setHintsState] = useState<PanelState<Hints>>({
    status: "idle",
  });
  const [hintsRevealed, setHintsRevealed] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("C++");
  const [codeVisible, setCodeVisible] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const hintsPanelRef = useRef<HTMLDivElement>(null);
  const solutionPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hintsState.status === "open") {
      hintsPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [hintsState.status]);

  useEffect(() => {
    if (solutionState.status === "open") {
      solutionPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [solutionState.status]);

  const [hintRatings, setHintRatings] = useState<
    Record<1 | 2 | 3, "up" | "down" | null>
  >({ 1: null, 2: null, 3: null });
  const [ratingPending, setRatingPending] = useState<1 | 2 | 3 | null>(null);
  const [markDoneState, setMarkDoneState] = useState<MarkDoneState>({
    status: "idle",
  });
  const [reportState, setReportState] = useState<ReportState>({
    status: "idle",
  });
  const [reportDescription, setReportDescription] = useState("");
  const [suggestDiffState, setSuggestDiffState] = useState<ReportState>({
    status: "idle",
  });
  const [suggestedDifficulty, setSuggestedDifficulty] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatReviewsLeft, setChatReviewsLeft] = useState<number | null>(null);
  const [chatMessagesLeft, setChatMessagesLeft] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [reviewCode, setReviewCode] = useState("");
  const [reviewLanguage, setReviewLanguage] = useState("C++");
  const [problemViewed, setProblemViewed] = useState(false);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestQuery, setSuggestQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  async function fetchRandom() {
    setState({ status: "loading" });
    resetPanels();
    try {
      const res = await fetch("/api/problems/random");
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

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setState({ status: "loading" });
    resetPanels();
    try {
      const res = await fetch(
        `/api/problems/search?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Unknown error." });
        return;
      }
      const problems: Problem[] = data;
      const exact = problems.find(
        (p) => p.title.toLowerCase() === q.toLowerCase(),
      );
      if (exact) {
        setState({ status: "loaded", problem: exact, contentOpen: false });
      } else {
        setState({ status: "results", problems, source: "search" });
      }
    } catch {
      setState({ status: "error", message: "Failed to reach the server." });
    }
  }

  function selectProblem(problem: Problem) {
    resetPanels();
    setState({ status: "loaded", problem, contentOpen: false });
  }

  function resetPanels() {
    setSolutionState({ status: "idle" });
    setHintsState({ status: "idle" });
    setHintsRevealed(1);
    setHintRatings({ 1: null, 2: null, 3: null });
    setRatingPending(null);
    setSelectedLanguage("C++");
    setCodeVisible(true);
    setCodeCopied(false);
    setMarkDoneState({ status: "idle" });
    setReportState({ status: "idle" });
    setReportDescription("");
    setSuggestDiffState({ status: "idle" });
    setSuggestedDifficulty("");
    setChatMessages([]);
    setChatLoading(false);
    setChatError(null);
    setChatReviewsLeft(null);
    setChatMessagesLeft(null);
    setChatInput("");
    setReviewCode("");
    setReviewLanguage("C++");
    setProblemViewed(false);
    setReviewPanelOpen(false);
  }

  async function handleReport(problemNumber: number) {
    const desc = reportDescription.trim();
    if (!desc) return;
    setReportState({ status: "loading" });
    try {
      const res = await fetch(`/api/problems/${problemNumber}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ description: desc, type: "general" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReportState({
          status: "error",
          message: data.error ?? "Failed to submit report.",
        });
      } else {
        setReportState({ status: "success" });
        setReportDescription("");
      }
    } catch {
      setReportState({
        status: "error",
        message: "Failed to reach the server.",
      });
    }
  }

  async function handleSuggestDifficulty(problemNumber: number) {
    const diff = suggestedDifficulty.trim();
    if (!diff) return;
    setSuggestDiffState({ status: "loading" });
    try {
      const res = await fetch(`/api/problems/${problemNumber}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          type: "difficulty",
          suggested_difficulty: diff,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSuggestDiffState({
          status: "error",
          message: data.error ?? "Failed to submit suggestion.",
        });
      } else {
        setSuggestDiffState({ status: "success" });
        setSuggestedDifficulty("");
      }
    } catch {
      setSuggestDiffState({
        status: "error",
        message: "Failed to reach the server.",
      });
    }
  }

  async function handleSuggest() {
    const q = suggestQuery.trim();
    if (!q) return;
    setState({ status: "loading" });
    setIsAiLoading(true);
    resetPanels();
    try {
      const res = await fetch(
        `/api/problems/suggest?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Unknown error." });
        return;
      }
      const problems: Problem[] = Array.isArray(data)
        ? data
        : ((data as { problems?: Problem[] }).problems ?? []);
      const reasoning: string | null = Array.isArray(data)
        ? null
        : ((data as { reasoning?: string | null }).reasoning ?? null);
      if (problems.length === 0) {
        setState({ status: "error", message: "No matching problems found." });
        return;
      }
      setState({
        status: "results",
        problems,
        source: "ai",
        reasoning: reasoning ?? undefined,
      });
    } catch {
      setState({ status: "error", message: "Failed to reach the server." });
    } finally {
      setIsAiLoading(false);
    }
  }

  async function toggleSolution(problemNumber: number) {
    if (solutionState.status === "open") {
      setSolutionState({ ...solutionState, status: "closed" });
      return;
    }
    if (solutionState.status === "closed") {
      setSolutionState({ ...solutionState, status: "open" });
      return;
    }
    setSolutionState({ status: "loading" });
    try {
      const res = await fetch(`/api/problems/${problemNumber}/solution`);
      const data = await res.json();
      if (!res.ok) {
        setSolutionState({
          status: "error",
          message: data.error ?? "Unknown error.",
        });
      } else {
        const solution: Solution = data;
        setSolutionState({ status: "open", data: solution });
        const codes = solution.solution_codes ?? [];
        const preferred = codes.find((c) => c.language === "C++") ?? codes[0];
        if (preferred) setSelectedLanguage(preferred.language);
      }
    } catch {
      setSolutionState({
        status: "error",
        message: "Failed to reach the server.",
      });
    }
  }

  async function toggleHints(problemNumber: number) {
    if (hintsState.status === "open") {
      setHintsState({ ...hintsState, status: "closed" });
      return;
    }
    if (hintsState.status === "closed") {
      setHintsState({ ...hintsState, status: "open" });
      return;
    }
    setHintsState({ status: "loading" });
    setHintsRevealed(1);
    setHintRatings({ 1: null, 2: null, 3: null });
    try {
      const [hintsRes, ratingsRes] = await Promise.all([
        fetch(`/api/problems/${problemNumber}/hints`),
        userId
          ? fetch(`/api/problems/${problemNumber}/hints/rate`)
          : Promise.resolve(null),
      ]);
      const hintsData = await hintsRes.json();
      if (!hintsRes.ok) {
        setHintsState({
          status: "error",
          message: hintsData.error ?? "Unknown error.",
        });
      } else {
        setHintsState({ status: "open", data: hintsData });
        if (ratingsRes?.ok) {
          const ratingsData = await ratingsRes.json();
          setHintRatings({
            1: ratingsData[1] ?? null,
            2: ratingsData[2] ?? null,
            3: ratingsData[3] ?? null,
          });
        }
      }
    } catch {
      setHintsState({
        status: "error",
        message: "Failed to reach the server.",
      });
    }
  }

  async function handleRate(
    problemNumber: number,
    hintNumber: 1 | 2 | 3,
    rating: "up" | "down",
  ) {
    // Toggle off if clicking the same rating
    const next = hintRatings[hintNumber] === rating ? null : rating;
    setHintRatings((prev) => ({ ...prev, [hintNumber]: next }));
    setRatingPending(hintNumber);
    try {
      if (next === null) {
        // No delete endpoint — just leave the optimistic update
        // (a re-open will restore the DB value)
      } else {
        await fetch(`/api/problems/${problemNumber}/hints/rate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ hint_number: hintNumber, rating: next }),
        });
      }
    } catch {
      // Silently revert on error
      setHintRatings((prev) => ({
        ...prev,
        [hintNumber]: hintRatings[hintNumber],
      }));
    } finally {
      setRatingPending(null);
    }
  }

  async function handleChat(problemNumber: number) {
    const prompt = chatInput.trim();
    if (!prompt || chatLoading) return;
    setChatInput("");
    setChatLoading(true);
    setChatError(null);
    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { id: crypto.randomUUID(), role: "user", content: prompt },
    ];
    setChatMessages(nextMessages);
    setTimeout(
      () => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
    try {
      const res = await fetch(`/api/problems/${problemNumber}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          prompt,
          code: reviewCode,
          language: reviewLanguage,
          messages: chatMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatError(data.error ?? "Failed to get a response.");
      } else {
        setChatMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data.reply },
        ]);
        if (data.reviews_left !== null && data.reviews_left !== undefined) {
          setChatReviewsLeft(data.reviews_left);
        }
        if (data.messages_left !== undefined) {
          setChatMessagesLeft(data.messages_left);
        }
        setTimeout(
          () => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }),
          50,
        );
      }
    } catch {
      setChatError("Failed to reach the server.");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleMarkDone() {
    if (state.status !== "loaded") return;
    const { problem } = state;
    if (!problem.problem_number) return;

    const solutionViewed =
      solutionState.status === "open" || solutionState.status === "closed";
    if (solutionViewed) return;

    const hintsUsed =
      hintsState.status === "open" || hintsState.status === "closed"
        ? hintsRevealed
        : 0;

    setMarkDoneState({ status: "loading" });
    try {
      const res = await fetch("/api/profiles/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          problem_number: problem.problem_number,
          difficulty: problem.difficulty,
          hints_viewed: hintsUsed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMarkDoneState({
          status: "error",
          message: data.error ?? "Failed to save.",
        });
        return;
      }
      if (data.already_solved) {
        setMarkDoneState({ status: "already_solved" });
      } else {
        setMarkDoneState({
          status: "done",
          xpGain: data.xp_gain ?? data.rating_gain ?? 0,
          newLevel: data.new_level ?? 1,
        });
      }
      setTimeout(() => fetchRandom(), 1500);
    } catch {
      setMarkDoneState({
        status: "error",
        message: "Failed to reach the server.",
      });
    }
  }

  const isLoading = state.status === "loading";

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search by problem title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={isLoading}
            className="max-w-sm"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
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
          onClick={fetchRandom}
          disabled={isLoading}
          className="self-start"
        >
          {isLoading ? "Loading…" : "Find Random Problem"}
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Describe what you're looking for…"
            value={suggestQuery}
            onChange={(e) => setSuggestQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
            disabled={isLoading}
            className="max-w-sm"
          />
          <Button
            onClick={handleSuggest}
            disabled={isLoading || !suggestQuery.trim()}
            variant="outline"
          >
            AI Suggest
          </Button>
        </div>
      </div>

      {isAiLoading && (
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-sm text-muted-foreground">Thinking</span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      {/* Search results list */}
      {state.status === "results" && (
        <div className="flex flex-col gap-2">
          {state.source === "ai" && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                AI
              </p>
              <p className="text-sm leading-relaxed">
                {state.reasoning ?? "Here are some problems I found for you!"}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {state.source === "ai" ? "AI suggested " : ""}
            {state.problems.length} result
            {state.problems.length !== 1 ? "s" : ""} — click to open
          </p>
          <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
            {state.problems.map((problem) => {
              const visibleTags = problem.tags?.slice(0, 3) ?? [];
              const extraTags =
                (problem.tags?.length ?? 0) - visibleTags.length;
              return (
                <button
                  key={problem.id}
                  type="button"
                  onClick={() => selectProblem(problem)}
                  className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {problem.problem_number != null && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          #{problem.problem_number}
                        </span>
                      )}
                      <span className="truncate text-sm font-medium">
                        {problem.title}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {problem.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {problem.difficulty}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {problem.platform === "codeforces" ? "CF" : "LC"}
                      </Badge>
                    </div>
                  </div>
                  {visibleTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {visibleTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      {extraTags > 0 && (
                        <span className="text-xs text-muted-foreground">
                          +{extraTags} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loaded problem */}
      {state.status === "loaded" &&
        (() => {
          const { problem, contentOpen } = state;
          const platformLabel =
            problem.platform === "codeforces" ? "Codeforces" : "LeetCode";
          const solutionOpen = solutionState.status === "open";
          const solutionLoading = solutionState.status === "loading";
          const solutionViewed =
            solutionState.status === "open" ||
            solutionState.status === "closed";
          const hintsOpen = hintsState.status === "open";
          const hintsLoading = hintsState.status === "loading";

          const markDoneDisabled =
            solutionViewed ||
            markDoneState.status === "loading" ||
            markDoneState.status === "done" ||
            markDoneState.status === "already_solved";

          const markDoneLabel =
            markDoneState.status === "loading"
              ? "Saving…"
              : markDoneState.status === "done"
                ? `+${markDoneState.xpGain} XP`
                : markDoneState.status === "already_solved"
                  ? "Already Solved"
                  : markDoneState.status === "error"
                    ? "Failed"
                    : "Mark as Done";

          return (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-lg">{problem.title}</CardTitle>
                      {problem.problem_number != null && (
                        <span className="text-xs text-muted-foreground">
                          Problem #{problem.problem_number}
                        </span>
                      )}
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

                <CardFooter className="flex-wrap gap-2">
                  {problem.content && (
                    <Button
                      onClick={() => {
                        setState({ ...state, contentOpen: !contentOpen });
                        setProblemViewed(true);
                      }}
                    >
                      {contentOpen ? "Hide Problem" : "Open Problem"}
                    </Button>
                  )}
                  {problemViewed && (
                    <Button
                      variant="outline"
                      onClick={() => toggleHints(problem.problem_number ?? 0)}
                      disabled={hintsLoading}
                    >
                      {hintsLoading
                        ? "Loading…"
                        : hintsOpen
                          ? "Hide Hints"
                          : "Show Hints"}
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
                      onClick={() => setProblemViewed(true)}
                    >
                      Open Link
                    </Link>
                  </Button>
                  {userId && (
                    <Button
                      className="ml-auto"
                      onClick={handleMarkDone}
                      disabled={markDoneDisabled}
                      title={
                        solutionViewed
                          ? "Cannot mark as done after viewing the solution"
                          : undefined
                      }
                    >
                      {markDoneLabel}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={fetchRandom}
                    className={userId ? "" : "ml-auto"}
                  >
                    Next Problem
                  </Button>
                  {userId && (
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground text-xs"
                        onClick={() =>
                          setSuggestDiffState((s) =>
                            s.status === "open"
                              ? { status: "idle" }
                              : { status: "open" },
                          )
                        }
                      >
                        Suggest Difficulty
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground text-xs"
                        onClick={() =>
                          setReportState((s) =>
                            s.status === "open"
                              ? { status: "idle" }
                              : { status: "open" },
                          )
                        }
                      >
                        Report
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>

              {/* Report form */}
              {userId &&
                (reportState.status === "open" ||
                  reportState.status === "loading" ||
                  reportState.status === "error" ||
                  reportState.status === "success") && (
                  <div className="rounded-lg border border-border bg-card px-5 py-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Report Problem
                    </p>
                    {reportState.status === "success" ? (
                      <p className="text-sm text-muted-foreground">
                        Report submitted. Thank you!
                      </p>
                    ) : (
                      <>
                        <textarea
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          placeholder="Describe the issue (wrong difficulty, bad content, broken link…)"
                          maxLength={1000}
                          rows={3}
                          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {reportState.status === "error" && (
                          <p className="text-xs text-destructive">
                            {reportState.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={
                              reportState.status === "loading" ||
                              !reportDescription.trim()
                            }
                            onClick={() =>
                              handleReport(problem.problem_number ?? 0)
                            }
                          >
                            {reportState.status === "loading"
                              ? "Submitting…"
                              : "Submit Report"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReportState({ status: "idle" })}
                          >
                            Cancel
                          </Button>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {reportDescription.length}/1000
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

              {/* Suggest Difficulty form */}
              {userId &&
                (suggestDiffState.status === "open" ||
                  suggestDiffState.status === "loading" ||
                  suggestDiffState.status === "error" ||
                  suggestDiffState.status === "success") && (
                  <div className="rounded-lg border border-border bg-card px-5 py-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Suggest Difficulty
                    </p>
                    {suggestDiffState.status === "success" ? (
                      <p className="text-sm text-muted-foreground">
                        Suggestion submitted. Thank you!
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Current difficulty:{" "}
                          <span className="font-medium text-foreground">
                            {problem.difficulty ?? "unknown"}
                          </span>
                        </p>
                        <input
                          type="number"
                          min={100}
                          max={4000}
                          step={100}
                          value={suggestedDifficulty}
                          onChange={(e) =>
                            setSuggestedDifficulty(e.target.value)
                          }
                          placeholder="e.g. 1200"
                          className="w-36 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {suggestDiffState.status === "error" && (
                          <p className="text-xs text-destructive">
                            {suggestDiffState.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={
                              suggestDiffState.status === "loading" ||
                              !suggestedDifficulty.trim()
                            }
                            onClick={() =>
                              handleSuggestDifficulty(
                                problem.problem_number ?? 0,
                              )
                            }
                          >
                            {suggestDiffState.status === "loading"
                              ? "Submitting…"
                              : "Submit Suggestion"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSuggestDiffState({ status: "idle" })
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

              {contentOpen && problem.content && (
                <div className="cf-problem rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm">
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: content is authored by the site admin and stored in our own DB */}
                  <div dangerouslySetInnerHTML={{ __html: problem.content }} />
                </div>
              )}

              {/* Hints panel */}
              {hintsOpen &&
                hintsState.status === "open" &&
                (() => {
                  const { data: hints } = hintsState;
                  const allNull =
                    !hints.hint_1 && !hints.hint_2 && !hints.hint_3;
                  const hintValues = [hints.hint_1, hints.hint_2, hints.hint_3];
                  const maxRevealable = hintValues.filter(Boolean).length;
                  const canRevealMore =
                    hintsRevealed < 3 && hintsRevealed < maxRevealable;

                  return (
                    <div
                      ref={hintsPanelRef}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
                    >
                      <h3 className="font-semibold">Hints</h3>
                      {allNull ? (
                        <p className="text-sm text-muted-foreground">
                          No hints available yet.
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-col gap-3">
                            {(
                              [
                                { n: 1, text: hints.hint_1 },
                                { n: 2, text: hints.hint_2 },
                                { n: 3, text: hints.hint_3 },
                              ] as const
                            ).map(({ n, text }) => {
                              if (!text || n > hintsRevealed) return null;
                              const myRating = hintRatings[n];
                              return (
                                <div
                                  key={`hint-${n}`}
                                  className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-4 py-3"
                                >
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Hint {n}
                                  </span>
                                  <p className="text-sm leading-relaxed">
                                    <InlineCode text={text} />
                                  </p>
                                  {userId && (
                                    <div className="flex items-center gap-1 pt-1">
                                      <span className="text-xs text-muted-foreground mr-1">
                                        Helpful?
                                      </span>
                                      <button
                                        type="button"
                                        disabled={ratingPending === n}
                                        onClick={() =>
                                          handleRate(
                                            problem.problem_number ?? 0,
                                            n,
                                            "up",
                                          )
                                        }
                                        className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                                          myRating === "up"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                            : "bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                        aria-label="Thumbs up"
                                      >
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-hidden="true"
                                        >
                                          <path d="M7 10v12" />
                                          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                                        </svg>
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        disabled={ratingPending === n}
                                        onClick={() =>
                                          handleRate(
                                            problem.problem_number ?? 0,
                                            n,
                                            "down",
                                          )
                                        }
                                        className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                                          myRating === "down"
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                            : "bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                        aria-label="Thumbs down"
                                      >
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-hidden="true"
                                        >
                                          <path d="M17 14V2" />
                                          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
                                        </svg>
                                        No
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {canRevealMore && (
                            <Button
                              variant="outline"
                              className="self-start"
                              onClick={() =>
                                setHintsRevealed((r) => Math.min(r + 1, 3))
                              }
                            >
                              Reveal Hint {hintsRevealed + 1}
                            </Button>
                          )}
                          {!canRevealMore && maxRevealable > 0 && (
                            <div className="flex flex-col gap-2">
                              <p className="text-xs text-muted-foreground">
                                All hints revealed.
                              </p>
                              <Button
                                variant="outline"
                                className="self-start"
                                onClick={() =>
                                  toggleSolution(problem.problem_number ?? 0)
                                }
                                disabled={solutionLoading}
                              >
                                {solutionLoading
                                  ? "Loading…"
                                  : solutionOpen
                                    ? "Hide Solution"
                                    : "View Solution"}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

              {/* Solution panel */}
              {solutionState.status === "error" && (
                <p className="text-sm text-destructive">
                  {solutionState.message}
                </p>
              )}
              {hintsState.status === "error" && (
                <p className="text-sm text-destructive">{hintsState.message}</p>
              )}

              {solutionOpen &&
                solutionState.status === "open" &&
                (() => {
                  const solution = solutionState.data;
                  const codes = solution.solution_codes ?? [];
                  const withCode = codes.filter((c) => c.code);
                  const active =
                    withCode.find((c) => c.language === selectedLanguage) ??
                    withCode[0];
                  const langLabel: Record<string, string> = {
                    "C++": "C++",
                    Python: "Python",
                    Java: "Java",
                    JavaScript: "JavaScript",
                  };

                  function handleCopy() {
                    if (!active?.code) return;
                    navigator.clipboard.writeText(active.code);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }

                  return (
                    <div
                      ref={solutionPanelRef}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden"
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border">
                        <span className="font-semibold text-sm">
                          Code Solution
                        </span>

                        {/* Language tabs — only languages with code */}
                        {withCode.length > 0 && (
                          <div className="flex flex-wrap gap-1 flex-1">
                            {withCode.map((c) => (
                              <button
                                key={c.language}
                                type="button"
                                onClick={() => setSelectedLanguage(c.language)}
                                className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                  c.language === (active?.language ?? "")
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {langLabel[c.language] ?? c.language}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => setCodeVisible((v) => !v)}
                            className="rounded px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {codeVisible ? "Hide" : "Show"}
                          </button>
                          {active?.code && (
                            <button
                              type="button"
                              onClick={handleCopy}
                              className="rounded px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {codeCopied ? "Copied!" : "Copy"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Code block */}
                      {codeVisible && (
                        <div className="px-5">
                          {active?.code ? (
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
                                    active.code,
                                    LANG_GRAMMARS[active.language] ??
                                      languages.clike,
                                    active.language,
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
                      {solution.explanation && (
                        <div className="flex flex-col gap-1 px-5 pb-4">
                          <span className="text-sm font-medium">
                            Explanation
                          </span>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <InlineCode text={solution.explanation} />
                          </p>
                        </div>
                      )}

                      {!solution.explanation && <div className="pb-1" />}
                    </div>
                  );
                })()}
            </>
          );
        })()}

      {/* ── AI Review side tab + panel ───────────────────────── */}
      {state.status === "loaded" &&
        userId &&
        (() => {
          const problemTitle = state.problem.title;
          const problemNumber = state.problem.problem_number ?? 0;

          return (
            <>
              {/* Tab button — sticks to right edge */}
              {!reviewPanelOpen && (
                <button
                  type="button"
                  onClick={() => setReviewPanelOpen(true)}
                  className="fixed right-0 top-1/2 z-40 flex flex-col items-center gap-2 rounded-l-lg bg-primary px-2.5 py-5 text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-primary/50"
                  style={{
                    transform: "translateY(-50%)",
                  }}
                  aria-label="Open AI code review panel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
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
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span
                    className="text-[11px] font-semibold tracking-wide"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    AI Review
                  </span>
                </button>
              )}

              {/* Click-away backdrop */}
              {reviewPanelOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setReviewPanelOpen(false)}
                  aria-hidden="true"
                />
              )}

              {/* Slide-out panel */}
              <div
                className={`fixed right-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] w-[min(400px,100vw)] flex-col border-l border-border bg-card shadow-2xl transition-transform duration-200 ease-in-out ${
                  reviewPanelOpen ? "translate-x-0" : "translate-x-full"
                }`}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm">
                      AI Code Review
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                      {problemTitle}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewPanelOpen(false)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close panel"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Code input section */}
                <div className="flex flex-col gap-3 border-b border-border p-4">
                  <div className="flex items-center justify-between">
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

                  {/* Language selector */}
                  <div className="flex flex-wrap gap-1">
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
                  </div>

                  {/* Code textarea */}
                  <textarea
                    value={reviewCode}
                    onChange={(e) => setReviewCode(e.target.value)}
                    placeholder={`Paste your ${reviewLanguage} code here…`}
                    rows={8}
                    maxLength={10000}
                    spellCheck={false}
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-right text-xs text-muted-foreground">
                    {reviewCode.length}/10000
                  </span>
                </div>

                {/* Chat thread */}
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                  {chatMessages.length === 0 && !chatLoading && !chatError && (
                    <p className="text-center text-xs text-muted-foreground py-6">
                      Paste your code and ask a question to get started.
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
                    <div className="flex flex-col gap-1 items-start">
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

                {/* Chat input */}
                <div className="flex gap-2 border-t border-border p-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleChat(problemNumber);
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
                    onClick={() => void handleChat(problemNumber)}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </>
          );
        })()}
    </div>
  );
}
