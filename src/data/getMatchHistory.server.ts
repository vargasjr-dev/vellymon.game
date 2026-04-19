import { db } from "../../data/db";
import { gameSession, gamePlayer, user } from "../../data/schema";
import { eq, desc, inArray } from "drizzle-orm";

export type HistoryMatch = {
  uuid: string;
  status: string;
  createdAt: Date;
  createdBy: string;
  creatorName: string | null;
  currentPlayers: number;
  maxPlayers: number;
};

const getMatchHistory = async (userId: string): Promise<HistoryMatch[]> => {
  try {
    const matches = await db
      .select({
        uuid: gameSession.uuid,
        status: gameSession.status,
        createdAt: gameSession.createdAt,
        createdBy: gameSession.createdBy,
        creatorName: user.name,
        currentPlayers: gameSession.currentPlayers,
        maxPlayers: gameSession.maxPlayers,
      })
      .from(gamePlayer)
      .innerJoin(gameSession, eq(gamePlayer.gameSessionUuid, gameSession.uuid))
      .leftJoin(user, eq(gameSession.createdBy, user.id))
      .where(eq(gamePlayer.userId, userId))
      .orderBy(desc(gameSession.createdAt));

    // Filter to finished states only
    return matches.filter((m) =>
      ["completed", "cancelled"].includes(m.status),
    );
  } catch (error) {
    console.error("Failed to get match history:", error);
    return [];
  }
};

export default getMatchHistory;
