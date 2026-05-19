/**
 * matchProgression — awards XP, currency, and rank updates when a match ends.
 *
 * Called fire-and-forget from gameEngine.server.ts alongside writeMatchStats.
 * All writes are idempotent-safe: currency uses upserts, rank uses onConflictDoUpdate,
 * and XP awards are keyed to the active season (not the match UUID) so duplicate
 * calls simply re-award — callers should guard with the same idempotency strategy
 * used for matchStats (onConflictDoNothing on the stats row ensures this is only
 * called once per completed match in practice).
 *
 * ─── Awards ──────────────────────────────────────────────────────────────────
 *
 * Season XP (both players, requires active season):
 *   Win   : 100 XP  (× 1.5 for ranked / PvP)
 *   Loss  : 50 XP   (× 1.5 for ranked / PvP)
 *   First win of the day: +50 XP bonus
 *
 * Currency:
 *   Participation: 10 credits (every match)
 *   Win bonus    : 25 credits
 *   Sparring cap : capped at participation-only (no win bonus for AI matches)
 *
 * Rank (PvP only — skipped for sparring):
 *   gamesPlayed++, wins++ or losses++
 *   MMR: simple ±K update (K=32 for wins, K=16 for losses)
 *
 * ─── Currency transaction types ──────────────────────────────────────────────
 *   "purchase" type reused as "match_reward" — the TransactionType union only
 *   allows the fixed set; use "purchase" as the closest semantic fit for now
 *   until a dedicated "match_reward" type is added to the schema.
 */

import { db } from "../data/db";
import { userRank, gamePlayer, matchStats } from "../data/schema";
import { eq, and, sql, gte, lt } from "drizzle-orm";
import { awardXP, calculateMatchXP, getActiveSeason } from "./seasons";
import { grantCredits } from "./currency";
import { checkAndAwardAchievements } from "./achievementService";
import { updateQuestProgressOnMatch } from "./questService";
import type { GameState, TeamState } from "../server/types";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Credits awarded for completing any match */
const CREDITS_PARTICIPATION = 10;
/** Additional credits for winning a match */
const CREDITS_WIN_BONUS = 25;
/** MMR change per result (K-factor) */
const MMR_WIN_DELTA = 32;
const MMR_LOSS_DELTA = 16;

// ─── Rank helpers ─────────────────────────────────────────────────────────────

/**
 * Tiers: bronze(0) → silver(3★) → gold(6★) → platinum(9★) → diamond(12★) → legend(15★)
 * Each tier has 3 stars. Promotion at 3 stars, demotion protection at 0.
 */
const RANK_TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "legend"] as const;
type RankTier = (typeof RANK_TIERS)[number];

function tierIndex(rank: string): number {
  const idx = RANK_TIERS.indexOf(rank as RankTier);
  return idx >= 0 ? idx : 0;
}

function calculateNewStars(
  currentRank: string,
  currentStars: number,
  won: boolean,
): { rank: string; stars: number } {
  const ti = tierIndex(currentRank);

  if (won) {
    const newStars = currentStars + 1;
    if (newStars >= 3 && ti < RANK_TIERS.length - 1) {
      // Promote — wrap stars to 0 at next tier
      return { rank: RANK_TIERS[ti + 1], stars: 0 };
    }
    return { rank: currentRank, stars: Math.min(newStars, 3) };
  } else {
    const newStars = currentStars - 1;
    if (newStars < 0 && ti > 0) {
      // Demote — land at 2 stars in previous tier (demotion protection at bronze 0)
      return { rank: RANK_TIERS[ti - 1], stars: 2 };
    }
    return { rank: currentRank, stars: Math.max(newStars, 0) };
  }
}

// ─── First-win detection ──────────────────────────────────────────────────────

/**
 * Returns true if the user has no prior WIN in matchStats today (UTC day).
 * "Today" is midnight-to-midnight UTC — simple, consistent across timezones.
 * The current in-flight match has not been written yet when this is called,
 * so any existing win row for today means this is NOT the first win.
 */
async function checkIsFirstWinToday(userId: string): Promise<boolean> {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);

  const [existing] = await db
    .select({ uuid: matchStats.uuid })
    .from(matchStats)
    .where(
      and(
        eq(matchStats.userId, userId),
        eq(matchStats.result, "win"),
        gte(matchStats.completedAt, todayStart),
        lt(matchStats.completedAt, tomorrowStart),
      ),
    )
    .limit(1);

  return !existing; // No prior win today → this is the first
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Award progression to all human players in a completed match.
 * Skips AI bot players (userId === "ai-bot").
 *
 * @param matchUuid   — completed game session UUID
 * @param gameState   — final game state (must have result set)
 * @param isSparring  — true for AI practice matches
 * @param aiDifficulty — AI difficulty string if sparring
 */
