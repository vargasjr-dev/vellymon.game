import { db } from "../../data/db";
import { gameSession, gamePlayer, team } from "../../data/schema";
import { eq, and } from "drizzle-orm";

const createMatch = async ({
  userId,
  teamUuid,
}: {
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

    // Create game session
    const [session] = await db
      .insert(gameSession)
      .values({
        createdBy: userId,
        status: "waiting",
        maxPlayers: 2,
        currentPlayers: 1,
      })
      .returning();

    // Add creator as first player
    await db.insert(gamePlayer).values({
      gameSessionUuid: session.uuid,
      userId,
      teamUuid,
    });

    return {
      success: true,
      message: "Match created!",
      matchUuid: session.uuid,
    };
  } catch (error) {
    console.error("Failed to create match:", error);
    return { success: false, message: "Failed to create match" };
  }
};

export default createMatch;
