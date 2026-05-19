import { db } from "../../data/db";
import { userLoginStreak } from "../../data/schema";
import { eq } from "drizzle-orm";
import { todayUTCDate, yesterdayUTCDate } from "../../lib/loginStreak";

/**
 * Returns the player's current login streak count for display in GameNav.
 *
 * Returns 0 if:
 *  - No streak row exists yet (player has never checked in)
 *  - The last check-in was before yesterday (streak broken / never started)
 *
 * Only shows today's or yesterday's streak — stale counts are hidden rather
 * than displaying a misleading number from weeks ago.
 *
 * @param userId — the authenticated player
 */
export async function getStreakCount(userId: string): Promise<number> {
  const [row] = await db
    .select({
      currentStreak: userLoginStreak.currentStreak,
      lastClaimedDate: userLoginStreak.lastClaimedDate,
    })
    .from(userLoginStreak)
    .where(eq(userLoginStreak.userId, userId))
    .limit(1);

  if (!row || !row.lastClaimedDate) return 0;

  // Only show streak if claimed today or yesterday (still active)
  const today = todayUTCDate();
  const yesterday = yesterdayUTCDate();
  if (row.lastClaimedDate !== today && row.lastClaimedDate !== yesterday) return 0;

  return row.currentStreak;
}
