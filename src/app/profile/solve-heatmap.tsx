import { createClient, getUser } from "~/lib/supabase/server";

function buildGrid(solveDates: string[]): { date: string; count: number }[][] {
  const counts: Record<string, number> = {};
  for (const d of solveDates) {
    const key = d.slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  // Anchor: last Sunday on or before today, then go back 52 full weeks
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endSunday = new Date(today);
  endSunday.setUTCDate(today.getUTCDate() - today.getUTCDay()); // last Sunday ≤ today

  const weeks: { date: string; count: number }[][] = [];
  for (let w = 51; w >= 0; w--) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(endSunday);
      cell.setUTCDate(endSunday.getUTCDate() - w * 7 + d);
      const key = cell.toISOString().slice(0, 10);
      // Don't render future days
      const isFuture = cell > today;
      week.push({ date: key, count: isFuture ? -1 : (counts[key] ?? 0) });
    }
    weeks.push(week);
  }
  return weeks;
}

function cellColor(count: number): string {
  if (count < 0) return "bg-transparent";
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-primary/30";
  if (count === 2) return "bg-primary/55";
  if (count === 3) return "bg-primary/75";
  return "bg-primary";
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function SolveHeatmap() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("solves")
    .select("solved_at")
    .eq("user_id", user.id)
    .gte("solved_at", since)
    .order("solved_at", { ascending: true });

  const solveDates = (data ?? []).map((r) => r.solved_at as string);
  const weeks = buildGrid(solveDates);
  const totalSolves = solveDates.length;

  // Build month label positions: first week each month appears in
  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    const firstDay = weeks[i]?.[0];
    if (!firstDay || firstDay.count < 0) continue;
    const month = new Date(firstDay.date).getUTCMonth();
    if (month !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[month] ?? "", col: i });
      lastMonth = month;
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Solve Activity
        </h2>
        <span className="text-xs text-muted-foreground">
          {totalSolves} solve{totalSolves !== 1 ? "s" : ""} in the past year
        </span>
      </div>
      <div className="overflow-x-auto rounded border border-border bg-card p-4">
        {/* Month labels */}
        <div className="mb-1 flex" style={{ paddingLeft: "1.5rem" }}>
          {weeks.map((week, i) => {
            const pos = monthPositions.find((m) => m.col === i);
            const weekKey = week[0]?.date ?? `w${i}`;
            return (
              <div
                key={weekKey}
                className="w-3.5 shrink-0 text-[9px] text-muted-foreground"
                style={{ marginRight: 2 }}
              >
                {pos?.label ?? ""}
              </div>
            );
          })}
        </div>
        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 pr-1.5 pt-px">
            {(
              [
                { key: "sun", label: "" },
                { key: "mon", label: "M" },
                { key: "tue", label: "" },
                { key: "wed", label: "W" },
                { key: "thu", label: "" },
                { key: "fri", label: "F" },
                { key: "sat", label: "" },
              ] as const
            ).map(({ key, label }) => (
              <div
                key={key}
                className="h-3 w-3 text-[9px] leading-3 text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
          {/* Grid */}
          {weeks.map((week) => (
            <div
              key={week[0]?.date ?? week[6]?.date}
              className="flex flex-col gap-0.5"
            >
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={
                    cell.count > 0
                      ? `${cell.count} solve${cell.count !== 1 ? "s" : ""} on ${cell.date}`
                      : cell.count === 0
                        ? `No solves on ${cell.date}`
                        : undefined
                  }
                  className={`h-3 w-3 rounded-sm ${cellColor(cell.count)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
