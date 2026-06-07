import type { Metadata } from "next";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = {
  title: "FAQ — AlgoPath",
  description: "Answers to common questions about AlgoPath.",
};

type Faq = {
  id: string;
  question: string;
  answer: string;
};

export default async function FaqPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faqs")
    .select("id, question, answer")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Faq[]>();

  const faqs = data ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Frequently asked questions
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything you might be wondering before you start.
        </p>
      </div>

      {faqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No questions yet — check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 open:border-primary/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
                {faq.question}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
