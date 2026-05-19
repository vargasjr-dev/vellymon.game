import { db } from "../../data/db";
import { userAchievement } from "../../data/schema";
import { eq } from "drizzle-orm";
import { ACHIEVEMENTS, TOTAL_ACHIEVEMENT_POINTS, type Achievement } from "../../lib/achievements";

export type AchievementWithStatus = Achievement & {
  unlocked: boolean;
  unlockedAt: Date | null;
};

export type UserAchievementSummary = {
  achievements: AchievementWithStatus[];
  unlockedCount: number;
  totalCount: number;
  earnedPoints: number;
  totalPoints: number;
};

const getUserAchievements = async (
  userId: string,
): Promise<UserAchievementSummary> => {
  const rows = await db
    .select()
    .from(userAchievement)
    .where(eq(userAchievement.userId, userId));

  const unlockedMap = new Map(
    rows.map((r) => [r.achievementId, r.unlockedAt]),
  );

  const achievements: AchievementWithStatus[] = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }));

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const earnedPoints = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  return {
    achievements,
    unlockedCount,
    totalCount: ACHIEVEMENTS.length,
    earnedPoints,
    totalPoints: TOTAL_ACHIEVEMENT_POINTS,
  };
};

export default getUserAchievements;
