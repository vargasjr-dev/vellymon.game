/**
 * Practice history — two sources merged into one list:
 *
 *  1. matchStats (isSparring=true)         → matches the user *played* via Play tab
 *  2. matchSnapshot (triggeredByUserId)    → simulations the user *ran* via Watch tab
 *
 * Both are sorted newest-first after merging.
 */

import { db } from "../../data/db";
import { matchStats, gameSession, matchSnapshot, aiProfile } from "../../data/schema";
import { eq, and, inArray, isNotNull, desc } from "drizzle-orm";

// ─── Shared row type ──────────────────────────────────────────────────────────

type PlayedRow = {
  type: "played";
  uuid: string;
  result: "win" | "loss" | "draw";
  turns: number;
  enemyKOs: number;
  winCondition: string | null;
  /** Profile name from gameSession metadata. */
  opponentProfileName: string | null;
  completedAt: Date;
};

type SimulatedRow = {
  type: "simulated";
  uuid: string;
  /** Profile name for team 1. */
  p1Name: string | null;
  /** Profile name for team 2. */
  p2Name: string | null;
  /** 1 or 2 — whichever team won. null = draw/timeout. */
  winner: 1 | 2 | null;
  turns: number;
  completedAt: Date;
};

export type PracticeHistoryRow = PlayedRow | SimulatedRow;

export type PracticeHistorySummary = {
  /** Total played (not simulated) matches. */
  totalPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0–100
  totalKOs: number;
  /** Total simulations triggered. */
  totalSimulated: number;
};

// ─── Main query ───────────────────────────────────────────────────────────────

export async function getPracticeHistory(
  userId: string,
  limit = 50,
): Promise<{ rows: PracticeHistoryRow[]; summary: PracticeHistorySummary }> {
  // ── 1. Played matches (matchStats) ────────────────────────────────────────
  const statsRows = await db
    .select({
      gameSessionUuid: matchStats.gameSessionUuid,
      result: matchStats.result,
      turns: matchStats.turns,
      enemyKOs: matchStats.enemyKOs,
      winCondition: matchStats.winCondition,
      completedAt: matchStats.completedAt,
    })
    .from(matchStats)
    .where(and(eq(matchStats.userId, userId), eq(matchStats.isSparring, true)))
    .orderBy(desc(matchStats.completedAt))
    .limit(limit);

  // Pull opponent profile name from each gameSession's metadata.
  // Prefer the denormalized aiProfileName field; fall back to joining aiProfile
  // via aiProfileId (handles sessions created before the name was denormalized).
  const playedRows: PlayedRow[] = [];
  if (statsRows.length > 0) {
    const uuids = statsRows.map((s) => s.gameSessionUuid);
    const sessions = await db
      .select({ uuid: gameSession.uuid, metadata: gameSession.metadata })
      .from(gameSession)
      .where(inArray(gameSession.uuid, uuids));

    // Collect any aiProfileIds that need a name lookup
    type MetaShape = { aiProfileName?: string; aiProfileId?: string };
    const metaByUuid = new Map<string, MetaShape>(
      sessions.map((s) => [s.uuid, (s.metadata as MetaShape | null) ?? {}]),
    );

    // Collect profile IDs where the name wasn't denormalized into metadata
    const missingIds = [
      ...new Set(
        sessions
          .map((s) => s.metadata as MetaShape | null)
          .filter((m): m is MetaShape => !!m?.aiProfileId && !m.aiProfileName)
          .map((m) => m.aiProfileId as string),
      ),
    ];

    const profileNamesById = new Map<string, string>();
    if (missingIds.length > 0) {
      const profiles = await db
        .select({ id: aiProfile.id, name: aiProfile.name })
        .from(aiProfile)
        .where(inArray(aiProfile.id, missingIds));
      for (const p of profiles) profileNamesById.set(p.id, p.name);
    }

    for (const s of statsRows) {
      const meta = metaByUuid.get(s.gameSessionUuid);
      const profileName =
        meta?.aiProfileName ??
        (meta?.aiProfileId ? (profileNamesById.get(meta.aiProfileId) ?? null) : null);
      playedRows.push({
        type: "played",
        uuid: s.gameSessionUuid,
        result: s.result as "win" | "loss" | "draw",
        turns: s.turns,
        enemyKOs: s.enemyKOs,
        winCondition: s.winCondition,
        opponentProfileName: profileName,
        completedAt: s.completedAt,
      });
    }
  }

  // ── 2. Simulations the user ran (matchSnapshot) ───────────────────────────
  const snapRows = await db
    .select({
      id: matchSnapshot.id,
      p1ProfileId: matchSnapshot.p1ProfileId,
      p2ProfileId: matchSnapshot.p2ProfileId,
      gameState: matchSnapshot.gameState,
      uploadedAt: matchSnapshot.uploadedAt,
    })
    .from(matchSnapshot)
    .where(
      and(
        eq(matchSnapshot.triggeredByUserId, userId),
        isNotNull(matchSnapshot.p1ProfileId),
      ),
    )
    .orderBy(desc(matchSnapshot.uploadedAt))
    .limit(limit);

  // Collect all unique profile IDs to batch-fetch names
  const profileIds = [
    ...new Set(
      snapRows.flatMap((r) =>
        [r.p1ProfileId, r.p2ProfileId].filter((id): id is string => id !== null),
      ),
    ),
  ];

  const profileNameById = new Map<string, string>();
  if (profileIds.length > 0) {
    const profiles = await db
      .select({ id: aiProfile.id, name: aiProfile.name })
      .from(aiProfile)
      .where(inArray(aiProfile.id, profileIds));
    for (const p of profiles) profileNameById.set(p.id, p.name);
  }

  const simulatedRows: SimulatedRow[] = snapRows.map((r) => {
    const gs = r.gameState as { result?: { winner?: 1 | 2 }; turn?: number } | null;
    return {
      type: "simulated",
      uuid: r.id,
      p1Name: r.p1ProfileId ? (profileNameById.get(r.p1ProfileId) ?? r.p1ProfileId) : null,
      p2Name: r.p2ProfileId ? (profileNameById.get(r.p2ProfileId) ?? r.p2ProfileId) : null,
      winner: gs?.result?.winner ?? null,
      turns: gs?.turn ?? 0,
      completedAt: r.uploadedAt,
    };
  });

  // ── 3. Merge and sort newest-first ────────────────────────────────────────
  const rows: PracticeHistoryRow[] = [...playedRows, ...simulatedRows].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
  );

  // ── 4. Summary (played matches only) ─────────────────────────────────────
  const wins = playedRows.filter((r) => r.result === "win").length;
  const losses = playedRows.filter((r) => r.result === "loss").length;
  const draws = playedRows.filter((r) => r.result === "draw").length;
  const totalPlayed = playedRows.length;
  const totalKOs = playedRows.reduce((sum, r) => sum + r.enemyKOs, 0);

  return {
    rows,
    summary: {
      totalPlayed,
      wins,
      losses,
      draws,
      winRate: totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : 0,
      totalKOs,
      totalSimulated: simulatedRows.length,
    },
  };
}
