import { NextResponse } from "next/server";
import { env } from "~/env";
import { getStripe } from "~/lib/billing/stripe";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient, getUser } from "~/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let priceId: string;
  try {
    const body = await req.json();
    priceId = body.priceId;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  try {
    const stripe = getStripe();

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, username")
      .eq("id", user.id)
      .single<{ stripe_customer_id: string | null; username: string | null }>();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.username ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const origin = req.headers.get("origin") ?? env.NEXT_PUBLIC_SUPABASE_URL;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/profile?checkout=success`,
      cancel_url: `${origin}/pricing`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
