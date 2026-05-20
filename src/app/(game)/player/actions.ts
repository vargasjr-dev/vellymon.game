"use server";

import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import { db } from "../../../../data/db";
import { user } from "../../../../data/schema";
import { eq, and, ne } from "drizzle-orm";
import { claimDailyCheckIn } from "../../../../lib/loginStreakService";
import { getSubscriptionInfo } from "../../../../lib/subscription";
import type { DailyCheckInResult } from "../../../../lib/loginStreak";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export async function setUsernameAction(
  newUsername: string,
): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const trimmed = newUsername.trim().toLowerCase();

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      success: false,
      error:
        "Username must be 3–20 characters and contain only letters, numbers, or underscores.",
    };
  }

  // Check uniqueness (exclude current user)
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.username, trimmed), ne(user.id, session.user.id)))
    .limit(1);

  if (existing) {
    return { success: false, error: "That username is already taken." };
  }

  await db
    .update(user)
    .set({ username: trimmed })
    .where(eq(user.id, session.user.id));

  return { success: true };
}

/**
 * Claim the daily check-in reward for the authenticated player.
 * Idempotent — safe to call multiple times per day.
 * Passes subscription status so the service can handle streak freeze logic.
 */
export async function claimDailyCheckInAction(): Promise<DailyCheckInResult> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const subInfo = await getSubscriptionInfo(session.user.id);
  const isSubscriber = subInfo?.subscriptionStatus === "active";
  return claimDailyCheckIn(session.user.id, isSubscriber);
}
