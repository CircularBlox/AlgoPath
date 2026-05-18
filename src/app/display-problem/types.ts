export type Problem = {
  id: string;
  problem_number: number | null;
  title: string;
  url: string;
  platform: string;
  difficulty: string | null;
  tags: string[];
  content: string | null;
  editorial_url: string | null;
};

export type SolutionCode = {
  id: string;
  solution_id: string;
  problem_number: number;
  language: string;
  code: string | null;
};

export type Solution = {
  id: string | null;
  problem_name: string;
  problem_number: number;
  explanation: string | null;
  solution_codes: SolutionCode[];
};

export type Hints = {
  id: string | null;
  problem_name: string;
  problem_number: number;
  hint_1: string | null;
  hint_2: string | null;
  hint_3: string | null;
  gated?: boolean;
  sessions_used?: number;
  sessions_limit?: number;
};

export type ViewerState =
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

export type MarkDoneState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; xpGain: number; newLevel: number; oldLevel: number }
  | { status: "already_solved" }
  | { status: "error"; message: string };

export type ReportState =
  | { status: "idle" }
  | { status: "open" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type PanelState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "open"; data: T }
  | { status: "closed"; data: T };

export type SolveTimestamp = {
  solved_at: string;
  xp_gained: number;
  hints_used: number;
} | null;

export type NoteItem = {
  id: string;
  title: string;
  content: string;
  code: string;
  code_language: string;
  updated_at: string;
};
