import { db } from "../../data/db";
import { matchStats, gameSession, gamePlayer, user, team, userRank } from "../../data/schema";
import { eq } from "drizzle-orm";
import type { GameState, TeamState } from "../../server/types";

export type MatchStatRow = {
  userId: string;
  userName: string;
  teamName: string | null;
  result: "win" | "loss";
  turns: number;
  enemyKOs: number;
  ownKOs: number;
  winCondition: string;
  isSparring: boolean;
  completedAt: Date;
  /** Calculated client-side — mirrors matchProgression.ts logic */
  xpAwarded: number;
  creditsAwarded: number;
  /** Current rank tier for this player (null for unranked / sparring) */
  rank: string | null;
  /** Current MMR (null for unranked / sparring) */
  mmr: number | null;
};

export type TeamSummary = {
  teamId: 1 | 2;
  teamName: string;
  isWinner: boolean;
  energy: number;
  knockedMons: string[];
  starSpacesControlled: number;
};

export type MatchSummaryData = {
  matchUuid: string;
  status: string;
  createdAt: Date;
  stats: MatchStatRow[];
  /** Per-team breakdown extracted from final game state */
  teamSummaries: TeamSummary[];
  /** Total turns played (mirrors matchStats.turns) */
  turns: number;
  /** Total occupation spaces on the board (usually 3) */
  totalStarSpaces: number;
};

const getMatchSummary = async (
  matchUuid: string,
): Promise<MatchSummaryData | null> => {
  try {
    const [match] = await db
      .select({ uuid: gameSession.uuid, status: gameSession.status, createdAt: gameSession.createdAt, metadata: gameSession.metadata })
      .from(gameSession)
      .where(eq(gameSession.uuid, matchUuid))
      .limit(1);

    if (!match) return null;

    // Fetch all matchStats rows for this session
    const rows = await db
      .select({
        userId: matchStats.userId,
        userName: user.name,
        teamName: team.name,
        result: matchStats.result,
        turns: matchStats.turns,
        enemyKOs: matchStats.enemyKOs,
        ownKOs: matchStats.ownKOs,
        winCondition: matchStats.winCondition,
        isSparring: matchStats.isSparring,
        completedAt: matchStats.completedAt,
      })
      .from(matchStats)
      .leftJoin(user, eq(matchStats.userId, user.id))
      .leftJoin(gamePlayer, eq(gamePlayer.userId, matchStats.userId))
      .leftJoin(team, eq(gamePlayer.teamUuid, team.uuid))
      .where(eq(matchStats.gameSessionUuid, matchUuid));

    // De-duplicate in case of join expansion, keep latest completedAt per userId
    const byUser = new Map<string, typeof rows[0]>();
    for (const row of rows) {
      const existing = byUser.get(row.userId);
      if (!existing || row.completedAt > existing.completedAt) {
        byUser.set(row.userId, row);
      }
    }

    // Fetch current rank for all players in this match
    const userIds = Array.from(byUser.keys());
    const rankRows = userIds.length > 0
      ? await db
          .select({ userId: userRank.userId, rank: userRank.rank, mmr: userRank.mmr })
          .from(userRank)
          .where(eq(userRank.userId, userIds[0])) // drizzle inList not needed for typical 2-player match
      : [];
    // For matches with more than one player, fetch remaining ranks
    const rankMap = new Map<string, { rank: string; mmr: number }>();
    for (const r of rankRows) rankMap.set(r.userId, { rank: r.rank, mmr: r.mmr });
    if (userIds.length > 1) {
      for (const uid of userIds.slice(1)) {
        const extra = await db
          .select({ rank: userRank.rank, mmr: userRank.mmr })
          .from(userRank)
          .where(eq(userRank.userId, uid))
          .limit(1);
        if (extra[0]) rankMap.set(uid, { rank: extra[0].rank, mmr: extra[0].mmr });
      }
    }

    const stats: MatchStatRow[] = Array.from(byUser.values()).map((row) => {
      const won = row.result === "win";
      const isSparring = row.isSparring;
      const creditsAwarded = isSparring ? 0 : 10 + (won ? 25 : 0);
      const xpAwarded = Math.round((won ? 100 : 50) * (!isSparring ? 1.5 : 1));
      const rankInfo = rankMap.get(row.userId);

      return {
        userId: row.userId,
        userName: row.userName ?? "Unknown",
        teamName: row.teamName,
        result: row.result as "win" | "loss",
        turns: row.turns,
        enemyKOs: row.enemyKOs,
        ownKOs: row.ownKOs,
        winCondition: row.winCondition ?? "",
        isSparring: row.isSparring,
        completedAt: row.completedAt,
        xpAwarded,
        creditsAwarded,
        rank: rankInfo?.rank ?? null,
        mmr: rankInfo?.mmr ?? null,
      };
    });

    // ── Extract per-team breakdown from final game state ──────────────────
    const meta = match.metadata as { gameState?: GameState } | null;
    const gameState = meta?.gameState ?? null;
    const turns = stats[0]?.turns ?? gameState?.turn ?? 0;

    const occupationSpaces = gameState
      ? gameState.board.filter((s) => s.type === "occupation")
      : [];
    const totalStarSpaces = occupationSpaces.length;

    const teamSummaries: TeamSummary[] = gameState
      ? gameState.teams.map((t: TeamState) => {
          const starSpacesControlled = occupationSpaces.filter(
            (s) =>
              (t.id === 1 && (s.occupationCounter ?? 0) < 0) ||
              (t.id === 2 && (s.occupationCounter ?? 0) > 0),
          ).length;

          return {
            teamId: t.id,
            teamName: t.name,
            isWinner: gameState.result?.winner === t.id,
            energy: t.energy,
            knockedMons: t.knocked.map((v) => v.name),
            starSpacesControlled,
          };
        })
      : [];

    return { matchUuid: match.uuid, status: match.status, createdAt: match.createdAt, stats, teamSummaries, turns, totalStarSpaces };
  } catch (error) {
    console.error("Failed to get match summary:", error);
    return null;
  }
};

export default getMatchSummary;
