import { NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";
import { getStripe } from "~/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single<{ stripe_customer_id: string | null }>();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 404 },
      );
    }

    const origin = req.headers.get("origin") ?? "";
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
