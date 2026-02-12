import { db } from "../../data/db";
import { gameSession, gamePlayer } from "../../data/schema";
import { eq } from "drizzle-orm";

/**
 * Joins an existing game session
 */
const joinGame = async (gameSessionId: string, userId: string) => {
  try {
    // Check if game exists and has space
    const [session] = await db
      .select()
      .from(gameSession)
      .where(eq(gameSession.uuid, gameSessionId));

    if (!session) {
      throw new Error('Game session not found');
    }

    if (session.currentPlayers >= session.maxPlayers) {
      throw new Error('Game session is full');
    }

    // Add player to game
    const [player] = await db.insert(gamePlayer).values({
      gameSessionUuid: gameSessionId,
      userId,
      status: 'active',
    }).returning();

    // Update player count
    await db
      .update(gameSession)
      .set({ 
        currentPlayers: session.currentPlayers + 1,
        updatedAt: new Date(),
      })
      .where(eq(gameSession.uuid, gameSessionId));

    return {
      playerId: player.uuid,
      gameSessionId,
    };
  } catch (error) {
    console.error('Failed to join game:', error);
    throw new Error('Failed to join game session');
  }
};

export default joinGame;
