import { db } from "../../data/db";
import { gameSession, gamePlayer, team } from "../../data/schema";
import { eq, and } from "drizzle-orm";

/**
 * Joins an existing game session with a selected team
 */
const joinGame = async ({
  gameSessionUuid,
  userId,
  teamUuid,
}: {
  gameSessionUuid: string;
  userId: string;
  teamUuid: string;
}) => {
  try {
    // Verify team ownership
    const [ownedTeam] = await db
      .select({ uuid: team.uuid })
      .from(team)
      .where(and(eq(team.uuid, teamUuid), eq(team.userId, userId)));

    if (!ownedTeam) {
      return { success: false, message: "Team not found" };
    }

    // Check if game exists and has space
    const [session] = await db
      .select()
      .from(gameSession)
      .where(eq(gameSession.uuid, gameSessionUuid));

    if (!session) {
      return { success: false, message: "Match not found" };
    }

    if (session.currentPlayers >= session.maxPlayers) {
      return { success: false, message: "Match is full" };
    }

    if (session.status !== "waiting") {
      return { success: false, message: "Match is no longer accepting players" };
    }

    // Add player to game
    const [player] = await db
      .insert(gamePlayer)
      .values({
        gameSessionUuid,
        userId,
        teamUuid,
        status: "active",
      })
      .returning();

    // Update player count and status
    const newPlayerCount = session.currentPlayers + 1;
    await db
      .update(gameSession)
      .set({
        currentPlayers: newPlayerCount,
        status: newPlayerCount >= session.maxPlayers ? "ready" : "waiting",
      })
      .where(eq(gameSession.uuid, gameSessionUuid));

    return {
      success: true,
      message: "Joined match!",
      playerUuid: player.uuid,
      matchUuid: gameSessionUuid,
    };
  } catch (error) {
    console.error("Failed to join game:", error);
    return { success: false, message: "Failed to join match" };
  }
};

export default joinGame;
