export default function Loading() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-7 w-44 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      </div>
    </main>
  );
}
