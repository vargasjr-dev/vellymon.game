import { db } from "../../data/db";
import { gameSession, gamePlayer, user } from "../../data/schema";
import { eq, desc, and, ne } from "drizzle-orm";

export type UserMatch = {
  uuid: string;
  status: string;
  createdAt: Date;
  createdBy: string;
  creatorName: string | null;
  currentPlayers: number;
};

const getUserMatches = async (userId: string): Promise<UserMatch[]> => {
  try {
    // Get all matches this user has participated in
    const matches = await db
      .select({
        uuid: gameSession.uuid,
        status: gameSession.status,
        createdAt: gameSession.createdAt,
        createdBy: gameSession.createdBy,
        creatorName: user.name,
        currentPlayers: gameSession.currentPlayers,
      })
      .from(gamePlayer)
      .innerJoin(gameSession, eq(gamePlayer.gameSessionUuid, gameSession.uuid))
      .leftJoin(user, eq(gameSession.createdBy, user.id))
      .where(eq(gamePlayer.userId, userId))
      .orderBy(desc(gameSession.createdAt));

    return matches;
  } catch (error) {
    console.error("Failed to get user matches:", error);
    return [];
  }
};

export default getUserMatches;
