"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";
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

const LANG_GRAMMARS: Record<string, Prism.Grammar> = {
  "C++": languages.cpp,
  Java: languages.java,
  JavaScript: languages.javascript,
  Python: languages.python,
};

const MIN_PANEL_W = 300;
const MAX_PANEL_W = 900;

const CODE_CLS = "rounded bg-[oklch(0.6_0_0)] px-1 font-mono text-xs";

function formatInline(s: string): string {
  return s
    .replace(/\$\s*([^$]+?)\s*\$/g, `<code class="${CODE_CLS}">$1</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, `<code class="${CODE_CLS}">$1</code>`);
}

function FormattedText({ text }: { text: string }) {
  const html = useMemo(() => {
    const parts: string[] = [];
    let inList = false;
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line) {
        if (inList) {
          parts.push("</ul>");
          inList = false;
        }
        continue;
      }
      if (/^[*-] /.test(line)) {
        if (!inList) {
          parts.push('<ul class="list-disc list-inside space-y-0.5 my-1">');
          inList = true;
        }
        parts.push(`<li>${formatInline(line.slice(2))}</li>`);
      } else {
        if (inList) {
          parts.push("</ul>");
          inList = false;
        }
        parts.push(`<p class="mb-1">${formatInline(line)}</p>`);
      }
    }
    if (inList) parts.push("</ul>");
    return parts.join("");
  }, [text]);

  // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored DB content
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
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

  const loadedProblemNumber =
    state.status === "loaded" ? (state.problem.problem_number ?? null) : null;
  const loadedProblemPlatform =
    state.status === "loaded" ? state.problem.platform : null;
  const loadedProblemDifficulty =
    state.status === "loaded" ? state.problem.difficulty : null;

  // Track problem view at the top of the hint-consumption funnel
  useEffect(() => {
    if (!loadedProblemNumber) return;
    posthog.capture("problem_viewed", {
      problem_number: loadedProblemNumber,
      platform: loadedProblemPlatform,
      difficulty: loadedProblemDifficulty,
    });
  }, [loadedProblemNumber, loadedProblemPlatform, loadedProblemDifficulty]);

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
  const [quickTitle, setQuickTitle] = useState("");
  const [quickContent, setQuickContent] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [editorSaveStatus, setEditorSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  type SolveTimestamp = {
    solved_at: string;
    xp_gained: number;
    hints_used: number;
  } | null;
  const [solveTimestamp, setSolveTimestamp] = useState<SolveTimestamp>(null);

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
        posthog.capture("problem_solved", {
          problem_number: problem.problem_number,
          difficulty: problem.difficulty,
          hints_used: hintsUsed,
          xp_gain: data.xp_gain,
          rating_gain: data.rating_gain,
          new_level: data.new_level,
          streak: data.streak,
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
          onClick={() => triggerWithSkipWarning(fetchRandom)}
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

      {/* Skip warning */}
      {skipWarningPending && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-1.5">
          <span className="text-xs text-amber-400">
            Skipping counts as giving up this problem.
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const action = skipWarningPending;
                setSkipWarningPending(null);
                action();
              }}
              className="rounded px-2 py-0.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              Skip anyway
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

      {/* Continue where you left off */}
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
                    onClick={() => triggerWithSkipWarning(fetchRandom)}
                    className={userId ? "" : "ml-auto"}
                  >
                    Skip
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
                                  <div className="text-sm leading-relaxed">
                                    <FormattedText text={text} />
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
                          </div>
                          {canRevealMore && (
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
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            <FormattedText text={solution.explanation} />
                          </div>
                        </div>
                      )}

                      {!solution.explanation && <div className="pb-1" />}
                    </div>
                  );
                })()}
            </>
          );
        })()}

      {/* ── Fixed side tabs + slide-out panel ── */}
      {state.status === "loaded" &&
        userId &&
        (() => {
          const problemNumber = state.problem.problem_number ?? 0;
          const isOpen = activeTab !== null;
          const editorFont =
            '"JetBrains Mono","Fira Code","Fira Mono",ui-monospace,monospace';

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
                  problem_number: problemNumber,
                }),
              });
              if (res.ok) {
                setEditorSaveStatus("saved");
                setTimeout(() => setEditorSaveStatus("idle"), 2000);
                if (notesLoaded) {
                  const data = (await res.json()) as {
                    id: string;
                    title: string;
                    content: string;
                    code: string;
                    code_language: string;
                    updated_at: string;
                  };
                  setProblemNotes((prev) => [data, ...prev]);
                }
              } else {
                setEditorSaveStatus("error");
              }
            } catch {
              setEditorSaveStatus("error");
            }
          }

          function handleEditorKeyDown(
            e: React.KeyboardEvent<HTMLTextAreaElement>,
          ) {
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
          ];

          return (
            <>
              {/* Tab buttons fixed to right edge — shift left when panel is open */}
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
                        if (id === "notes" && !notesLoaded)
                          loadProblemNotes(problemNumber);
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
                {/* Panel header: tab switcher + close */}
                <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-2">
                  {TABS.map(({ id, label, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (id === "notes" && !notesLoaded)
                          loadProblemNotes(problemNumber);
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
                    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                      {notesLoading && (
                        <p className="text-sm text-muted-foreground">
                          Loading…
                        </p>
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
                        onClick={() => saveQuickNote(problemNumber)}
                        disabled={
                          quickSaving ||
                          (!quickTitle.trim() && !quickContent.trim())
                        }
                      >
                        {quickSaving ? "Saving…" : "Save Note"}
                      </Button>
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
                            codeFullscreen
                              ? "Collapse editor"
                              : "Expand to split view"
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
                          fontFamily: editorFont,
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
                          fontFamily: editorFont,
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
                        disabled={
                          !reviewCode.trim() || editorSaveStatus === "saving"
                        }
                        onClick={saveCodeAsNote}
                      >
                        {editorSaveStatus === "saving"
                          ? "Saving…"
                          : editorSaveStatus === "saved"
                            ? "Saved ✓"
                            : "Save as Note"}
                      </Button>
                      {editorSaveStatus === "error" && (
                        <span className="text-xs text-destructive">
                          Save failed
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        Tab · Enter auto-indents
                      </span>
                    </div>
                  </div>
                )}

                {/* ── AI Review panel ── */}
                {activeTab === "ai" && (
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
                      {chatMessages.length === 0 &&
                        !chatLoading &&
                        !chatError && (
                          <p className="py-6 text-center text-xs text-muted-foreground">
                            Write your code in the Code Editor tab, then ask a
                            question here.
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
                )}
              </div>
            </>
          );
        })()}
    </div>
  );
}
