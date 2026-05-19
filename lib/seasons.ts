import { db } from "../data/db";
import {
  season,
  seasonTrack,
  userSeasonProgress,
} from "../data/schema";
import { eq, and, lte, gte } from "drizzle-orm";

// ─── XP Configuration ────────────────────────────────────────────────────────

/** XP awarded per match outcome */
export const XP_REWARDS = {
  match_win: 100,
  match_loss: 50,
  daily_first_win_bonus: 50,
} as const;

/** Ranked match XP multiplier */
export const RANKED_MULTIPLIER = 1.5;

/** Total tiers per season */
export const MAX_TIER = 25;

/**
 * XP required to reach a given tier (scaling: tier 1 = 100 XP, tier 25 = 500 XP).
 * Formula: 100 + (tier - 1) * ~16.67, rounded to nearest 10.
 */
export function xpForTier(tier: number): number {
  if (tier < 1 || tier > MAX_TIER) return 0;
  const raw = 100 + (tier - 1) * (400 / (MAX_TIER - 1));
  return Math.round(raw / 10) * 10;
}

/** Cumulative XP needed to complete all tiers up to and including the given tier */
export function cumulativeXpForTier(tier: number): number {
  let total = 0;
  for (let t = 1; t <= tier; t++) {
    total += xpForTier(t);
  }
  return total;
}

// ─── Season Queries ──────────────────────────────────────────────────────────

/** Get the currently active season, if any */
export async function getActiveSeason() {
  const now = new Date();
  const [active] = await db
    .select()
    .from(season)
    .where(eq(season.status, "active"))
    .limit(1);
  return active ?? null;
}

/** Get a season by ID */
export async function getSeason(seasonId: string) {
  const [s] = await db
    .select()
    .from(season)
    .where(eq(season.id, seasonId))
    .limit(1);
  return s ?? null;
}

/** Get all track tiers for a season, ordered by tier number */
export async function getSeasonTrack(seasonId: string) {
  return db
    .select()
    .from(seasonTrack)
    .where(eq(seasonTrack.seasonId, seasonId))
    .orderBy(seasonTrack.tier);
}

// ─── User Progress ───────────────────────────────────────────────────────────

/** Get or create a user's progress for a given season */
export async function getUserProgress(userId: string, seasonId: string) {
  const [existing] = await db
    .select()
    .from(userSeasonProgress)
    .where(
      and(
        eq(userSeasonProgress.userId, userId),
        eq(userSeasonProgress.seasonId, seasonId),
      ),
    )
    .limit(1);

  if (existing) return existing;

  // Auto-create progress record on first access
  const [created] = await db
    .insert(userSeasonProgress)
    .values({
      userId,
      seasonId,
      xp: 0,
      currentTier: 0,
      claimedFreeTiers: [],
      claimedPremiumTiers: [],
    })
    .returning();

  return created;
}

// ─── XP System ───────────────────────────────────────────────────────────────

export type XpSource =
  | "match_win"
  | "match_loss"
  | "daily_first_win_bonus"
  | "ranked_bonus"
  | "daily_quest"
  | "admin_grant";

export type AwardXpResult = {
  xpAwarded: number;
  totalXp: number;
  previousTier: number;
  currentTier: number;
  tiersGained: number;
};

/**
 * Award XP to a user for the active season.
 * Automatically advances tier when XP thresholds are met.
 * Returns null if no active season exists.
 */
export async function awardXP(
  userId: string,
  amount: number,
  source: XpSource,
): Promise<AwardXpResult | null> {
  const activeSeason = await getActiveSeason();
  if (!activeSeason) return null;

  const progress = await getUserProgress(userId, activeSeason.id);
  const previousTier = progress.currentTier;

  const newXp = progress.xp + amount;

  // Calculate new tier based on cumulative XP
  let newTier = previousTier;
  while (newTier < MAX_TIER && newXp >= cumulativeXpForTier(newTier + 1)) {
    newTier++;
  }

  await db
    .update(userSeasonProgress)
    .set({
      xp: newXp,
      currentTier: newTier,
    })
    .where(eq(userSeasonProgress.id, progress.id));

  return {
    xpAwarded: amount,
    totalXp: newXp,
    previousTier,
    currentTier: newTier,
    tiersGained: newTier - previousTier,
  };
}

/**
 * Calculate XP to award for a match result.
 * Accounts for win/loss, daily first-win bonus, and ranked multiplier.
 */
