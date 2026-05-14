import "prismjs/themes/prism-okaidia.css";
import { generateCsrfToken } from "~/lib/csrf";
import { createClient, getUser } from "~/lib/supabase/server";
import { ProblemViewer } from "./problem-viewer";
import type { Problem } from "./types";

export default async function DisplayProblemPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const [user, supabase, { p }, csrfToken] = await Promise.all([
    getUser(),
    createClient(),
    searchParams,
    generateCsrfToken(),
  ]);

  const problemNumber = p ? Number.parseInt(p, 10) : null;
  const validProblemNumber =
    problemNumber && !Number.isNaN(problemNumber) ? problemNumber : null;

  const [profileResult, problemResult] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("focus, onboarding_completed")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    validProblemNumber
      ? supabase
          .from("problems")
          .select(
            "id, problem_number, title, url, platform, difficulty, tags, content, editorial_url",
          )
          .eq("problem_number", validProblemNumber)
          .single<Problem>()
      : Promise.resolve({ data: null }),
  ]);

  const showFocusPrompt =
    profileResult.data?.onboarding_completed === true &&
    !profileResult.data?.focus;
  const initialProblem: Problem | null = problemResult.data ?? null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Practice</h1>
      <ProblemViewer
        userId={user?.id ?? null}
        initialProblem={initialProblem}
        csrfToken={csrfToken}
        showFocusPrompt={showFocusPrompt}
      />
    </main>
  );
}
