/**
 * Daily Login Streak service — streak reading and check-in claiming.
 *
 * One check-in per UTC day. Calling claimDailyCheckIn is idempotent — repeat
 * calls on the same day return { alreadyClaimed: true } without re-awarding rewards.
 *
 * Streak rules:
 *   - lastClaimedDate === yesterday → streak += 1 (consecutive)
 *   - lastClaimedDate < yesterday  → streak resets to 1 (missed day)
 *   - lastClaimedDate === today    → already claimed (no-op)
 *
 * Milestone bonuses stack on top of base daily rewards when the new streak
 * exactly matches a milestone day count.
 */

import { db } from "../data/db";
import { userLoginStreak } from "../data/schema";
import { eq } from "drizzle-orm";
import { awardXP } from "./seasons";
import { grantCredits } from "./currency";
import {
  BASE_DAILY_XP,
  BASE_DAILY_CREDITS,
  DEFAULT_STREAK_ROW,
  getMilestoneForStreak,
  todayUTCDate,
  yesterdayUTCDate,
  type LoginStreakRow,
  type DailyCheckInResult,
} from "./loginStreak";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read a player's current login streak data.
 * Returns the default (all-zero) row if the player has never checked in.
 *
 * @param userId — the authenticated player
 */
export async function getLoginStreak(userId: string): Promise<LoginStreakRow> {
  const [row] = await db
    .select()
    .from(userLoginStreak)
    .where(eq(userLoginStreak.userId, userId))
    .limit(1);

  if (!row) return { ...DEFAULT_STREAK_ROW };

  return {
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    lastClaimedDate: row.lastClaimedDate,
    totalClaimed: row.totalClaimed,
    streakFreezeCount: row.streakFreezeCount,
    lastFreezeGrantDate: row.lastFreezeGrantDate,
  };
}

/**
 * Claim the daily check-in reward for today.
 *
 * Idempotent — safe to call multiple times; only the first call per UTC day
 * awards rewards. Subsequent calls return { alreadyClaimed: true }.
 *
 * Awards BASE_DAILY_XP + BASE_DAILY_CREDITS every day, plus milestone bonuses
 * when the new streak exactly hits a milestone day count.
 *
 * @param userId — the authenticated player
 */
export async function claimDailyCheckIn(userId: string): Promise<DailyCheckInResult> {
  const today = todayUTCDate();
  const yesterday = yesterdayUTCDate();

  // Read current row (or use defaults for first-ever check-in)
  const existing = await getLoginStreak(userId);

  // Idempotency — already claimed today
  if (existing.lastClaimedDate === today) {
    return {
      alreadyClaimed: true,
      newStreak: existing.currentStreak,
      xpAwarded: 0,
      creditsAwarded: 0,
    };
  }

  // Determine new streak value
  const isConsecutive = existing.lastClaimedDate === yesterday;
  const newStreak = isConsecutive ? existing.currentStreak + 1 : 1;
  const newLongest = Math.max(existing.longestStreak, newStreak);
  const newTotal = existing.totalClaimed + 1;

  // Check for milestone bonus
  const milestone = getMilestoneForStreak(newStreak);
  const xpAwarded = BASE_DAILY_XP + (milestone?.xpBonus ?? 0);
  const creditsAwarded = BASE_DAILY_CREDITS + (milestone?.creditsBonus ?? 0);

  // Upsert the streak row
  await db
    .insert(userLoginStreak)
    .values({
      userId,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastClaimedDate: today,
      totalClaimed: newTotal,
      streakFreezeCount: existing.streakFreezeCount,
      lastFreezeGrantDate: existing.lastFreezeGrantDate,
    })
    .onConflictDoUpdate({
      target: userLoginStreak.userId,
      set: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastClaimedDate: today,
        totalClaimed: newTotal,
      },
    });

  // Award XP and credits in parallel
  const label = milestone
    ? `Daily check-in (Day ${newStreak} — ${milestone.label})`
    : `Daily check-in (Day ${newStreak})`;

  await Promise.all([
    awardXP(userId, xpAwarded, "daily_checkin"),
    grantCredits(userId, creditsAwarded, "daily_checkin", label),
  ]);

  return {
    alreadyClaimed: false,
    newStreak,
    xpAwarded,
    creditsAwarded,
    ...(milestone ? { milestoneHit: milestone } : {}),
  };
}
