import { db } from "../../data/db";
import { userQuestProgress } from "../../data/schema";
import { eq, and } from "drizzle-orm";
import { todayUTC } from "../../lib/questService";

/**
 * Returns the number of today's quests that are still incomplete.
 *
 * Used by the game layout to drive the quest notification badge on the nav
 * link. Returns 0 if no quests have been assigned yet (lazy-init happens on
 * first visit to /quests).
 *
 * @param userId — the authenticated player
 */
export async function getActiveQuestCount(userId: string): Promise<number> {
  const date = todayUTC();
  const rows = await db
    .select({ completed: userQuestProgress.completed })
    .from(userQuestProgress)
    .where(
      and(
        eq(userQuestProgress.userId, userId),
        eq(userQuestProgress.date, date),
      ),
    );

  if (rows.length === 0) return 0;
  return rows.filter((r) => !r.completed).length;
}
