/**
 * Achievement checking + awarding service.
 *
 * Call checkAndAwardAchievements() after any event that might unlock
 * an achievement (match completion, rank update, roster change, etc.).
 *
 * Returns the list of newly-unlocked achievements so callers can surface
 * them in the UI (e.g. VictoryModal toast).
 */

import { db } from "../data/db";
import { userAchievement, matchStats, vellymonInstance, user, userRank } from "../data/schema";
import { eq, count, and, sql } from "drizzle-orm";
import { ACHIEVEMENTS, type Achievement } from "./achievements";
import { getActiveSeason } from "./seasons";

/** Context passed to each achievement check */
type CheckContext = {
  userId: string;
  /** Filled when triggered by a completed match */
  latestMatchUuid?: string;
};

/** Returns newly unlocked Achievement objects (empty if none) */
export async function checkAndAwardAchievements(
  ctx: CheckContext,
): Promise<Achievement[]> {
  const { userId } = ctx;

  // Load what the user has already unlocked
  const existing = await db
    .select({ achievementId: userAchievement.achievementId })
    .from(userAchievement)
    .where(eq(userAchievement.userId, userId));
  const alreadyUnlocked = new Set(existing.map((r) => r.achievementId));

  // Gather stats needed for checking
  const [matchSummary] = await db
    .select({
      total: count(),
      wins: sql<number>`SUM(CASE WHEN ${matchStats.result} = 'win' THEN 1 ELSE 0 END)::int`,
      sparringTotal: sql<number>`SUM(CASE WHEN ${matchStats.isSparring} = true THEN 1 ELSE 0 END)::int`,
    })
    .from(matchStats)
    .where(eq(matchStats.userId, userId));

  const totalMatches = matchSummary?.total ?? 0;
  const totalWins = matchSummary?.wins ?? 0;
  const totalSparring = matchSummary?.sparringTotal ?? 0;

  // Latest match row (for single-match achievements)
  const [latestMatch] = ctx.latestMatchUuid
    ? await db
        .select()
        .from(matchStats)
        .where(
          and(
            eq(matchStats.userId, userId),
            eq(matchStats.gameSessionUuid, ctx.latestMatchUuid),
          ),
        )
        .limit(1)
    : [null];

  // Roster size
  const [rosterRow] = await db
    .select({ count: count() })
    .from(vellymonInstance)
    .where(eq(vellymonInstance.userId, userId));
  const rosterSize = rosterRow?.count ?? 0;

  // Username set
  const [userRow] = await db
    .select({ username: user.username, subscriptionStatus: user.subscriptionStatus })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  // Active season rank
  const activeSeason = await getActiveSeason();
  const [rankRow] = activeSeason
    ? await db
        .select()
        .from(userRank)
        .where(
          and(
            eq(userRank.userId, userId),
            eq(userRank.seasonId, activeSeason.id),
          ),
        )
        .limit(1)
    : [null];

  const RANK_ORDER: Record<string, number> = {
    bronze: 0,
    silver: 1,
    gold: 2,
    platinum: 3,
    diamond: 4,
    legend: 5,
  };
  const userRankLevel = RANK_ORDER[rankRow?.rank ?? "bronze"] ?? 0;
  const peakRankLevel = RANK_ORDER[rankRow?.peakRank ?? "bronze"] ?? 0;

  // Hard AI win check
  const hardAiWins = await db
    .select({ count: count() })
    .from(matchStats)
    .where(
      and(
        eq(matchStats.userId, userId),
        eq(matchStats.isSparring, true),
        eq(matchStats.result, "win"),
        eq(matchStats.aiDifficulty, "hard"),
      ),
    )
    .then((r) => r[0]?.count ?? 0);

  // ─── Evaluate each achievement ────────────────────────────────────────────

  const toBe: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !alreadyUnlocked.has(id)) toBe.push(id);
  };

  // Matches
  check("first_match", totalMatches >= 1);
  check("first_win", totalWins >= 1);
  check("win_5", totalWins >= 5);
  check("win_25", totalWins >= 25);
  check("win_100", totalWins >= 100);
  check(
    "ko_10",
    latestMatch != null &&
      latestMatch.result === "win" &&
      latestMatch.enemyKOs >= 10,
  );
  check(
    "perfect_match",
    latestMatch != null &&
      latestMatch.result === "win" &&
      latestMatch.ownKOs === 0,
  );

  // Ranked
  check("ranked_first", (rankRow?.gamesPlayed ?? 0) >= 1);
  check("rank_silver", peakRankLevel >= RANK_ORDER["silver"]);
  check("rank_gold", peakRankLevel >= RANK_ORDER["gold"]);
  check("rank_platinum", peakRankLevel >= RANK_ORDER["platinum"]);
  check("rank_diamond", peakRankLevel >= RANK_ORDER["diamond"]);
  check("rank_legend", peakRankLevel >= RANK_ORDER["legend"]);

  // Sparring
  check("sparring_first", totalSparring >= 1);
  check("sparring_10", totalSparring >= 10);
  check("sparring_hard_win", hardAiWins >= 1);

  // Collection
  check("roster_5", rosterSize >= 5);
  check("roster_20", rosterSize >= 20);
  check("roster_50", rosterSize >= 50);

  // Social
  check("username_set", !!userRow?.username);

  // Special
  check("subscriber", userRow?.subscriptionStatus === "active");

  if (toBe.length === 0) return [];

  // Award new achievements
  await db.insert(userAchievement).values(
    toBe.map((achievementId) => ({ userId, achievementId })),
  );

  return toBe
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter((a): a is Achievement => a != null);
}
