/**
 * Practice match history — sparring-only matchStats rows enriched with
 * the opponent profile name from gameSession.metadata.
 */

import { db } from "../../data/db";
import { matchStats, gameSession } from "../../data/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export type PracticeMatchRow = {
  uuid: string;
  result: "win" | "loss" | "draw";
  turns: number;
  enemyKOs: number;
  ownKOs: number;
  winCondition: string | null;
  /** Profile name from metadata, e.g. "Aggro Rusher". Null for old-style random-AI match. */
  opponentProfileName: string | null;
  completedAt: Date;
};

export type PracticeHistorySummary = {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0–100
  totalKOs: number;
};

export async function getPracticeHistory(
  userId: string,
  limit = 50,
): Promise<{ rows: PracticeMatchRow[]; summary: PracticeHistorySummary }> {
  const stats = await db
    .select({
      gameSessionUuid: matchStats.gameSessionUuid,
      result: matchStats.result,
      turns: matchStats.turns,
      enemyKOs: matchStats.enemyKOs,
      ownKOs: matchStats.ownKOs,
      winCondition: matchStats.winCondition,
      completedAt: matchStats.completedAt,
    })
    .from(matchStats)
    .where(and(eq(matchStats.userId, userId), eq(matchStats.isSparring, true)))
    .orderBy(desc(matchStats.completedAt))
    .limit(limit);

  if (stats.length === 0) {
    return {
      rows: [],
      summary: { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0, totalKOs: 0 },
    };
  }

  const uuids = stats.map((s) => s.gameSessionUuid);

  // Pull metadata for each session to extract aiProfileName
  const sessions = await db
    .select({ uuid: gameSession.uuid, metadata: gameSession.metadata })
    .from(gameSession)
    .where(inArray(gameSession.uuid, uuids));

  const metaByUuid = new Map(
    sessions.map((s) => {
      const meta = s.metadata as Record<string, unknown> | null;
      const profileName = (meta?.aiProfileName as string | undefined) ?? null;
      return [s.uuid, profileName];
    }),
  );

  const rows: PracticeMatchRow[] = stats.map((s) => ({
    uuid: s.gameSessionUuid,
    result: s.result as "win" | "loss" | "draw",
    turns: s.turns,
    enemyKOs: s.enemyKOs,
    ownKOs: s.ownKOs,
    winCondition: s.winCondition,
    opponentProfileName: metaByUuid.get(s.gameSessionUuid) ?? null,
    completedAt: s.completedAt,
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
