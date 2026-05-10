import { db } from "../data/db";
import { userRank, cosmetic } from "../data/schema";
import { eq, and } from "drizzle-orm";
import { grantCredits } from "./currency";
import { type Rank, RANKS, rankIndex, RANK_MILESTONES, getMilestone } from "./ranked";
import { isSubscriber } from "./subscription";

// ─── Milestone Tracking ──────────────────────────────────────────────────────

export type MilestoneStatus = {
  rank: Rank;
  reached: boolean;
  rewards: {
    type: string;
    description: string;
    credits: number;
  };
};

/**
 * Get milestone status for all ranks for a given user in a season.
 * Shows which milestones the player has achieved based on peak rank.
 */
export async function getMilestoneStatus(
  userId: string,
  seasonId: string,
): Promise<MilestoneStatus[]> {
  const [rankData] = await db
    .select()
    .from(userRank)
    .where(
      and(eq(userRank.userId, userId), eq(userRank.seasonId, seasonId)),
    )
    .limit(1);

  const peakRankIdx = rankData
    ? rankIndex(rankData.peakRank as Rank)
    : -1;

  return RANK_MILESTONES.map((m) => ({
    rank: m.rank,
    reached: rankIndex(m.rank) <= peakRankIdx,
    rewards: m.rewards,
  }));
}

// ─── End-of-Season Rewards ───────────────────────────────────────────────────

export type EndOfSeasonReward = {
  rank: Rank;
  credits: number;
  cosmetic: string;
};

/** End-of-season credit rewards based on peak rank */
const END_OF_SEASON_CREDITS: Record<Rank, number> = {
  bronze: 25,
  silver: 75,
  gold: 150,
  platinum: 250,
  diamond: 400,
  legend: 750,
};

/** End-of-season cosmetic descriptions based on peak rank */
const END_OF_SEASON_COSMETICS: Record<Rank, string> = {
  bronze: "Bronze Season Badge",
  silver: "Silver Season Badge",
  gold: "Gold Season Border",
  platinum: "Platinum Season Border",
  diamond: "Diamond Season Animated Border",
  legend: "Legend Season Trophy + Animated Border",
};

/**
 * Calculate end-of-season rewards for a user based on their peak rank.
 * Returns null if the user has no rank data for the season.
 */
export async function calculateEndOfSeasonRewards(
  userId: string,
  seasonId: string,
): Promise<EndOfSeasonReward | null> {
  const [rankData] = await db
    .select()
    .from(userRank)
    .where(
      and(eq(userRank.userId, userId), eq(userRank.seasonId, seasonId)),
    )
    .limit(1);

  if (!rankData || rankData.gamesPlayed === 0) return null;

  const peakRank = rankData.peakRank as Rank;

  return {
    rank: peakRank,
    credits: END_OF_SEASON_CREDITS[peakRank],
    cosmetic: END_OF_SEASON_COSMETICS[peakRank],
  };
}

/**
 * Distribute end-of-season rewards for a user.
 * Grants credits (2x for subscribers) and creates a cosmetic record.
 */
export async function distributeEndOfSeasonRewards(
  userId: string,
  seasonId: string,
): Promise<EndOfSeasonReward | null> {
  const reward = await calculateEndOfSeasonRewards(userId, seasonId);
  if (!reward) return null;

  // Subscriber gets 2x credits
  const subscribed = await isSubscriber(userId);
  const creditAmount = subscribed ? reward.credits * 2 : reward.credits;

  // Grant credits
  await grantCredits(userId, creditAmount, "monthly_grant");

  // Create cosmetic record for the season badge/border
  await db.insert(cosmetic).values({
    userId,
    type: "profile_border",
    name: reward.cosmetic,
    source: "ranked_reward",
    seasonId,
    metadata: {
      peakRank: reward.rank,
      endOfSeason: true,
    },
  });

  return { ...reward, credits: creditAmount };
}

/**
 * Distribute end-of-season rewards for ALL ranked players in a season.
 * Typically called by an admin action when archiving a season.
 */
export async function distributeAllEndOfSeasonRewards(
  seasonId: string,
): Promise<number> {
  const allRanked = await db
    .select({ userId: userRank.userId })
    .from(userRank)
    .where(eq(userRank.seasonId, seasonId));

  let distributed = 0;
  for (const { userId } of allRanked) {
    const result = await distributeEndOfSeasonRewards(userId, seasonId);
    if (result) distributed++;
  }

  return distributed;
}

// ─── Rank Summary ────────────────────────────────────────────────────────────

export type RankSummary = {
  rank: Rank;
  stars: number;
  peakRank: Rank;
  peakStars: number;
  legendEntry: number | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  mmr: number;
  milestones: MilestoneStatus[];
};

/** Get full rank summary for a user in a season */
export async function getRankSummary(
  userId: string,
  seasonId: string,
): Promise<RankSummary | null> {
  const [rankData] = await db
    .select()
    .from(userRank)
    .where(
      and(eq(userRank.userId, userId), eq(userRank.seasonId, seasonId)),
    )
    .limit(1);

  if (!rankData) return null;

  const milestones = await getMilestoneStatus(userId, seasonId);

  return {
    rank: rankData.rank as Rank,
    stars: rankData.stars,
    peakRank: rankData.peakRank as Rank,
    peakStars: rankData.peakStars,
    legendEntry: rankData.legendEntry,
    gamesPlayed: rankData.gamesPlayed,
    wins: rankData.wins,
    losses: rankData.losses,
    winRate:
      rankData.gamesPlayed > 0
        ? Math.round((rankData.wins / rankData.gamesPlayed) * 100)
        : 0,
    mmr: rankData.mmr,
    milestones,
  };
}
