import { db } from "../../data/db";
import { matchStats, gameSession, gamePlayer, user, team } from "../../data/schema";
import { eq } from "drizzle-orm";

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
  aiDifficulty: string | null;
  completedAt: Date;
  /** Calculated client-side — mirrors matchProgression.ts logic */
  xpAwarded: number;
  creditsAwarded: number;
};

export type MatchSummaryData = {
  matchUuid: string;
  status: string;
  createdAt: Date;
  stats: MatchStatRow[];
};

const getMatchSummary = async (
  matchUuid: string,
): Promise<MatchSummaryData | null> => {
  try {
    const [match] = await db
      .select({ uuid: gameSession.uuid, status: gameSession.status, createdAt: gameSession.createdAt })
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
        aiDifficulty: matchStats.aiDifficulty,
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

    const stats: MatchStatRow[] = Array.from(byUser.values()).map((row) => {
      const won = row.result === "win";
      const isSparring = row.isSparring;
      const creditsAwarded = 10 + (won && !isSparring ? 25 : 0);
      const xpAwarded = Math.round((won ? 100 : 50) * (!isSparring ? 1.5 : 1));

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
        aiDifficulty: row.aiDifficulty,
        completedAt: row.completedAt,
        xpAwarded,
        creditsAwarded,
      };
    });

    return { matchUuid: match.uuid, status: match.status, createdAt: match.createdAt, stats };
  } catch (error) {
    console.error("Failed to get match summary:", error);
    return null;
  }
};

export default getMatchSummary;
