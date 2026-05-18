export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-10">
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-start gap-5 p-6">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-col gap-3 pt-1 flex-1">
            <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
            <div className="h-2 w-full animate-pulse rounded-full bg-muted mt-1" />
          </div>
        </div>
        <div className="flex divide-x divide-border border-t border-border bg-muted/30">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col gap-2 px-6 py-4">
              <div className="h-7 w-10 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-12 animate-pulse rounded-md bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </main>
  );
}
