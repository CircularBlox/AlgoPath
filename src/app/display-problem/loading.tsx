export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 h-8 w-32 animate-pulse rounded-md bg-muted" />
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
    </main>
  );
}
