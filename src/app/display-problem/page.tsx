import type { Metadata } from "next";
import { Suspense } from "react";
import { generateCsrfToken } from "~/lib/csrf";
import { createClient, getUser } from "~/lib/supabase/server";
import { ProblemViewer } from "./problem-viewer";
import type { Problem } from "./types";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}): Promise<Metadata> {
  const { p } = await searchParams;
  const num = p ? Number.parseInt(p, 10) : null;
  if (!num || Number.isNaN(num)) return { title: "Problems — AlgoPath" };
  const supabase = await createClient();
  const { data } = await supabase
    .from("problems")
    .select("title")
    .eq("problem_number", num)
    .maybeSingle<{ title: string }>();
  return {
    title: data?.title
      ? `#${num} ${data.title} — AlgoPath`
      : `Problem #${num} — AlgoPath`,
  };
}

function ProblemContentSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <div className="h-7 w-20 animate-pulse rounded bg-muted" />
        <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        <div className="h-7 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <div className="h-10 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-px bg-border" />
      <div className="h-10 w-48 animate-pulse rounded bg-muted" />
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
          .select("focus, onboarding_completed, plan, solved_problems")
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
  const rawPlan = profileResult.data?.plan;
  const plan: "free" | "pro" | "elite" =
    rawPlan === "pro" || rawPlan === "elite" ? rawPlan : "free";
  const solvedCount: number =
    (profileResult.data?.solved_problems as number[] | null)?.length ?? 0;

  return (
    <ProblemViewer
      userId={user?.id ?? null}
      initialProblem={initialProblem}
      csrfToken={csrfToken}
      showFocusPrompt={showFocusPrompt}
      plan={plan}
      solvedCount={solvedCount}
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
