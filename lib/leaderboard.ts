/**
 * Season Leaderboard service — XP-ranked player standings for the active season.
 *
 * All queries are scoped to a single season. No schema changes needed —
 * data comes from `userSeasonProgress` (xp, tier) joined with `user` (name/username).
 */

import { db } from "../data/db";
import { userSeasonProgress, user } from "../data/schema";
import { eq, desc, gt, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  /** 1-indexed position */
  rank: number;
  userId: string;
  /** username slug if set, otherwise display name */
  displayName: string;
  xp: number;
  tier: number;
};

export type LeaderboardWithContext = {
  /** Top-N entries (sorted by XP desc) */
  entries: LeaderboardEntry[];
  /** The requesting player's entry, or null if they have no progress */
  playerEntry: LeaderboardEntry | null;
  /** Total number of players on the leaderboard for this season */
  totalPlayers: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve the display label: prefer vanity slug, fall back to display name. */
function displayName(row: { username: string | null; name: string }): string {
  return row.username ?? row.name;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the top `limit` players for a season, ranked by XP descending.
 * Ties are resolved by the database ordering (stable but arbitrary for equal XP).
 *
 * @param seasonId  — active season UUID
 * @param limit     — max entries to return (default: 50)
 */
export async function getSeasonLeaderboard(
  seasonId: string,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select({
      userId: userSeasonProgress.userId,
      xp: userSeasonProgress.xp,
      tier: userSeasonProgress.currentTier,
      name: user.name,
      username: user.username,
    })
    .from(userSeasonProgress)
    .innerJoin(user, eq(userSeasonProgress.userId, user.id))
    .where(eq(userSeasonProgress.seasonId, seasonId))
    .orderBy(desc(userSeasonProgress.xp))
    .limit(limit);

  return rows.map((row, i) => ({
    rank: i + 1,
    userId: row.userId,
    displayName: displayName(row),
    xp: row.xp,
    tier: row.tier,
  }));
}

/**
 * Returns the player's rank (1-indexed) for the given season.
 * Rank = number of players with MORE XP than this player + 1.
 * Returns 0 if the player has no progress row for the season.
 *
 * @param userId    — the player to rank
 * @param seasonId  — active season UUID
 */
export async function getPlayerRank(
  userId: string,
  seasonId: string,
): Promise<number> {
  // Get the player's XP
  const [progress] = await db
    .select({ xp: userSeasonProgress.xp })
    .from(userSeasonProgress)
    .where(
      eq(userSeasonProgress.userId, userId),
    )
    .limit(1);

  if (!progress) return 0;

  // Count players ahead (strictly more XP)
  const [{ ahead }] = await db
    .select({ ahead: sql<number>`count(*)::int` })
    .from(userSeasonProgress)
    .where(
      sql`${userSeasonProgress.seasonId} = ${seasonId} AND ${userSeasonProgress.xp} > ${progress.xp}`,
    );

  return ahead + 1;
}

/**
 * Single-call convenience: returns top-N leaderboard entries PLUS the
 * requesting player's entry and total player count. Ideal for the hub widget
 * and the full leaderboard page.
 *
 * If the player is already in the top-N, `playerEntry` will be one of the
 * `entries` items (same object). If they're outside the top-N, `playerEntry`
 * is fetched separately and appended for display below the fold.
 *
 * @param userId    — the requesting player
 * @param seasonId  — active season UUID
 * @param limit     — top-N size (default: 50)
 */
export async function getLeaderboardWithPlayerContext(
  userId: string,
  seasonId: string,
  limit = 50,
): Promise<LeaderboardWithContext> {
  // 1. Top-N entries
  const entries = await getSeasonLeaderboard(seasonId, limit);

  // 2. Total players on the board
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(userSeasonProgress)
    .where(eq(userSeasonProgress.seasonId, seasonId));

  // 3. Check if player is already in the top-N list
  const inTopN = entries.find((e) => e.userId === userId) ?? null;
  if (inTopN) {
    return { entries, playerEntry: inTopN, totalPlayers: total };
  }

  // 4. Player is outside top-N — fetch their entry separately
  const [playerRow] = await db
    .select({
      userId: userSeasonProgress.userId,
      xp: userSeasonProgress.xp,
      tier: userSeasonProgress.currentTier,
      name: user.name,
      username: user.username,
    })
    .from(userSeasonProgress)
    .innerJoin(user, eq(userSeasonProgress.userId, user.id))
    .where(
      sql`${userSeasonProgress.seasonId} = ${seasonId} AND ${userSeasonProgress.userId} = ${userId}`,
    )
    .limit(1);

  if (!playerRow) {
    return { entries, playerEntry: null, totalPlayers: total };
  }

  const playerRank = await getPlayerRank(userId, seasonId);
  const playerEntry: LeaderboardEntry = {
    rank: playerRank,
    userId: playerRow.userId,
    displayName: displayName(playerRow),
    xp: playerRow.xp,
    tier: playerRow.tier,
  };

  return { entries, playerEntry, totalPlayers: total };
}
