import { db } from "../data/db";
import { userCurrency, currencyTransaction } from "../data/schema";
import { eq, sql } from "drizzle-orm";

export type TransactionType = "monthly_grant" | "purchase" | "spend" | "refund" | "daily_quest";

/**
 * Get a user's current credit balance. Returns 0 if no currency record exists.
 */
export async function getBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: userCurrency.balance })
    .from(userCurrency)
    .where(eq(userCurrency.userId, userId))
    .limit(1);

  return row?.balance ?? 0;
}

/**
 * Get full currency info for a user.
 */
export async function getCurrencyInfo(userId: string) {
  const [row] = await db
    .select()
    .from(userCurrency)
    .where(eq(userCurrency.userId, userId))
    .limit(1);

  return row ?? { userId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
}

/**
 * Grant credits to a user. Creates the currency record if it doesn't exist.
 * Returns the new balance.
 */
export async function grantCredits(
  userId: string,
  amount: number,
  type: TransactionType,
  description?: string,
): Promise<number> {
  if (amount <= 0) throw new Error("Grant amount must be positive");

  // Upsert currency record
  await db
    .insert(userCurrency)
    .values({
      userId,
      balance: amount,
      lifetimeEarned: amount,
      lifetimeSpent: 0,
    })
    .onConflictDoUpdate({
      target: userCurrency.userId,
      set: {
        balance: sql`${userCurrency.balance} + ${amount}`,
        lifetimeEarned: sql`${userCurrency.lifetimeEarned} + ${amount}`,
      },
    });

  // Log transaction
  await db.insert(currencyTransaction).values({
    userId,
    amount,
    type,
    description,
  });

  return getBalance(userId);
}

/**
 * Spend credits from a user's balance.
 * Throws if insufficient balance. Returns the new balance.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  type: TransactionType,
  description?: string,
): Promise<number> {
  if (amount <= 0) throw new Error("Spend amount must be positive");

  const currentBalance = await getBalance(userId);
  if (currentBalance < amount) {
    throw new Error(
      `Insufficient credits: need ${amount}, have ${currentBalance}`,
    );
  }

  await db
    .update(userCurrency)
    .set({
      balance: sql`${userCurrency.balance} - ${amount}`,
      lifetimeSpent: sql`${userCurrency.lifetimeSpent} + ${amount}`,
    })
    .where(eq(userCurrency.userId, userId));

  // Log transaction (negative amount for spends)
  await db.insert(currencyTransaction).values({
    userId,
    amount: -amount,
    type,
    description,
  });

  return getBalance(userId);
}

/**
 * Calculate monthly grant amount based on subscription streak.
 * Base: 500 credits. Bonus: +50 per streak month. Cap: 1000.
 */
export function calculateMonthlyGrant(streakMonths: number): number {
  const base = 500;
  const bonus = 50 * streakMonths;
  return Math.min(base + bonus, 1000);
}
