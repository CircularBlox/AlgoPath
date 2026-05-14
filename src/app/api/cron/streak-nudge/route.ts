import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "~/env";
import { createAdminClient } from "~/lib/supabase/admin";

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** GET /api/cron/streak-nudge — invoked daily by Vercel Cron at 8 AM UTC.
 *  Sends one email to users whose streak is > 2 and at risk (last solved yesterday).
 *  Skips silently if RESEND_API_KEY is not configured.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!env.RESEND_API_KEY) {
    return NextResponse.json({
      skipped: true,
      reason: "RESEND_API_KEY not configured.",
    });
  }

  const yesterday = yesterdayUtc();
  const adminClient = createAdminClient();

  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id, username, streak")
    .gt("streak", 2)
    .eq("last_solved_date", yesterday)
    .eq("email_streak_nudge", true);

  if (error || !profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM ?? "AlgoPath <noreply@algopath.io>";
  let sent = 0;

  for (const profile of profiles) {
    const { data: authUser } = await adminClient.auth.admin.getUserById(
      profile.id as string,
    );
    const email = authUser?.user?.email;
    if (!email) continue;

    const { error: sendError } = await resend.emails.send({
      from,
      to: email,
      subject: `Your ${profile.streak}-day streak ends at midnight — solve one problem today`,
      html: `
        <p>Hey ${profile.username ?? "there"},</p>
        <p>You have a <strong>${profile.streak}-day streak</strong> going on AlgoPath. One problem today keeps it alive.</p>
        <p><a href="https://algopath.io/display-problem" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Practice now</a></p>
        <p style="color:#64748b;font-size:12px;margin-top:32px;">
          To stop receiving these emails, go to your
          <a href="https://algopath.io/profile" style="color:#64748b;">profile settings</a>
          and turn off streak reminders.
        </p>
      `,
    });

    if (!sendError) sent++;
  }

  return NextResponse.json({ sent });
}
