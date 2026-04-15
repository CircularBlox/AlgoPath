import dynamic from "next/dynamic";
import "prismjs/themes/prism-okaidia.css";
import { createClient, getUser } from "~/lib/supabase/server";

const ProblemViewer = dynamic(
  () => import("./problem-viewer").then((m) => ({ default: m.ProblemViewer })),
  {
    loading: () => (
      <p className="text-sm text-muted-foreground py-4">Loading…</p>
    ),
  },
);

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

export default async function DisplayProblemPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const [user, supabase, { p }] = await Promise.all([
    getUser(),
    createClient(),
    searchParams,
  ]);

  let initialProblem: Problem | null = null;
  const problemNumber = p ? Number.parseInt(p, 10) : null;

  if (problemNumber && !Number.isNaN(problemNumber)) {
    // Resolve problem_number → uuid
    const { data: ref } = await supabase
      .from("problems")
      .select("id")
      .eq("problem_number", problemNumber)
      .single();

    if (ref?.id) {
      // Fetch full problem by uuid
      const { data } = await supabase
        .from("problems")
        .select(
          "id, problem_number, title, url, platform, difficulty, tags, content",
        )
        .eq("id", ref.id)
        .single<Problem>();
      initialProblem = data ?? null;
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Practice</h1>
      <ProblemViewer
        userId={user?.id ?? null}
        initialProblem={initialProblem}
      />
    </main>
  );
}
