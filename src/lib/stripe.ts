import Stripe from "stripe";
import { env } from "~/env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured: missing STRIPE_SECRET_KEY");
  }
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export function planFromPriceId(priceId: string): "pro" | "elite" | null {
  if (
    priceId === env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === env.STRIPE_PRO_YEARLY_PRICE_ID
  )
    return "pro";
  if (
    priceId === env.STRIPE_ELITE_MONTHLY_PRICE_ID ||
    priceId === env.STRIPE_ELITE_YEARLY_PRICE_ID
  )
    return "elite";
  return null;
}
