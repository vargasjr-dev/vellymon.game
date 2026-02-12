import { db } from "../../data/db";
import { gameSession, gamePlayer } from "../../data/schema";
import { eq } from "drizzle-orm";

/**
 * Loads match/game session details by ID
 */
const loadMatch = async (id: string) => {
  try {
    const [session] = await db
      .select()
      .from(gameSession)
      .where(eq(gameSession.uuid, id));

    if (!session) {
      throw new Error('Match not found');
    }

    // Get all players in the game
    const players = await db
      .select()
      .from(gamePlayer)
      .where(eq(gamePlayer.gameSessionUuid, id));

    return {
      ...session,
      players,
    };
  } catch (error) {
    console.error('Failed to load match:', error);
    throw new Error('Failed to load match');
  }
};

export default loadMatch;
