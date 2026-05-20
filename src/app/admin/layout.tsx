import "katex/dist/katex.min.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "~/lib/is-admin";

const NAV_LINKS = [
  { href: "/admin/fix-io", label: "Fix Sample I/O" },
  { href: "/admin/classify-difficulty", label: "Classify Difficulty" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/add-hints", label: "Bulk Hints" },
  { href: "/add-solution", label: "Add Solution" },
  { href: "/admin/solutions", label: "Solutions" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin } = await getAuthContext();
  if (!admin) redirect("/");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Admin top bar */}
      <nav className="border-b border-border bg-muted/40 px-6 py-2.5 flex items-center gap-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Admin
        </span>
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
