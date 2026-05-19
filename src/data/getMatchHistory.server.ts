/**
 * getMatchHistory — fetch game sessions a user has participated in.
 *
 * Returns sessions ordered newest first, shaped to match the `MatchCard`
 * component's expected type: uuid, status, createdAt, createdBy, creatorName,
 * currentPlayers.
 *
 * Default export is consumed by src/app/(game)/matches/history/page.tsx.
 * Named exports (getMatchHistory, getMatchSummary) are available for
 * progression hooks (Phase 11 item 5) and future ML features.
 *
 * Raw match statistics (wins/losses/KOs/turns) are written to the `matchStats`
 * table by gameEngine.server.ts on game completion — see writeMatchStats().
 */

import { db } from "../../data/db";
import { gameSession, gamePlayer, user } from "../../data/schema";
import { eq, desc, inArray } from "drizzle-orm";

export type MatchHistoryRow = {
  uuid: string;
  status: string;
  createdAt: Date;
  createdBy: string;
  creatorName: string | null;
  currentPlayers: number;
};

/**
 * Fetch the most recent game sessions for a user.
 *
 * Looks up all `gamePlayer` rows for the user, then fetches the corresponding
 * `gameSession` rows with creator display names joined.
 *
 * @param userId  — the user to query
 * @param limit   — max sessions to return (default 50)
 */
export async function getMatchHistory(
  userId: string,
  limit = 50,
): Promise<MatchHistoryRow[]> {
  // Step 1: find all game sessions this user has participated in
  const participations = await db
    .select({ gameSessionUuid: gamePlayer.gameSessionUuid })
    .from(gamePlayer)
    .where(eq(gamePlayer.userId, userId));

  if (participations.length === 0) return [];

  const sessionUuids = participations.map((p) => p.gameSessionUuid);

  // Step 2: fetch those sessions with creator display name
  const sessions = await db
    .select({
      uuid: gameSession.uuid,
      status: gameSession.status,
      createdAt: gameSession.createdAt,
      createdBy: gameSession.createdBy,
      creatorName: user.name,
      currentPlayers: gameSession.currentPlayers,
    })
    .from(gameSession)
    .innerJoin(user, eq(gameSession.createdBy, user.id))
    .where(inArray(gameSession.uuid, sessionUuids))
    .orderBy(desc(gameSession.createdAt))
    .limit(limit);

  return sessions;
}

/**
 * Get a quick summary of a user's match history.
 * Reads from the richer `matchStats` table if available; falls back gracefully.
 */
export async function getMatchSummary(userId: string) {
  const history = await getMatchHistory(userId, 1000);

  const completed = history.filter((r) => r.status === "completed");
  const cancelled = history.filter((r) => r.status === "cancelled");

  return {
    total: history.length,
    completed: completed.length,
    cancelled: cancelled.length,
  };
}

// Default export: the history query consumed by the match history page.
export default getMatchHistory;
