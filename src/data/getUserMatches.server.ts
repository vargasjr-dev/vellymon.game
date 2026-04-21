import { db } from "../../data/db";
import { gameSession, gamePlayer, user } from "../../data/schema";
import { eq, desc } from "drizzle-orm";

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
    const rows = await db
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

    // Deduplicate — admin playtest matches have the same user as both
    // players, producing two rows for one session
    const seen = new Set<string>();
    const matches = rows.filter((m) => {
      if (seen.has(m.uuid)) return false;
      seen.add(m.uuid);
      return true;
    });

    return matches;
  } catch (error) {
    console.error("Failed to get user matches:", error);
    return [];
  }
};

export default getUserMatches;
