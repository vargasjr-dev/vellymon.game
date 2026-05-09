import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

// ─── Product / Price IDs ─────────────────────────────────────────────────────
// Set via environment variables so we can use test-mode IDs in dev
// and live IDs in production without code changes.
export const VELLYMON_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID!;
