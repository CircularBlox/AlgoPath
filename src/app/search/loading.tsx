export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex flex-col gap-2">
        <div className="h-7 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mb-4 h-10 w-full animate-pulse rounded-lg bg-muted" />
      <div className="mb-6 flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
    </main>
  );
}
