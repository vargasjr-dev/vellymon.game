import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import type Stripe from "stripe";
import { db } from "../../../../../data/db";
import { user } from "../../../../../data/schema";
import { eq } from "drizzle-orm";
import { grantCredits, calculateMonthlyGrant } from "../../../../../lib/currency";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ─── Webhook Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ─── Event Routing ───────────────────────────────────────────────────────

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error processing webhook ${event.type}: ${message}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // The userId is passed as client_reference_id during checkout creation
  const userId = session.client_reference_id;
  if (!userId) {
    console.error("Checkout session missing client_reference_id (userId)");
    return;
  }

  const customerId = session.customer as string;

  // Link Stripe customer to our user
  await db
    .update(user)
    .set({
      stripeCustomerId: customerId,
      subscriptionStatus: "active",
    })
    .where(eq(user.id, userId));

  console.log(
    `Checkout completed: user=${userId}, customer=${customerId}`
  );
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = mapSubscriptionStatus(subscription.status);

  await db
    .update(user)
    .set({
      subscriptionStatus: status,
      subscriptionId: subscription.id,
    })
    .where(eq(user.stripeCustomerId, customerId));

  console.log(
    `Subscription updated: customer=${customerId}, status=${status}`
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Reset streak on cancellation — resubscribing starts fresh
  await db
    .update(user)
    .set({
      subscriptionStatus: "canceled",
      subscriptionId: null,
      subscriptionStreakMonths: 0,
    })
    .where(eq(user.stripeCustomerId, customerId));

  console.log(`Subscription deleted: customer=${customerId}, streak reset to 0`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Increment subscription streak on successful renewal
  const [existingUser] = await db
    .select({ id: user.id, subscriptionStreakMonths: user.subscriptionStreakMonths })
    .from(user)
    .where(eq(user.stripeCustomerId, customerId))
    .limit(1);

  if (existingUser) {
    const newStreak = (existingUser.subscriptionStreakMonths ?? 0) + 1;

    await db
      .update(user)
      .set({
        subscriptionStatus: "active",
        subscriptionStreakMonths: newStreak,
      })
      .where(eq(user.id, existingUser.id));

    // Grant monthly credits based on loyalty streak
    const grantAmount = calculateMonthlyGrant(newStreak);
    const newBalance = await grantCredits(
      existingUser.id,
      grantAmount,
      "monthly_grant",
      `Monthly grant — ${grantAmount} credits (streak: ${newStreak} mo)`,
    );

    console.log(
      `Payment succeeded: customer=${customerId}, streak=${newStreak}, granted=${grantAmount} credits, balance=${newBalance}`,
    );
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  await db
    .update(user)
    .set({ subscriptionStatus: "past_due" })
    .where(eq(user.stripeCustomerId, customerId));

  console.log(`Payment failed: customer=${customerId}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "none";
    default:
      return "none";
  }
}
