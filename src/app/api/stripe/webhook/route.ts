import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { createAdminClient } from "~/lib/supabase/admin";
import { getStripe, planFromPriceId } from "~/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !customerId || !subscriptionId) break;

        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : null;
        if (!plan) break;

        await admin
          .from("profiles")
          .update({
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const priceId = sub.items.data[0]?.price.id;
        const plan =
          sub.status === "active" && priceId
            ? planFromPriceId(priceId)
            : "free";
        if (!plan) break;

        await admin
          .from("profiles")
          .update({ plan, stripe_subscription_id: sub.id })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        await admin
          .from("profiles")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("stripe_customer_id", customerId);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
