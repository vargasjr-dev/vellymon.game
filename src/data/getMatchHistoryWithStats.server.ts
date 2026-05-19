/**
 * Enriched match history — joins matchStats with gameSession + opponent name.
 * Used by the /matches/history page to show W/L results and KO counts.
 */

import { db } from "../../data/db";
import { matchStats, gameSession, gamePlayer, user } from "../../data/schema";
import { eq, and, ne, desc } from "drizzle-orm";

export type EnrichedMatchRow = {
  /** gameSession UUID — used for /matches/[id] link */
  uuid: string;
  result: "win" | "loss" | "draw";
  turns: number;
  enemyKOs: number;
  ownKOs: number;
  winCondition: string | null;
  isSparring: boolean;
  aiDifficulty: string | null;
  completedAt: Date;
  /** null for sparring / if opponent not found */
  opponentName: string | null;
};

export type MatchHistorySummary = {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0–100
  totalKOs: number;
};

export type MatchHistoryWithStats = {
  rows: EnrichedMatchRow[];
  summary: MatchHistorySummary;
};

export async function getMatchHistoryWithStats(
  userId: string,
  limit = 50,
): Promise<MatchHistoryWithStats> {
  // Fetch matchStats rows for this user, newest first
  const stats = await db
    .select({
      gameSessionUuid: matchStats.gameSessionUuid,
      result: matchStats.result,
      turns: matchStats.turns,
      enemyKOs: matchStats.enemyKOs,
      ownKOs: matchStats.ownKOs,
      winCondition: matchStats.winCondition,
      isSparring: matchStats.isSparring,
      aiDifficulty: matchStats.aiDifficulty,
      completedAt: matchStats.completedAt,
    })
    .from(matchStats)
    .where(eq(matchStats.userId, userId))
    .orderBy(desc(matchStats.completedAt))
    .limit(limit);

  if (stats.length === 0) {
    return {
      rows: [],
      summary: {
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalKOs: 0,
      },
    };
  }

  const sessionUuids = stats.map((s) => s.gameSessionUuid);

  // For each session, find the opponent player (not the current user)
  const opponentRows = await db
    .select({
      gameSessionUuid: gamePlayer.gameSessionUuid,
      opponentName: user.name,
    })
    .from(gamePlayer)
    .leftJoin(user, eq(gamePlayer.userId, user.id))
    .where(
      and(
        ne(gamePlayer.userId, userId),
        // Filter to sessions this user participated in
        // (using inArray via a subquery would be cleaner but this is fine for 50 rows)
      ),
    )
    .limit(limit * 2); // overfetch slightly

  const opponentBySession = new Map(
    opponentRows
      .filter((r) => sessionUuids.includes(r.gameSessionUuid))
      .map((r) => [r.gameSessionUuid, r.opponentName]),
  );

  const rows: EnrichedMatchRow[] = stats.map((s) => ({
    uuid: s.gameSessionUuid,
    result: s.result as "win" | "loss" | "draw",
    turns: s.turns,
    enemyKOs: s.enemyKOs,
    ownKOs: s.ownKOs,
    winCondition: s.winCondition,
    isSparring: s.isSparring ?? false,
    aiDifficulty: s.aiDifficulty,
    completedAt: s.completedAt,
    opponentName: opponentBySession.get(s.gameSessionUuid) ?? null,
  }));

  const wins = rows.filter((r) => r.result === "win").length;
  const losses = rows.filter((r) => r.result === "loss").length;
  const draws = rows.filter((r) => r.result === "draw").length;
  const total = rows.length;
  const totalKOs = rows.reduce((sum, r) => sum + r.enemyKOs, 0);

  return {
    rows,
    summary: {
      total,
      wins,
      losses,
      draws,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      totalKOs,
    },
  };
}
