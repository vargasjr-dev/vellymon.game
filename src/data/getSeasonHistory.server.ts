import { db } from "../../data/db";
import { season, userRank, userSeasonProgress } from "../../data/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Rank } from "../../lib/ranked";

export type SeasonHistoryEntry = {
  seasonId: string;
  seasonName: string;
  startDate: Date;
  endDate: Date;
  status: string;
  /** null if user didn't play this season */
  rank: Rank | null;
  peakRank: Rank | null;
  peakStars: number | null;
  wins: number | null;
  losses: number | null;
  gamesPlayed: number | null;
  /** XP earned this season */
  xpEarned: number | null;
  /** Tier reached on season track */
  trackTier: number | null;
};

const getSeasonHistory = async (
  userId: string,
): Promise<SeasonHistoryEntry[]> => {
  // All seasons ordered newest first
  const seasons = await db
    .select()
    .from(season)
    .orderBy(desc(season.startDate));

  if (seasons.length === 0) return [];

  // User rank rows for this user
  const rankRows = await db
    .select()
    .from(userRank)
    .where(eq(userRank.userId, userId));

  const rankBySeasonId = new Map(rankRows.map((r) => [r.seasonId, r]));

  // User season progress rows
  const progressRows = await db
    .select()
    .from(userSeasonProgress)
    .where(eq(userSeasonProgress.userId, userId));

  const progressBySeasonId = new Map(progressRows.map((p) => [p.seasonId, p]));

  return seasons.map((s) => {
    const rank = rankBySeasonId.get(s.id) ?? null;
    const progress = progressBySeasonId.get(s.id) ?? null;

    return {
      seasonId: s.id,
      seasonName: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      status: s.status,
      rank: (rank?.rank as Rank | null) ?? null,
      peakRank: (rank?.peakRank as Rank | null) ?? null,
      peakStars: rank?.peakStars ?? null,
      wins: rank?.wins ?? null,
      losses: rank?.losses ?? null,
      gamesPlayed: rank?.gamesPlayed ?? null,
      xpEarned: progress?.xp ?? null,
      trackTier: progress?.currentTier ?? null,
    };
  });
};

export default getSeasonHistory;
