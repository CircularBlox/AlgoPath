import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const features = [
  {
    title: "Create & Organize",
    description:
      "Instantly create new notes with a single click. Your notes are organized in a clean sidebar for quick access.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    title: "Edit in Real Time",
    description:
      "Click any note to start editing. Changes to both the title and body are saved automatically as you type.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    title: "Persisted Locally",
    description:
      "Notes are saved to your browser's localStorage — no account needed. Your data stays private and available offline.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    title: "Delete Anytime",
    description:
      "Remove notes you no longer need with one click. The sidebar updates instantly and selects the next available note.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-16 px-6 py-16">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Your thoughts,
          <br />
          always within reach.
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          A minimal notes app that lives right in your browser. Write freely,
          stay organized, and pick up exactly where you left off.
        </p>
        <Button asChild size="lg">
          <Link href="/notes">Open Notes</Link>
        </Button>
      </section>

      {/* Feature cards */}
      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                {feature.icon}
              </div>
              <CardTitle className="mt-2">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* App preview */}
      <section className="flex flex-col gap-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Simple two-panel layout
        </h2>
        <div className="overflow-hidden rounded-xl border bg-muted/40">
          {/* Mock app chrome */}
          <div className="flex items-center gap-1.5 border-b bg-background px-4 py-3">
            <span className="size-3 rounded-full bg-destructive/60" />
            <span className="size-3 rounded-full bg-yellow-400/60" />
            <span className="size-3 rounded-full bg-green-500/60" />
          </div>
          <div className="grid grid-cols-[200px_1fr] divide-x text-sm">
            {/* Sidebar */}
            <div className="flex flex-col gap-1 bg-background p-3">
              <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </div>
              {["Meeting recap", "Project ideas", "Shopping list"].map(
                (title, i) => (
                  <div
                    key={title}
                    className={`rounded-lg px-2 py-2 ${i === 0 ? "bg-accent font-medium" : "text-muted-foreground"}`}
                  >
                    <p className="truncate">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i === 0 ? "Just now" : `${i + 1} days ago`}
                    </p>
                  </div>
                ),
              )}
            </div>
            {/* Editor */}
            <div className="flex flex-col gap-3 bg-background p-4">
              <p className="text-base font-semibold">Meeting recap</p>
              <p className="text-muted-foreground">
                Discussed Q2 roadmap priorities. Action items: finalize scope by
                Friday, share updated timeline with stakeholders...
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
