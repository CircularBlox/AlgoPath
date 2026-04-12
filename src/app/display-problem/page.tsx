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
  searchParams: Promise<{ id?: string }>;
}) {
  const [user, { id: problemId }] = await Promise.all([
    getUser(),
    searchParams,
  ]);

  let initialProblem: Problem | null = null;
  if (problemId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("problems")
      .select(
        "id, problem_number, title, url, platform, difficulty, tags, content",
      )
      .eq("id", problemId)
      .single<Problem>();
    initialProblem = data ?? null;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">
        Problem of the Day
      </h1>
      <ProblemViewer
        userId={user?.id ?? null}
        initialProblem={initialProblem}
      />
    </main>
  );
}
