import { db } from "../../data/db";
import { userAchievement } from "../../data/schema";
import { eq, gte, and } from "drizzle-orm";

/**
 * Count achievements unlocked in the past 24 hours for a user.
 * Used by the game layout to drive the notification dot on the Badges nav link.
 */
export async function getNewAchievementCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ achievementId: userAchievement.achievementId })
    .from(userAchievement)
    .where(
      and(
        eq(userAchievement.userId, userId),
        gte(userAchievement.unlockedAt, since),
      ),
    );

  return rows.length;
}
