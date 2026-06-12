export default function Loading() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded border border-border bg-muted"
          />
        ))}
      </div>
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    </main>
  );
}
