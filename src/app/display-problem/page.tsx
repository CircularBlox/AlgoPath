import { ProblemViewer } from "./problem-viewer";

export default function DisplayProblemPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">
        Problem of the Day
      </h1>
      <ProblemViewer />
    </main>
  );
}
