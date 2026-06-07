export default function Loading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      <div className="overflow-hidden rounded border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-start gap-5 p-6">
          <div className="size-16 shrink-0 animate-pulse rounded bg-muted" />
          <div className="flex flex-1 flex-col gap-3 pt-1">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-1.5 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-border border-t border-border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col gap-2 px-4 py-4">
              <div className="h-7 w-10 animate-pulse rounded bg-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded bg-muted" />
      </div>
    </main>
  );
}
