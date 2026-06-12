import { NextResponse } from "next/server";
import { getAuthContext } from "~/lib/security/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const db = createAdminClient();

  // Try username match first, then email
  const { data: byUsername } = await db
    .from("profiles")
    .select("id, username, plan")
    .ilike("username", q)
    .maybeSingle<{ id: string; username: string; plan: string }>();

  if (byUsername) {
    const { data: authUser } = await db.auth.admin.getUserById(byUsername.id);
    return NextResponse.json({
      id: byUsername.id,
      username: byUsername.username,
      plan: byUsername.plan ?? "free",
      email: authUser?.user?.email ?? null,
    });
  }

  // Search by email via auth admin
  const { data: authList } = await db.auth.admin.listUsers({ perPage: 1000 });
  const matched = authList?.users?.find(
    (u) => u.email?.toLowerCase() === q.toLowerCase(),
  );
  if (!matched) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: profile } = await db
    .from("profiles")
    .select("id, username, plan")
    .eq("id", matched.id)
    .maybeSingle<{ id: string; username: string; plan: string }>();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: profile.id,
    username: profile.username,
    plan: profile.plan ?? "free",
    email: matched.email ?? null,
  });
}