export async function awardMatchProgression(
  matchUuid: string,
  gameState: GameState,
  isSparring: boolean,
): Promise<void> {
  const result = gameState.result;
  if (!result) return;

  // Collect human player records
  const players = await db
    .select({ userId: gamePlayer.userId })
    .from(gamePlayer)
    .where(eq(gamePlayer.gameSessionUuid, matchUuid));

  const humanPlayers = players.filter((p) => p.userId !== "ai-bot");
  if (humanPlayers.length === 0) return;

  const activeSeason = await getActiveSeason();

  await Promise.all(
    humanPlayers.map(async (p) => {
      const teamIndex = gameState.teams.findIndex((t) => t.userId === p.userId);
      if (teamIndex === -1) return;

      const myTeam = gameState.teams[teamIndex] as TeamState;
      const won = result.winner === myTeam.id;

      // ── 1. Season XP ───────────────────────────────────────────────────────
      if (activeSeason) {
        // Only check first-win for actual wins (spares a DB query on losses)
        const isFirstWinToday = won
          ? await checkIsFirstWinToday(p.userId)
          : false;

        const { total } = calculateMatchXP({
          won,
          isRanked: !isSparring,
          isFirstWinToday,
        });
        await awardXP(p.userId, total, won ? "match_win" : "match_loss").catch(
          (e) => console.error("[progression] XP award failed:", e),
        );
      }

      // ── 2. Currency reward ─────────────────────────────────────────────────
      const credits =
        CREDITS_PARTICIPATION + (won && !isSparring ? CREDITS_WIN_BONUS : 0);
      const creditDesc = isSparring
        ? "Sparring match participation"
        : won
          ? "Match win reward"
          : "Match participation reward";

      await grantCredits(p.userId, credits, "purchase", creditDesc).catch(
        (e) => console.error("[progression] currency grant failed:", e),
      );

      // ── 3. Rank update (PvP only) ──────────────────────────────────────────
      if (!isSparring && activeSeason) {
        await upsertRank(p.userId, activeSeason.id, won);
      }
    }),
  );
}

// ─── Rank upsert ─────────────────────────────────────────────────────────────

async function upsertRank(
  userId: string,
  seasonId: string,
  won: boolean,
): Promise<void> {
  // Check if rank record exists
  const [existing] = await db
    .select()
    .from(userRank)
    .where(and(eq(userRank.userId, userId), eq(userRank.seasonId, seasonId)))
    .limit(1);

  if (!existing) {
    // Create initial rank record
    const { rank, stars } = calculateNewStars("bronze", 0, won);
    const mmr = 1000 + (won ? MMR_WIN_DELTA : -MMR_LOSS_DELTA);
    await db.insert(userRank).values({
      userId,
      seasonId,
      rank,
      stars,
      peakRank: rank,
      peakStars: stars,
      gamesPlayed: 1,
      wins: won ? 1 : 0,
      losses: won ? 0 : 1,
      mmr: Math.max(0, mmr),
    });
    return;
  }

  const { rank: newRank, stars: newStars } = calculateNewStars(
    existing.rank,
    existing.stars,
    won,
  );

  // Update peak if improved
  const existingPeakTi = tierIndex(existing.peakRank);
  const newTi = tierIndex(newRank);
  const isPeak =
    newTi > existingPeakTi ||
    (newTi === existingPeakTi && newStars > (existing.peakStars ?? 0));

  await db
    .update(userRank)
    .set({
      rank: newRank,
      stars: newStars,
      peakRank: isPeak ? newRank : existing.peakRank,
      peakStars: isPeak ? newStars : existing.peakStars,
      gamesPlayed: sql`${userRank.gamesPlayed} + 1`,
      wins: won ? sql`${userRank.wins} + 1` : userRank.wins,
      losses: won ? userRank.losses : sql`${userRank.losses} + 1`,
      mmr: sql`GREATEST(0, ${userRank.mmr} + ${won ? MMR_WIN_DELTA : -MMR_LOSS_DELTA})`,
    })
    .where(and(eq(userRank.userId, userId), eq(userRank.seasonId, seasonId)));
}

// ─── Achievement hook ─────────────────────────────────────────────────────────

/**
 * Check and award achievements for all human players in a completed match.
 *
 * MUST be called after writeMatchStats has committed — achievement checks
 * query the matchStats table for total counts and single-match details.
 *
 * @param matchUuid       — completed game session UUID
 * @param humanPlayerIds  — userId list (AI bots excluded by caller)
 */
export async function checkAndAwardMatchAchievements(
  matchUuid: string,
  humanPlayerIds: string[],
): Promise<void> {
  await Promise.all(
    humanPlayerIds.map((userId) =>
      checkAndAwardAchievements({ userId, latestMatchUuid: matchUuid }).catch(
        (e) => console.error("[achievements] check failed for userId:", userId, e),
      ),
    ),
  );
}

/**
 * Update daily quest progress for all human players in a completed match.
 *
 * MUST be called after writeMatchStats has committed — quest checks query matchStats.
 *
 * @param matchUuid       — completed game session UUID
 * @param humanPlayerIds  — userId list (AI bots excluded by caller)
 */
export async function updateMatchQuestProgress(
  matchUuid: string,
  humanPlayerIds: string[],
): Promise<void> {
  await Promise.all(
    humanPlayerIds.map((userId) =>
      updateQuestProgressOnMatch(userId, matchUuid).catch(
        (e) => console.error("[quests] progress update failed for userId:", userId, e),
      ),
    ),
  );
}
