"use client";

import Link from "next/link";
import posthog from "posthog-js";
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
import { processHtmlLatex } from "~/lib/latex";
import { highlight, languages } from "~/lib/prism-setup";
import { timeAgo } from "~/lib/time";
import { levelTitle, rankConfig, xpProgress } from "~/lib/xp";
import { FormattedText } from "./formatting";
import { SidePanel } from "./side-panel";
import type {
  ChatMessage,
  Hints,
  MarkDoneState,
  NoteItem,
  PanelState,
  Problem,
  ReportState,
  Solution,
  SolveTimestamp,
  ViewerState,
} from "./types";

const LANG_GRAMMARS: Record<string, Prism.Grammar> = {
  "C++": languages.cpp,
  Java: languages.java,
  JavaScript: languages.javascript,
  Python: languages.python,
};

const MIN_PANEL_W = 300;
const MAX_PANEL_W = 900;

export function ProblemViewer({
  userId,
  initialProblem = null,
  csrfToken,
  showFocusPrompt = false,
  plan = "free",
  solvedCount = 0,
}: {
  userId: string | null;
  initialProblem?: Problem | null;
  csrfToken: string;
  showFocusPrompt?: boolean;
  plan?: "free" | "pro" | "elite";
  solvedCount?: number;
}) {
  const [state, setState] = useState<ViewerState>(
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
  const [focusBanner, setFocusBanner] = useState(showFocusPrompt);
  const [focusSaving, setFocusSaving] = useState(false);

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

  const loadedProblemNumber =
    state.status === "loaded" ? (state.problem.problem_number ?? null) : null;
  const loadedProblemPlatform =
    state.status === "loaded" ? state.problem.platform : null;
  const loadedProblemDifficulty =
    state.status === "loaded" ? state.problem.difficulty : null;

  // Sync browser tab title with the loaded problem
  useEffect(() => {
    if (state.status === "loaded") {
      const { problem } = state;
      if (problem.problem_number != null && problem.title) {
        document.title = `#${problem.problem_number} ${problem.title} — AlgoPath`;
      }
    } else {
      document.title = "Problems — AlgoPath";
    }
    return () => {
      document.title = "Problems — AlgoPath";
    };
  }, [state]);

  // Track problem view at the top of the hint-consumption funnel
  useEffect(() => {
    if (!loadedProblemNumber) return;
    posthog.capture("problem_viewed", {
      problem_number: loadedProblemNumber,
      platform: loadedProblemPlatform,
      difficulty: loadedProblemDifficulty,
    });
  }, [loadedProblemNumber, loadedProblemPlatform, loadedProblemDifficulty]);

  // After 45s on a problem without opening hints, show a gentle nudge.
  // Dismissed the moment hints are opened or the problem changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadedProblemNumber resets the timer when the problem changes even when state.status stays "loaded"
  useEffect(() => {
    if (hintNudgeTimer.current) clearTimeout(hintNudgeTimer.current);
    setShowHintNudge(false);
    if (
      state.status !== "loaded" ||
      hintsState.status === "open" ||
      hintsState.status === "closed"
    )
      return;
    hintNudgeTimer.current = setTimeout(() => setShowHintNudge(true), 45000);
    return () => {
      if (hintNudgeTimer.current) clearTimeout(hintNudgeTimer.current);
    };
  }, [state.status, hintsState.status, loadedProblemNumber]);

  // Load solve timestamp whenever a problem is loaded
  useEffect(() => {
    if (!loadedProblemNumber || !userId) return;
    const num = loadedProblemNumber;
    fetch(`/api/problems/${num}/view`)
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as {
            solve: {
              solved_at: string;
              xp_gained: number;
              hints_used: number;
            } | null;
          };
          setSolveTimestamp(data.solve ?? null);
        }
      })
      .catch(() => {});
  }, [loadedProblemNumber, userId]);

  // Fetch recently attempted problems (has notes/reviews, not yet solved)
  useEffect(() => {
    if (!userId) return;
    fetch("/api/problems/recent")
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as Problem[];
          setRecentProblems(data);
        }
      })
      .catch(() => {});
  }, [userId]);

  // Auto-start drill from URL ?drill= param
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only — initialProblem is a stable server prop, startDrill must not be a dep here
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drillTag = params.get("drill");
    if (drillTag && !initialProblem) {
      void startDrill(drillTag);
    }
  }, []);

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
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(420);
  const [codeFullscreen, setCodeFullscreen] = useState(false);
  const dragRef = useRef<{ x: number; w: number } | null>(null);
  const [skipWarningPending, setSkipWarningPending] = useState<
    (() => void) | null
  >(null);
  const [recentProblems, setRecentProblems] = useState<Problem[] | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestQuery, setSuggestQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<
    "all" | "codeforces" | "leetcode"
  >("all");
  const [filterTag, setFilterTag] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tagFilterInputRef = useRef<HTMLInputElement>(null);
  const [nextProblem, setNextProblem] = useState<Problem | null>(null);
  const [nextProblemLoading, setNextProblemLoading] = useState(false);
  const [drillQueue, setDrillQueue] = useState<{
    tag: string;
    queue: Problem[];
    index: number;
  } | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillComplete, setDrillComplete] = useState<{
    tag: string;
    total: number;
  } | null>(null);
  const [showHintNudge, setShowHintNudge] = useState(false);
  const hintNudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSolveConfirm, setShowSolveConfirm] = useState(false);

  const [activeTab, setActiveTab] = useState<"notes" | "code" | "ai" | null>(
    null,
  );
  const [problemNotes, setProblemNotes] = useState<
    {
      id: string;
      title: string;
      content: string;
      code: string;
      code_language: string;
      updated_at: string;
    }[]
  >([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesLimitError, setNotesLimitError] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickContent, setQuickContent] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [editorSaveStatus, setEditorSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [solveTimestamp, setSolveTimestamp] = useState<SolveTimestamp>(null);

  // Hint preferences (synced from hints API response, editable by Pro/Elite)
  const [localHintStyle, setLocalHintStyle] = useState<string>("structured");
  const [localAdaptive, setLocalAdaptive] = useState<boolean>(false);
  const [localPreferredModel, setLocalPreferredModel] = useState<string | null>(
    null,
  );
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [hintHistorySessions, setHintHistorySessions] = useState<string[]>([]);

  async function loadProblemNotes(problemNumber: number) {
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/notes?problem_number=${problemNumber}`);
      if (res.ok) {
        const raw = (await res.json()) as {
          id: string;
          title: string;
          content: string;
          code?: string;
          code_language?: string;
          updated_at: string;
        }[];
        setProblemNotes(
          raw.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            code: n.code ?? "",
            code_language: n.code_language ?? "C++",
            updated_at: n.updated_at,
          })),
        );
      }
    } finally {
      setNotesLoading(false);
      setNotesLoaded(true);
    }
  }

  async function saveQuickNote(problemNumber: number) {
    if (!quickTitle.trim() && !quickContent.trim()) return;
    setNotesLimitError(null);
    setQuickSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTitle.trim() || "Untitled",
          content: quickContent.trim(),
          problem_number: problemNumber,
        }),
      });
      if (res.status === 429) {
        setNotesLimitError("Free plan: 3 notes/day. Resets at midnight UTC.");
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as {
          id: string;
          title: string;
          content: string;
          code?: string;
          code_language?: string;
          updated_at: string;
        };
        setProblemNotes((prev) => [
          {
            id: data.id,
            title: data.title,
            content: data.content,
            code: data.code ?? "",
            code_language: data.code_language ?? "C++",
            updated_at: data.updated_at,
          },
          ...prev,
        ]);
        setQuickTitle("");
        setQuickContent("");
      }
    } finally {
      setQuickSaving(false);
    }
  }

  async function fetchRandom() {
    setState({ status: "loading" });
    resetPanels();
    setDrillQueue(null);
    setDrillComplete(null);
    try {
      const params = new URLSearchParams();
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      if (filterTag.trim()) params.set("tag", filterTag.trim());
      if (filterDifficulty.trim())
        params.set("difficulty", filterDifficulty.trim());
      const url =
        params.size > 0
          ? `/api/problems/random?${params}`
          : "/api/problems/random";
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

  function lowerDifficulty(diff: string | null | undefined): string {
    if (diff === "Hard") return "Medium";
    if (diff === "Medium") return "Easy";
    return "";
  }

  async function fetchRandomLower() {
    const currentDiff =
      state.status === "loaded" ? (state.problem.difficulty ?? "") : "";
    setState({ status: "loading" });
    resetPanels();
    setDrillQueue(null);
    setDrillComplete(null);
    try {
      const params = new URLSearchParams();
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      if (filterTag.trim()) params.set("tag", filterTag.trim());
      const lower = lowerDifficulty(currentDiff);
      if (lower) params.set("difficulty", lower);
      const url =
        params.size > 0
          ? `/api/problems/random?${params}`
          : "/api/problems/random";
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

  async function handleSearch() {
    const q = searchQuery.trim();
    const tag = filterTag.trim();
    if (!q && !tag && filterPlatform === "all" && !filterDifficulty.trim())
      return;
    setState({ status: "loading" });
    resetPanels();
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tag) params.set("tag", tag);
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      if (filterDifficulty.trim())
        params.set("difficulty", filterDifficulty.trim());
      const res = await fetch(`/api/problems/search?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Unknown error." });
        return;
      }
      const problems: Problem[] = data;
      const exact = q
        ? problems.find((p) => p.title.toLowerCase() === q.toLowerCase())
        : null;
      if (exact) {
        setState({ status: "loaded", problem: exact, contentOpen: false });
      } else {
        setState({ status: "results", problems, source: "search" });
      }
    } catch {
      setState({ status: "error", message: "Failed to reach the server." });
    }
  }

  async function handleTagClick(tag: string) {
    setFilterTag(tag);
    setSearchQuery("");
    setState({ status: "loading" });
    resetPanels();
    try {
      const params = new URLSearchParams({ tag });
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      const res = await fetch(`/api/problems/search?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setState({
          status: "error",
          message: data.error ?? "No problems found.",
        });
      } else {
        const problems: Problem[] = data;
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
    setActiveTab(null);
    setProblemNotes([]);
    setNotesLoaded(false);
    setNotesLoading(false);
    setQuickTitle("");
    setQuickContent("");
    setQuickSaving(false);
    setEditorSaveStatus("idle");
    setSolveTimestamp(null);
    setSkipWarningPending(null);
    setPanelWidth(420);
    setCodeFullscreen(false);
    setNextProblem(null);
    setNextProblemLoading(false);
    setShowHintNudge(false);
    setShowSolveConfirm(false);
    setHintHistorySessions([]);
    if (hintNudgeTimer.current) clearTimeout(hintNudgeTimer.current);
  }

  async function startDrill(tag: string) {
    setDrillLoading(true);
    setDrillComplete(null);
    try {
      const params = new URLSearchParams({ tag });
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      const res = await fetch(`/api/problems/drill?${params}`);
      const data = await res.json();
      if (!res.ok || !data.queue?.length) {
        setState({
          status: "error",
          message: data.error ?? "Could not build a drill queue for this tag.",
        });
        return;
      }
      const queue: Problem[] = data.queue;
      setDrillQueue({ tag, queue, index: 0 });
      selectProblem(queue[0]);
      const url = new URL(window.location.href);
      url.searchParams.set("drill", tag);
      window.history.pushState({}, "", url.toString());
    } finally {
      setDrillLoading(false);
    }
  }

  function advanceDrill() {
    if (!drillQueue) return;
    const nextIndex = drillQueue.index + 1;
    if (nextIndex < drillQueue.queue.length) {
      setDrillQueue({ ...drillQueue, index: nextIndex });
      selectProblem(drillQueue.queue[nextIndex]);
    } else {
      exitDrill();
      setState({ status: "idle" });
      resetPanels();
    }
  }

  function exitDrill() {
    setDrillQueue(null);
    setDrillComplete(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("drill");
    window.history.pushState({}, "", url.toString());
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
        posthog.capture("solution_viewed", { problem_number: problemNumber });
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
        // Sync hint preferences from response
        if (hintsData.hint_style) setLocalHintStyle(hintsData.hint_style);
        if (typeof hintsData.adaptive_difficulty === "boolean")
          setLocalAdaptive(hintsData.adaptive_difficulty);
        setLocalPreferredModel(hintsData.preferred_model ?? null);
        if (ratingsRes?.ok) {
          const ratingsData = await ratingsRes.json();
          setHintRatings({
            1: ratingsData[1] ?? null,
            2: ratingsData[2] ?? null,
            3: ratingsData[3] ?? null,
          });
        }
        // Fetch hint history for Pro (last session) and Elite (full history)
        if (plan === "pro" || plan === "elite") {
          fetch(`/api/problems/${problemNumber}/hint-history`)
            .then(async (r) => {
              if (r.ok) {
                const d = (await r.json()) as { sessions: string[] };
                setHintHistorySessions(d.sessions ?? []);
              }
            })
            .catch(() => {});
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
        posthog.capture("hint_rated", {
          problem_number: problemNumber,
          hint_number: hintNumber,
          rating: next,
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

  async function handleMarkDone(loggedAsReference = false) {
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
          logged_as_reference: loggedAsReference || undefined,
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
          oldLevel: data.old_level ?? data.new_level ?? 1,
          newLevel: data.new_level ?? 1,
        });
        posthog.capture("problem_solved", {
          problem_number: problem.problem_number,
          difficulty: problem.difficulty,
          hints_used: hintsUsed,
          logged_as_reference: loggedAsReference,
          xp_gain: data.xp_gain,
          rating_gain: data.rating_gain,
          new_level: data.new_level,
          streak: data.streak,
        });
        if (drillQueue) {
          const nextIndex = drillQueue.index + 1;
          if (nextIndex < drillQueue.queue.length) {
            setNextProblem(drillQueue.queue[nextIndex]);
          } else {
            setDrillComplete({
              tag: drillQueue.tag,
              total: drillQueue.queue.length,
            });
            setDrillQueue(null);
          }
          setNextProblemLoading(false);
        } else {
          // Fire next-problem fetch immediately (replaces 1.5s auto-random)
          setNextProblemLoading(true);
          fetch(`/api/problems/${problem.problem_number}/next`)
            .then(async (r) => {
              if (r.ok) setNextProblem((await r.json()) as Problem);
            })
            .catch(() => {})
            .finally(() => setNextProblemLoading(false));
        }
      }
    } catch {
      setMarkDoneState({
        status: "error",
        message: "Failed to reach the server.",
      });
    }
  }

  // Expand the page <main> to fill the full viewport when the panel is open,
  // so the problem content uses all available left-side space.
  useEffect(() => {
    const isPanelOpen =
      activeTab !== null && state.status === "loaded" && !!userId;
    const main = document.querySelector<HTMLElement>("main");
    if (!main) return;
    main.style.transition = "padding-right 0.25s ease";
    if (isPanelOpen) {
      main.style.maxWidth = "none";
      main.style.marginLeft = "0";
      main.style.marginRight = "0";
      main.style.paddingRight = `${panelWidth + 24}px`;
    } else {
      main.style.maxWidth = "";
      main.style.marginLeft = "";
      main.style.marginRight = "";
      main.style.paddingRight = "";
    }
    return () => {
      const m = document.querySelector<HTMLElement>("main");
      if (!m) return;
      m.style.maxWidth = "";
      m.style.marginLeft = "";
      m.style.marginRight = "";
      m.style.paddingRight = "";
      m.style.transition = "";
    };
  }, [activeTab, panelWidth, state.status, userId]);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { x: e.clientX, w: panelWidth };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = dragRef.current.x - ev.clientX;
      setPanelWidth(
        Math.max(MIN_PANEL_W, Math.min(MAX_PANEL_W, dragRef.current.w + dx)),
      );
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function triggerWithSkipWarning(action: () => void) {
    if (state.status === "loaded") {
      setSkipWarningPending(() => action);
    } else {
      action();
    }
  }

  const isLoading = state.status === "loading";

  async function saveCodeAsNote() {
    if (!reviewCode.trim()) return;
    setEditorSaveStatus("saving");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:
            state.status === "loaded"
              ? `${state.problem.title} (${reviewLanguage})`
              : "Untitled",
          content: "",
          code: reviewCode,
          code_language: reviewLanguage,
          problem_number:
            state.status === "loaded" ? (state.problem.problem_number ?? 0) : 0,
        }),
      });
      if (res.ok) {
        setEditorSaveStatus("saved");
        setTimeout(() => setEditorSaveStatus("idle"), 2000);
        if (notesLoaded) {
          const data = (await res.json()) as NoteItem;
          setProblemNotes((prev) => [data, ...prev]);
        }
      } else {
        setEditorSaveStatus("error");
      }
    } catch {
      setEditorSaveStatus("error");
    }
  }

  async function saveFocus(value: string) {
    setFocusSaving(true);
    try {
      await fetch("/api/profiles/focus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ focus: value }),
      });
    } catch {
      // non-fatal
    }
    setFocusBanner(false);
    setFocusSaving(false);
  }

  async function savePreference(patch: Record<string, unknown>) {
    setPrefsSaving(true);
    try {
      await fetch("/api/profiles/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(patch),
      });
    } catch {
      // non-fatal
    } finally {
      setPrefsSaving(false);
    }
  }

  function exportNotes() {
    if (problemNotes.length === 0) return;
    const problemTitle =
      state.status === "loaded" ? state.problem.title : "Problem Notes";
    const content = problemNotes
      .map(
        (n) =>
          `# ${n.title}\n\n${n.content}${n.code ? `\n\n\`\`\`${n.code_language ?? ""}\n${n.code}\n\`\`\`` : ""}`,
      )
      .join("\n\n---\n\n");
    const blob = new Blob([`# ${problemTitle}\n\n${content}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${problemTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  function formatHintText(text: string, style: string): string {
    if (style === "socratic") {
      const base = text.replace(/\.\s*$/, "");
      return `Think about this: ${base}. What approach does this suggest?`;
    }
    if (style === "minimal") {
      const match = text.match(/^(.{1,180}[.!?])\s/);
      return match
        ? match[1]
        : text.slice(0, 180).trimEnd() + (text.length > 180 ? "…" : "");
    }
    return text;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Focus prompt — shown once for onboarded users who haven't set a focus yet */}
      {focusBanner && (
        <div className="rounded-lg border border-border bg-muted/50 px-5 py-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              What are you focusing on?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Helps us surface the right problems for you.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "interviews", label: "Interview Prep" },
                { value: "comp_programming", label: "Competitive Programming" },
                { value: "both", label: "Both / Not sure" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={focusSaving}
                onClick={() => saveFocus(opt.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFocusBanner(false)}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* First-time welcome — shown to authenticated users with 0 solves */}
      {state.status === "idle" && userId && solvedCount === 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-sm font-semibold">Welcome to AlgoPath!</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Not sure where to start? Hit{" "}
            <button
              type="button"
              onClick={() => triggerWithSkipWarning(fetchRandom)}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Decide for me
            </button>{" "}
            and we'll pick a problem matched to your skill level. Once you load
            a problem, click{" "}
            <span className="font-medium text-foreground">Get Hints</span> if
            you get stuck.
          </p>
        </div>
      )}

      {/* Intent screen — three paths for starting a session */}
      {state.status === "idle" && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">
            What do you want to practice today?
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => triggerWithSkipWarning(fetchRandom)}
              disabled={isLoading}
              className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-foreground/30 hover:bg-muted/50 disabled:opacity-50"
            >
              <span className="text-sm font-semibold">Decide for me</span>
              <span className="text-xs text-muted-foreground">
                Skip the guesswork — we pick a problem matched to your skill
                level so you can start immediately.
              </span>
            </button>
            <button
              type="button"
              onClick={() => tagFilterInputRef.current?.focus()}
              className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-foreground/30 hover:bg-muted/50"
            >
              <span className="text-sm font-semibold">Practice a topic</span>
              <span className="text-xs text-muted-foreground">
                Filter by tag — arrays, DP, graphs, and more
              </span>
            </button>
            <button
              type="button"
              onClick={() => searchInputRef.current?.focus()}
              className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-foreground/30 hover:bg-muted/50"
            >
              <span className="text-sm font-semibold">Browse problems</span>
              <span className="text-xs text-muted-foreground">
                Search by title or use platform and difficulty filters
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Continue where you left off — shown first when returning */}
      {state.status === "idle" &&
        userId &&
        recentProblems &&
        recentProblems.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Continue where you left off
            </p>
            <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
              {recentProblems.map((problem) => (
                <button
                  key={problem.id}
                  type="button"
                  onClick={() => selectProblem(problem)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  {problem.problem_number != null && (
                    <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                      #{problem.problem_number}
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm font-medium">
                    {problem.title}
                  </span>
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
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                or start fresh
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {(
            [
              { v: "all" as const, label: "All" },
              { v: "codeforces" as const, label: "CF" },
              { v: "leetcode" as const, label: "LC" },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilterPlatform(v)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                filterPlatform === v
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          ref={tagFilterInputRef}
          type="text"
          placeholder="Tag…"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="h-7 w-28 rounded-md border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="Difficulty…"
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="h-7 w-24 rounded-md border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {(filterTag || filterDifficulty || filterPlatform !== "all") && (
          <button
            type="button"
            onClick={() => {
              setFilterTag("");
              setFilterDifficulty("");
              setFilterPlatform("all");
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            ref={searchInputRef}
            placeholder="Search by problem title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={isLoading}
            className="max-w-sm"
          />
          <Button
            onClick={handleSearch}
            disabled={
              isLoading ||
              (!searchQuery.trim() &&
                !filterTag.trim() &&
                filterPlatform === "all" &&
                !filterDifficulty.trim())
            }
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
          onClick={() => triggerWithSkipWarning(fetchRandom)}
          disabled={isLoading}
          className="self-start flex items-center gap-2"
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
            <rect x="2" y="2" width="20" height="20" rx="3" ry="3" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          {isLoading ? "Loading…" : "Pick a Problem for Me"}
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

      {/* Skip warning */}
      {skipWarningPending && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-1.5">
          <span className="text-xs text-amber-400">
            Move on from this problem?
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setSkipWarningPending(null);
                void fetchRandomLower();
              }}
              className="rounded px-2 py-0.5 text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-colors"
            >
              Too hard — try easier
            </button>
            <button
              type="button"
              onClick={() => {
                const action = skipWarningPending;
                setSkipWarningPending(null);
                action();
              }}
              className="rounded px-2 py-0.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => setSkipWarningPending(null)}
              className="rounded px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {state.source === "ai" ? "AI suggested " : ""}
              {state.problems.length} result
              {state.problems.length !== 1 ? "s" : ""} — click to open
            </p>
            {state.source === "search" &&
              filterTag &&
              state.problems.length >= 2 && (
                <button
                  type="button"
                  disabled={drillLoading}
                  onClick={() => void startDrill(filterTag)}
                  className="flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50 shrink-0"
                >
                  {drillLoading ? (
                    "Loading…"
                  ) : (
                    <>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Drill this tag
                    </>
                  )}
                </button>
              )}
          </div>
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
                        <button
                          key={tag}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleTagClick(tag);
                          }}
                          className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          {tag}
                        </button>
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

      {/* Drill progress banner */}
      {drillQueue && state.status === "loaded" && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-xs text-muted-foreground shrink-0">
            Drill —{" "}
            <span className="font-medium text-foreground">
              {drillQueue.tag}
            </span>
          </span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-300"
              style={{
                width: `${((drillQueue.index + 1) / drillQueue.queue.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs font-medium shrink-0 tabular-nums">
            {drillQueue.index + 1} / {drillQueue.queue.length}
          </span>
          <button
            type="button"
            onClick={exitDrill}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Exit
          </button>
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
                        <button
                          key={tag}
                          type="button"
                          onClick={() => void handleTagClick(tag)}
                          className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
                        >
                          <Badge
                            variant="secondary"
                            className="pointer-events-none cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                          >
                            {tag}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm break-all text-muted-foreground">
                    {problem.url}
                  </div>
                  {!hintsOpen && !hintsLoading && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHintNudge(false);
                        toggleHints(problem.problem_number ?? 0);
                      }}
                      className="self-start text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Stuck? Get a hint →
                    </button>
                  )}
                </CardContent>

                {/* Hint nudge — appears after 45s of inactivity */}
                {showHintNudge && !hintsOpen && (
                  <div className="mx-6 mb-2 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
                    <p className="text-sm text-foreground">
                      Stuck? Step-by-step hints can unblock you without giving
                      away the answer.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHintNudge(false);
                        toggleHints(problem.problem_number ?? 0);
                      }}
                      className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-80 transition-opacity"
                    >
                      Get Hint 1 →
                    </button>
                  </div>
                )}

                <CardFooter className="flex-wrap gap-2">
                  {problem.content && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setState({ ...state, contentOpen: !contentOpen });
                      }}
                    >
                      {contentOpen ? "Hide Problem" : "Open Problem"}
                    </Button>
                  )}
                  <Button
                    variant={hintsOpen ? "outline" : "default"}
                    onClick={() => {
                      setShowHintNudge(false);
                      toggleHints(problem.problem_number ?? 0);
                    }}
                    disabled={hintsLoading}
                  >
                    {hintsLoading
                      ? "Loading…"
                      : hintsOpen
                        ? "Hide Hints"
                        : "Get Hints"}
                  </Button>
                  <Button
                    variant={problem.content ? "outline" : "default"}
                    asChild
                  >
                    <Link
                      href={problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {}}
                    >
                      Open Link
                    </Link>
                  </Button>
                  {userId ? (
                    !showSolveConfirm && (
                      <Button
                        className="ml-auto"
                        onClick={() => {
                          if (!markDoneDisabled) setShowSolveConfirm(true);
                        }}
                        disabled={markDoneDisabled}
                        title={
                          solutionViewed
                            ? "Cannot mark as done after viewing the solution"
                            : undefined
                        }
                      >
                        {markDoneLabel}
                      </Button>
                    )
                  ) : (
                    <Button className="ml-auto" variant="outline" asChild>
                      <Link href="/auth/login">Sign in to track progress</Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() =>
                      triggerWithSkipWarning(
                        drillQueue ? advanceDrill : fetchRandom,
                      )
                    }
                  >
                    {drillQueue ? "Skip →" : "Skip problem"}
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

                  {/* Solve confirmation */}
                  {showSolveConfirm && (
                    <div className="w-full rounded-lg border border-border bg-muted/40 px-4 py-3 flex flex-col gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          How'd it go?
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          No pressure — both options count toward your streak.
                          Solving without hints earns more XP.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowSolveConfirm(false);
                            void handleMarkDone(false);
                          }}
                        >
                          Solved it myself
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowSolveConfirm(false);
                            void handleMarkDone(true);
                          }}
                        >
                          Needed a peek
                        </Button>
                        <button
                          type="button"
                          onClick={() => setShowSolveConfirm(false)}
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>

              {/* Solve timestamp strip */}
              {userId && solveTimestamp && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-green-500">✓ Solved</span>
                    <span
                      title={new Date(
                        solveTimestamp.solved_at,
                      ).toLocaleString()}
                    >
                      {timeAgo(solveTimestamp.solved_at)}
                    </span>
                    {solveTimestamp.xp_gained > 0 && (
                      <span className="text-muted-foreground/70">
                        (+{solveTimestamp.xp_gained} XP)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* XP gain notification */}
              {markDoneState.status === "done" &&
                (() => {
                  const { xpGain, newLevel, oldLevel } = markDoneState;
                  const leveledUp = newLevel > oldLevel;
                  const config = rankConfig(newLevel);
                  const progress = xpProgress(0, newLevel);
                  return (
                    <div
                      className="flex flex-col gap-3 rounded-xl border px-5 py-4"
                      style={{
                        borderColor: `${config.color}40`,
                        background: config.bg,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-sm">
                            ✓
                          </span>
                          <span className="font-semibold text-sm">
                            Problem Solved!
                          </span>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            color: config.color,
                            borderColor: `${config.color}40`,
                            backgroundColor: config.bg,
                          }}
                        >
                          {config.icon} Lv.{newLevel} · {levelTitle(newLevel)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-3xl font-bold tabular-nums"
                          style={{ color: config.color }}
                        >
                          +{xpGain}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          XP earned
                        </span>
                        {leveledUp && (
                          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            Level Up! ↑
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress to Lv.{newLevel + 1}</span>
                          <span>
                            {progress.current.toLocaleString()} /{" "}
                            {progress.needed.toLocaleString()} XP
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${progress.percent}%`,
                              background: config.gradient,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Try this next card — replaces auto-load after solving */}
              {markDoneState.status === "done" &&
                (nextProblemLoading || nextProblem) && (
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Try this next
                    </p>
                    {nextProblemLoading && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">
                          Finding a good next problem
                        </span>
                        <span className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                              style={{ animationDelay: `${i * 150}ms` }}
                            />
                          ))}
                        </span>
                      </div>
                    )}
                    {nextProblem && !nextProblemLoading && (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium">
                            {nextProblem.title}
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {nextProblem.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {nextProblem.difficulty}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {nextProblem.platform === "codeforces"
                                ? "CF"
                                : "LC"}
                            </Badge>
                          </div>
                        </div>
                        {nextProblem.tags && nextProblem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {nextProblem.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (drillQueue) {
                                setDrillQueue({
                                  ...drillQueue,
                                  index: drillQueue.index + 1,
                                });
                              }
                              selectProblem(nextProblem);
                            }}
                          >
                            {drillQueue
                              ? "Continue drill →"
                              : "Practice this →"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNextProblem(null);
                              if (drillQueue) {
                                exitDrill();
                              }
                              triggerWithSkipWarning(fetchRandom);
                            }}
                          >
                            {drillQueue ? "Exit drill" : "Pick something else"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

              {/* Drill complete summary */}
              {drillComplete && !nextProblem && (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold">Drill complete</p>
                    <p className="text-xs text-muted-foreground">
                      You worked through {drillComplete.total} problems on{" "}
                      <span className="font-medium text-foreground">
                        {drillComplete.tag}
                      </span>
                      . Great session.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setDrillComplete(null);
                        void startDrill(drillComplete.tag);
                      }}
                    >
                      Drill again
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDrillComplete(null);
                        fetchRandom();
                      }}
                    >
                      Pick something else
                    </Button>
                  </div>
                </div>
              )}

              {/* Fallback — if next-problem fetch fails entirely */}
              {markDoneState.status === "done" &&
                !nextProblemLoading &&
                !nextProblem &&
                !drillComplete && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      Ready for the next one?
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerWithSkipWarning(fetchRandom)}
                    >
                      Pick a problem
                    </Button>
                  </div>
                )}

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
                  <div
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored DB content; LaTeX processed client-side
                    dangerouslySetInnerHTML={{
                      __html: processHtmlLatex(problem.content),
                    }}
                  />
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
                  const isGated = hints.gated === true;
                  const canRevealMore =
                    !isGated &&
                    hintsRevealed < 3 &&
                    hintsRevealed < maxRevealable;

                  return (
                    <div
                      ref={hintsPanelRef}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold">Hints</h3>
                        <div className="flex items-center gap-2">
                          {/* Model selector — Pro+ */}
                          {(plan === "pro" || plan === "elite") && (
                            <select
                              value={localPreferredModel ?? ""}
                              disabled={prefsSaving}
                              onChange={async (e) => {
                                const v = e.target.value || null;
                                setLocalPreferredModel(v);
                                await savePreference({
                                  preferred_hint_model: v,
                                });
                              }}
                              className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              title="Preferred model for future hint generation"
                            >
                              <option value="">Default model</option>
                              <option value="qwen/qwq-32b:free">QwQ-32B</option>
                              <option value="deepseek/deepseek-r1:free">
                                DeepSeek R1
                              </option>
                              <option value="google/gemma-3-27b-it:free">
                                Gemma 3 27B
                              </option>
                              <option value="meta-llama/llama-3.3-70b-instruct:free">
                                Llama 3.3 70B
                              </option>
                              <option value="mistralai/mistral-small-3.1-24b-instruct:free">
                                Mistral Small 24B
                              </option>
                              <option value="meta-llama/llama-3.1-8b-instruct:free">
                                Llama 3.1 8B
                              </option>
                            </select>
                          )}
                          {plan === "free" && (
                            <Link
                              href="/pricing"
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <rect
                                  x="3"
                                  y="11"
                                  width="18"
                                  height="11"
                                  rx="2"
                                  ry="2"
                                />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              Model
                            </Link>
                          )}
                          {/* Hint style — Elite */}
                          {plan === "elite" && (
                            <select
                              value={localHintStyle}
                              disabled={prefsSaving}
                              onChange={async (e) => {
                                setLocalHintStyle(e.target.value);
                                await savePreference({
                                  hint_style: e.target.value,
                                });
                              }}
                              className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="structured">Structured</option>
                              <option value="socratic">Socratic</option>
                              <option value="minimal">Minimal</option>
                            </select>
                          )}
                          {/* Adaptive difficulty toggle — Elite */}
                          {plan === "elite" && (
                            <button
                              type="button"
                              disabled={prefsSaving}
                              onClick={async () => {
                                const next = !localAdaptive;
                                setLocalAdaptive(next);
                                await savePreference({
                                  adaptive_difficulty: next,
                                });
                              }}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${localAdaptive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                              title="Adaptive difficulty: hints adapt to contest-level context"
                            >
                              Adaptive
                            </button>
                          )}
                        </div>
                      </div>
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
                              if (isGated && n > 1) return null;
                              const displayText = formatHintText(
                                text,
                                localHintStyle,
                              );
                              const myRating = hintRatings[n];
                              return (
                                <div
                                  key={`hint-${n}`}
                                  className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-4 py-3"
                                >
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Hint {n}
                                  </span>
                                  <div className="text-sm leading-relaxed">
                                    <FormattedText text={displayText} />
                                  </div>
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
                            {/* Gated hint placeholders for hints 2 & 3 */}
                            {isGated &&
                              hints.hint_1 &&
                              [2, 3].map((n) => (
                                <div
                                  key={`gated-${n}`}
                                  className="relative overflow-hidden rounded-md border border-dashed border-border bg-muted/20"
                                >
                                  <div
                                    className="pointer-events-none select-none px-4 py-3 blur-sm"
                                    aria-hidden="true"
                                  >
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Hint {n}
                                    </span>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      This hint contains further guidance to
                                      help you solve the problem.
                                    </p>
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="text-muted-foreground"
                                      aria-hidden="true"
                                    >
                                      <rect
                                        x="3"
                                        y="11"
                                        width="18"
                                        height="11"
                                        rx="2"
                                        ry="2"
                                      />
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                  </div>
                                </div>
                              ))}
                          </div>
                          {isGated && (
                            <div className="flex flex-col gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                              <p className="text-sm font-medium">
                                Daily limit reached
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Free plan includes {hints.sessions_limit ?? 3}{" "}
                                hint sessions per day. Hints 2 and 3 are
                                available on Pro. Resets tomorrow.
                              </p>
                              <Link
                                href="/pricing"
                                className="self-start rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-80"
                              >
                                Upgrade to Pro →
                              </Link>
                            </div>
                          )}
                          {canRevealMore &&
                            (userId ? (
                              <Button
                                variant="outline"
                                className="self-start"
                                onClick={() => {
                                  const next = Math.min(hintsRevealed + 1, 3);
                                  setHintsRevealed(next);
                                  posthog.capture("hint_revealed", {
                                    problem_number: problem.problem_number,
                                    hint_number: next,
                                    difficulty: problem.difficulty,
                                  });
                                }}
                              >
                                Reveal Hint {hintsRevealed + 1}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-3 self-start rounded-md border border-border bg-muted/40 px-4 py-2.5">
                                <span className="text-sm text-muted-foreground">
                                  Sign in to reveal more hints
                                </span>
                                <Link
                                  href="/auth/login"
                                  className="text-sm font-medium underline underline-offset-2 transition-colors hover:text-primary"
                                >
                                  Sign in
                                </Link>
                              </div>
                            ))}
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
                          {/* Hint history — Pro (last session) and Elite (all sessions) */}
                          {(plan === "pro" || plan === "elite") &&
                            hintHistorySessions.length > 0 && (
                              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {plan === "pro"
                                    ? "Last hint session"
                                    : "Your hint sessions for this problem"}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {hintHistorySessions.map((date) => (
                                    <span
                                      key={date}
                                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground tabular-nums"
                                    >
                                      {date}
                                    </span>
                                  ))}
                                </div>
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
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            <FormattedText text={solution.explanation} />
                          </div>
                        </div>
                      )}

                      {!solution.explanation && <div className="pb-1" />}

                      {/* Editorial link */}
                      {problem.editorial_url && (
                        <div className="flex items-center gap-2 border-t border-border px-5 py-3">
                          <Link
                            href={problem.editorial_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Read editorial ↗
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </>
          );
        })()}

      {/* ── Fixed side tabs + slide-out panel ── */}
      {state.status === "loaded" && userId && (
        <SidePanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          panelWidth={panelWidth}
          setPanelWidth={setPanelWidth}
          startDrag={startDrag}
          reviewCode={reviewCode}
          setReviewCode={setReviewCode}
          reviewLanguage={reviewLanguage}
          setReviewLanguage={setReviewLanguage}
          codeFullscreen={codeFullscreen}
          setCodeFullscreen={setCodeFullscreen}
          editorSaveStatus={editorSaveStatus}
          onSaveCodeAsNote={saveCodeAsNote}
          problemNotes={problemNotes}
          notesLoading={notesLoading}
          notesLoaded={notesLoaded}
          quickTitle={quickTitle}
          setQuickTitle={setQuickTitle}
          quickContent={quickContent}
          setQuickContent={setQuickContent}
          quickSaving={quickSaving}
          notesLimitError={notesLimitError}
          onLoadNotes={() =>
            loadProblemNotes(state.problem.problem_number ?? 0)
          }
          onSaveQuickNote={() =>
            saveQuickNote(state.problem.problem_number ?? 0)
          }
          onExportNotes={exportNotes}
          plan={plan}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          chatLoading={chatLoading}
          chatError={chatError}
          setChatError={setChatError}
          chatInput={chatInput}
          setChatInput={setChatInput}
          chatReviewsLeft={chatReviewsLeft}
          setChatReviewsLeft={setChatReviewsLeft}
          chatMessagesLeft={chatMessagesLeft}
          chatBottomRef={chatBottomRef}
          onChat={() => void handleChat(state.problem.problem_number ?? 0)}
        />
      )}
    </div>
  );
}
