import { db } from "../../data/db";
import { gameSession, gamePlayer, user } from "../../data/schema";
import { eq, desc } from "drizzle-orm";

export type OpenMatch = {
  uuid: string;
  status: string;
  createdAt: Date;
  createdBy: string;
  creatorName: string | null;
  currentPlayers: number;
  maxPlayers: number;
};

const getOpenMatches = async (): Promise<OpenMatch[]> => {
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
      .from(gameSession)
      .leftJoin(user, eq(gameSession.createdBy, user.id))
      .where(eq(gameSession.status, "waiting"))
      .orderBy(desc(gameSession.createdAt));

    return matches;
  } catch (error) {
    console.error("Failed to get open matches:", error);
    return [];
  }
};

export default getOpenMatches;
