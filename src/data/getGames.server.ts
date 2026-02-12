import { db } from "../../data/db";
import { gameSession } from "../../data/schema";
import { eq } from "drizzle-orm";

/**
 * Lists all active game sessions
 */
const getGames = async () => {
  try {
    const sessions = await db
      .select()
      .from(gameSession)
      .where(eq(gameSession.status, 'active'))
      .orderBy(gameSession.createdAt);

    return sessions;
  } catch (error) {
    console.error('Failed to get games:', error);
    return [];
  }
};

export default getGames;