export function calculateMatchXP(opts: {
  won: boolean;
  isRanked: boolean;
  isFirstWinToday: boolean;
}): { total: number; breakdown: { source: XpSource; amount: number }[] } {
  const breakdown: { source: XpSource; amount: number }[] = [];

  const baseSource: XpSource = opts.won ? "match_win" : "match_loss";
  let baseAmount = opts.won ? XP_REWARDS.match_win : XP_REWARDS.match_loss;

  if (opts.isRanked) {
    const rankedBonus = Math.round(baseAmount * (RANKED_MULTIPLIER - 1));
    breakdown.push({ source: baseSource, amount: baseAmount });
    breakdown.push({ source: "ranked_bonus", amount: rankedBonus });
    baseAmount += rankedBonus;
  } else {
    breakdown.push({ source: baseSource, amount: baseAmount });
  }

  if (opts.won && opts.isFirstWinToday) {
    breakdown.push({
      source: "daily_first_win_bonus",
      amount: XP_REWARDS.daily_first_win_bonus,
    });
    baseAmount += XP_REWARDS.daily_first_win_bonus;
  }

  return { total: baseAmount, breakdown };
}

// ─── Reward Claiming ─────────────────────────────────────────────────────────

export type ClaimResult =
  | { success: true; reward: unknown }
  | { success: false; error: string };

/** Claim a free track reward for a given tier */
export async function claimFreeReward(
  userId: string,
  seasonId: string,
  tier: number,
): Promise<ClaimResult> {
  const progress = await getUserProgress(userId, seasonId);

  if (progress.currentTier < tier) {
    return { success: false, error: `Haven't reached tier ${tier} yet` };
  }

  const claimed = (progress.claimedFreeTiers ?? []) as number[];
  if (claimed.includes(tier)) {
    return { success: false, error: `Tier ${tier} free reward already claimed` };
  }

  // Get the reward definition
  const [trackTier] = await db
    .select()
    .from(seasonTrack)
    .where(
      and(
        eq(seasonTrack.seasonId, seasonId),
        eq(seasonTrack.tier, tier),
      ),
    )
    .limit(1);

  if (!trackTier?.freeReward) {
    return { success: false, error: `No free reward at tier ${tier}` };
  }

  // Update claimed tiers
  const newClaimed = [...claimed, tier];
  await db
    .update(userSeasonProgress)
    .set({ claimedFreeTiers: newClaimed })
    .where(eq(userSeasonProgress.id, progress.id));

  return { success: true, reward: trackTier.freeReward };
}

/** Claim a premium track reward for a given tier */
export async function claimPremiumReward(
  userId: string,
  seasonId: string,
  tier: number,
): Promise<ClaimResult> {
  const progress = await getUserProgress(userId, seasonId);

  if (progress.currentTier < tier) {
    return { success: false, error: `Haven't reached tier ${tier} yet` };
  }

  const claimed = (progress.claimedPremiumTiers ?? []) as number[];
  if (claimed.includes(tier)) {
    return {
      success: false,
      error: `Tier ${tier} premium reward already claimed`,
    };
  }

  const [trackTier] = await db
    .select()
    .from(seasonTrack)
    .where(
      and(
        eq(seasonTrack.seasonId, seasonId),
        eq(seasonTrack.tier, tier),
      ),
    )
    .limit(1);

  if (!trackTier?.premiumReward) {
    return { success: false, error: `No premium reward at tier ${tier}` };
  }

  const newClaimed = [...claimed, tier];
  await db
    .update(userSeasonProgress)
    .set({ claimedPremiumTiers: newClaimed })
    .where(eq(userSeasonProgress.id, progress.id));

  return { success: true, reward: trackTier.premiumReward };
}

// ─── Progress Summary ────────────────────────────────────────────────────────

export type SeasonProgressSummary = {
  seasonId: string;
  seasonName: string;
  xp: number;
  currentTier: number;
  maxTier: number;
  xpForNextTier: number;
  xpInCurrentTier: number;
  progressPercent: number;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
  daysRemaining: number;
};

/** Get a full progress summary for the active season */
export async function getProgressSummary(
  userId: string,
): Promise<SeasonProgressSummary | null> {
  const activeSeason = await getActiveSeason();
  if (!activeSeason) return null;

  const progress = await getUserProgress(userId, activeSeason.id);
  const currentCumulative = cumulativeXpForTier(progress.currentTier);
  const nextCumulative =
    progress.currentTier < MAX_TIER
      ? cumulativeXpForTier(progress.currentTier + 1)
      : currentCumulative;

  const xpInCurrentTier = progress.xp - currentCumulative;
  const xpNeeded = nextCumulative - currentCumulative;
  const progressPercent =
    progress.currentTier >= MAX_TIER
      ? 100
      : xpNeeded > 0
        ? Math.min(100, Math.round((xpInCurrentTier / xpNeeded) * 100))
        : 100;

  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (activeSeason.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  return {
    seasonId: activeSeason.id,
    seasonName: activeSeason.name,
    xp: progress.xp,
    currentTier: progress.currentTier,
    maxTier: MAX_TIER,
    xpForNextTier: xpNeeded,
    xpInCurrentTier,
    progressPercent,
    claimedFreeTiers: (progress.claimedFreeTiers ?? []) as number[],
    claimedPremiumTiers: (progress.claimedPremiumTiers ?? []) as number[],
    daysRemaining,
  };
}
