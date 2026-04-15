import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "~/lib/supabase/server";

const navLinks = [
  { href: "/display-problem", label: "Problems" },
  { href: "/notes", label: "Notes" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function Navbar() {
  const user = await getUser();

  let streak = 0;
  let streakActiveToday = true;

  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("streak, last_solved_date")
      .eq("id", user.id)
      .single<{ streak: number; last_solved_date: string | null }>();

    streak = profile?.streak ?? 0;
    streakActiveToday = profile?.last_solved_date === todayUtc();
  }

  return (
    <header>
      <nav className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
          <Link href="/" className="font-semibold tracking-tight">
            AlgoPath
          </Link>

          {user && (
            <div className="flex gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Streak nudge — only when logged in and streak not fulfilled today */}
      {user && !streakActiveToday && (
        <div className="animate-banner-in border-b border-border bg-muted/60">
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-4 py-2.5">
            <span
              className="animate-fire-flicker text-xl"
              style={{ filter: "grayscale(1)", display: "inline-block" }}
            >
              🔥
            </span>
            <p className="text-sm text-foreground/80">
              {streak > 0
                ? `Your ${streak}-day streak is at risk —`
                : "No streak yet —"}{" "}
              <Link
                href="/display-problem"
                className="font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-foreground/70"
              >
                solve a problem today →
              </Link>
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
