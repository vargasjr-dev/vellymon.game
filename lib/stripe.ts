import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

// ─── Product / Price Lookup ──────────────────────────────────────────────────
// Instead of storing IDs as env vars, we query Stripe by hardcoded labels.
// This works across test/live modes without config changes.

const PREMIUM_PRODUCT_NAME = "Vellymon Premium";
const PREMIUM_PRICE_LOOKUP_KEY = "vellymon_premium_monthly";

let cachedPriceId: string | null = null;

/**
 * Look up the Vellymon Premium monthly price ID from Stripe.
 * Uses lookup_key first (preferred), falls back to searching by product name.
 * Result is cached for the lifetime of the server process.
 */
export async function getPremiumPriceId(): Promise<string> {
  if (cachedPriceId) return cachedPriceId;

  // Try lookup_key first — fastest and most deterministic
  const byKey = await stripe.prices.list({
    lookup_keys: [PREMIUM_PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });

  if (byKey.data.length > 0) {
    cachedPriceId = byKey.data[0].id;
    return cachedPriceId;
  }

  // Fallback: find product by name, then get its active recurring price
  const products = await stripe.products.list({ active: true, limit: 100 });
  const product = products.data.find((p) => p.name === PREMIUM_PRODUCT_NAME);

  if (!product) {
    throw new Error(
      `Stripe product "${PREMIUM_PRODUCT_NAME}" not found. Create it in the Stripe dashboard.`
    );
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    type: "recurring",
    limit: 1,
  });

  if (prices.data.length === 0) {
    throw new Error(
      `No active recurring price found for product "${PREMIUM_PRODUCT_NAME}".`
    );
  }

  cachedPriceId = prices.data[0].id;
  return cachedPriceId;
}
