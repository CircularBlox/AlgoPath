import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

const stats = [
  { label: "Problems Attempted", value: "0" },
  { label: "Hints Used", value: "0" },
  { label: "Notes Created", value: "0" },
  { label: "Days Active", value: "0" },
];

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
          U
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Username</h1>
          <p className="text-sm text-muted-foreground">
            Joined April 2026 &middot; Intermediate
          </p>
        </div>
        <Badge variant="outline" className="ml-auto self-start">
          Free
        </Badge>
      </div>

      <Separator className="my-8" />

      {/* Stats grid */}
      <section>
        <h2 className="mb-4 text-base font-semibold">Stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-2xl font-bold">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="my-8" />

      {/* Recent problems */}
      <section>
        <h2 className="mb-4 text-base font-semibold">Recent Problems</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No problems yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Head to the Problem tab to get started.
          </p>
        </div>
      </section>
    </main>
  );
}
