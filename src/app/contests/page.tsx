import { redirect } from "next/navigation";
import { createClient, getUser } from "~/lib/supabase/server";

type CfContest = {
  id: number;
  name: string;
  type: string;
  phase: string;
  durationSeconds: number;
  startTimeSeconds?: number;
};

type CfRatingChange = {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
};

async function fetchContests(): Promise<CfContest[]> {
  try {
    const res = await fetch(
      "https://codeforces.com/api/contest.list?gym=false",
      { next: { revalidate: 1800 } },
    );
    const data = (await res.json()) as { status: string; result?: CfContest[] };
    return data.result ?? [];
  } catch {
    return [];
  }
}

async function fetchUserRatingHistory(
  handle: string,
): Promise<CfRatingChange[]> {
  try {
    const res = await fetch(
      `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`,
      { next: { revalidate: 1800 } },
    );
    const data = (await res.json()) as {
      status: string;
      result?: CfRatingChange[];
    };
    return data.result ?? [];
  } catch {
    return [];
  }
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(ts * 1000));
}

function timeUntil(ts: number): string {
  const diff = ts * 1000 - Date.now();
  if (diff < 0) return "Started";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `in ${hours}h ${mins}m` : `in ${mins}m`;
}

export default async function ContestsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("cf_handle, cf_rating, cf_rank")
    .eq("id", user.id)
    .single<{
      cf_handle: string | null;
      cf_rating: number | null;
      cf_rank: string | null;
    }>();

  const cfHandle = profile?.cf_handle ?? null;

  const [allContests, ratingHistory] = await Promise.all([
    fetchContests(),
    cfHandle ? fetchUserRatingHistory(cfHandle) : Promise.resolve([]),
  ]);

  const upcoming = allContests
    .filter((c) => c.phase === "BEFORE" && c.startTimeSeconds)
    .sort((a, b) => (a.startTimeSeconds ?? 0) - (b.startTimeSeconds ?? 0))
    .slice(0, 15);

  const recent = [...ratingHistory].reverse().slice(0, 10);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Contests</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming Codeforces contests
          {cfHandle
            ? ` · linked as ${cfHandle}`
            : " · link your CF account on your profile to track your history"}
        </p>
      </div>

      {/* Upcoming contests */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming contests found.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded border border-border overflow-hidden">
            {upcoming.map((c) => (
              <a
                key={c.id}
                href={`https://codeforces.com/contest/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                  <span className="text-sm font-medium leading-snug group-hover:text-primary transition-colors truncate">
                    {c.name}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {c.startTimeSeconds
                        ? formatDate(c.startTimeSeconds)
                        : "TBD"}
                    </span>
                    <span>·</span>
                    <span>{formatDuration(c.durationSeconds)}</span>
                    <span>·</span>
                    <span className="uppercase tracking-wide">{c.type}</span>
                  </div>
                </div>
                {c.startTimeSeconds && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {timeUntil(c.startTimeSeconds)}
                  </span>
                )}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-muted-foreground"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* User's recent contest history */}
      {cfHandle && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your Recent Contests
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contest history found for {cfHandle}.
            </p>
          ) : (
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Contest
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Change
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.map((r) => {
                    const delta = r.newRating - r.oldRating;
                    return (
                      <tr
                        key={r.contestId}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium max-w-xs truncate">
                          <a
                            href={`https://codeforces.com/contest/${r.contestId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary hover:underline"
                          >
                            {r.contestName}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          #{r.rank}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {delta >= 0 ? "+" : ""}
                          {delta}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {r.newRating}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!cfHandle && (
        <div className="rounded border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm font-medium mb-1">
            Link your Codeforces account
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Connect your CF handle on your profile to see your contest history
            here.
          </p>
          <a
            href="/profile"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-80 transition-opacity"
          >
            Go to Profile →
          </a>
        </div>
      )}
    </main>
  );
}
