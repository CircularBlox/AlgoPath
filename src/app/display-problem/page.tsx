import "prismjs/themes/prism-okaidia.css";
import { Suspense } from "react";
import { generateCsrfToken } from "~/lib/csrf";
import { createClient, getUser } from "~/lib/supabase/server";
import { ProblemViewer } from "./problem-viewer";
import type { Problem } from "./types";

function ProblemContentSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-72 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-20 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-px bg-border" />
      <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
    </div>
  );
}

async function ProblemContent({ p }: { p?: string }) {
  const [user, supabase, csrfToken] = await Promise.all([
    getUser(),
    createClient(),
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
    <ProblemViewer
      userId={user?.id ?? null}
      initialProblem={initialProblem}
      csrfToken={csrfToken}
      showFocusPrompt={showFocusPrompt}
    />
  );
}

export default async function DisplayProblemPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Problems</h1>
        <p className="text-sm text-muted-foreground">
          Search by title, filter by platform or difficulty, or let us pick for
          you.
        </p>
      </div>
      <Suspense fallback={<ProblemContentSkeleton />}>
        <ProblemContent p={p} />
      </Suspense>
    </main>
  );
}
