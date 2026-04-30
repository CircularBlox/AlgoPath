import { CHANGELOG } from "~/lib/changelog";

const TYPE_STYLES = {
  feat: "bg-primary/10 text-primary",
  fix: "bg-destructive/10 text-destructive",
  improve: "bg-muted text-muted-foreground",
} as const;

const TYPE_LABEL = {
  feat: "feat",
  fix: "fix",
  improve: "improve",
} as const;

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
        <p className="text-sm text-muted-foreground">
          Every update to AlgoPath, newest first.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {CHANGELOG.map((entry) => (
          <div key={entry.version} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-base font-semibold text-foreground">
                v{entry.version}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.date}
              </span>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-border pl-4">
              {entry.changes.map((c) => (
                <div
                  key={`${entry.version}-${c.type}-${c.text.slice(0, 30)}`}
                  className="flex items-start gap-2.5"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-px font-mono text-[10px] font-medium ${TYPE_STYLES[c.type]}`}
                  >
                    {TYPE_LABEL[c.type]}
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
