import { NextResponse } from "next/server";
import { getAuthContext } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, plan } = body as { userId?: string; plan?: string };

  if (!userId || !plan) {
    return NextResponse.json(
      { error: "userId and plan are required" },
      { status: 400 },
    );
  }
  if (!["free", "pro", "elite"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const admin_client = createAdminClient();
  const { error } = await admin_client
    .from("profiles")
    .update({ plan })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId, plan });
}
