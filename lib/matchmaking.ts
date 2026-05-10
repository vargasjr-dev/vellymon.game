import { db } from "../data/db";
import { userRank } from "../data/schema";
import { eq, and, between } from "drizzle-orm";
import { getActiveSeason } from "./seasons";
import { getUserRank, type Rank, RANKS, rankIndex } from "./ranked";
import { isSubscriber } from "./subscription";

// ─── MMR Matchmaking ─────────────────────────────────────────────────────────

/** MMR range for matchmaking within rank bands */
const MMR_BAND_WIDTH = 200; // ±200 MMR

/** Expanded MMR range after waiting (wider search) */
const MMR_BAND_EXPANDED = 400; // ±400 MMR after timeout

/**
 * Find a suitable ranked opponent based on MMR.
 * Searches within ±200 MMR first, then expands to ±400 if no matches.
 * Returns null if no suitable opponent found.
 */
export async function findRankedOpponent(
  userId: string,
  seasonId: string,
): Promise<{ userId: string; mmr: number; rank: Rank } | null> {
  const playerRank = await getUserRank(userId, seasonId);

  // Search within normal band first
  let opponents = await db
    .select({
      userId: userRank.userId,
      mmr: userRank.mmr,
      rank: userRank.rank,
    })
    .from(userRank)
    .where(
      and(
        eq(userRank.seasonId, seasonId),
        between(
          userRank.mmr,
          playerRank.mmr - MMR_BAND_WIDTH,
          playerRank.mmr + MMR_BAND_WIDTH,
        ),
      ),
    )
    .limit(10);

  // Filter out self
  opponents = opponents.filter((o) => o.userId !== userId);

  if (opponents.length === 0) {
    // Expand search
    opponents = await db
      .select({
        userId: userRank.userId,
        mmr: userRank.mmr,
        rank: userRank.rank,
      })
      .from(userRank)
      .where(
        and(
          eq(userRank.seasonId, seasonId),
          between(
            userRank.mmr,
            playerRank.mmr - MMR_BAND_EXPANDED,
            playerRank.mmr + MMR_BAND_EXPANDED,
          ),
        ),
      )
      .limit(10);

    opponents = opponents.filter((o) => o.userId !== userId);
  }

  if (opponents.length === 0) return null;

  // Pick closest MMR match
  opponents.sort(
    (a, b) =>
      Math.abs(a.mmr - playerRank.mmr) - Math.abs(b.mmr - playerRank.mmr),
  );

  const best = opponents[0];
  return {
    userId: best.userId,
    mmr: best.mmr,
    rank: best.rank as Rank,
  };
}

// ─── Rank Band Matching ──────────────────────────────────────────────────────

/** Check if two ranks are within acceptable matchmaking range (±1 rank) */
export function ranksAreCompatible(rank1: Rank, rank2: Rank): boolean {
  return Math.abs(rankIndex(rank1) - rankIndex(rank2)) <= 1;
}

// ─── Subscriber Reward Multiplier ────────────────────────────────────────────

/**
 * Get the reward multiplier for ranked milestone rewards.
 * Subscribers get 2x credit rewards at each milestone.
 */
export async function getRankedRewardMultiplier(
  userId: string,
): Promise<number> {
  const subscribed = await isSubscriber(userId);
  return subscribed ? 2 : 1;
}

// ─── Post-Match Processing ───────────────────────────────────────────────────

import { processRankedResult, getMilestone, type RankUpdateResult } from "./ranked";
import { awardXP, calculateMatchXP } from "./seasons";
import { grantCredits } from "./currency";

export type PostMatchResult = {
  xpAwarded: number;
  xpBreakdown: { source: string; amount: number }[];
  rankUpdate: RankUpdateResult | null;
  milestoneReached?: {
    rank: Rank;
    credits: number;
    rewardDescription: string;
  };
};

/**
 * Process all post-match rewards for a player.
 * Handles XP, ranked progression, and milestone rewards.
 */
export async function processPostMatch(opts: {
  userId: string;
  won: boolean;
  isRanked: boolean;
  isFirstWinToday: boolean;
}): Promise<PostMatchResult> {
  const activeSeason = await getActiveSeason();
  const result: PostMatchResult = {
    xpAwarded: 0,
    xpBreakdown: [],
    rankUpdate: null,
  };

  // 1. Award XP
  const xpCalc = calculateMatchXP({
    won: opts.won,
    isRanked: opts.isRanked,
    isFirstWinToday: opts.isFirstWinToday,
  });

  if (activeSeason) {
    const xpResult = await awardXP(opts.userId, xpCalc.total, opts.won ? "match_win" : "match_loss");
    if (xpResult) {
      result.xpAwarded = xpResult.xpAwarded;
    }
  }
  result.xpBreakdown = xpCalc.breakdown;

  // 2. Ranked progression (only for ranked matches)
  if (opts.isRanked && activeSeason) {
    const rankUpdate = await processRankedResult(
      opts.userId,
      activeSeason.id,
      opts.won,
    );
    result.rankUpdate = rankUpdate;

    // 3. Check for milestone rewards on rank-up
    if (rankUpdate.rankedUp) {
      const milestone = getMilestone(rankUpdate.newRank);
      if (milestone) {
        const multiplier = await getRankedRewardMultiplier(opts.userId);
        const credits = milestone.rewards.credits * multiplier;

        await grantCredits(opts.userId, credits, "monthly_grant");

        result.milestoneReached = {
          rank: rankUpdate.newRank,
          credits,
          rewardDescription: milestone.rewards.description,
        };
      }
    }
  }

  return result;
}
