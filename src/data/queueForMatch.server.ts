import { db } from "../../data/db";
import { gameSession, gamePlayer, team } from "../../data/schema";
import { eq, and, ne, notInArray, asc } from "drizzle-orm";
import createMatch from "./createMatch.server";
import joinGame from "./joinGame.server";

const MAP_IDS = ["standard", "the-choke"];

/**
 * Simple automatic matchmaking:
 * - If a waiting match exists (not created by this user, not already joined): join it + auto-start
 * - Otherwise: create a new match with no timer and a randomly chosen map
 */
const queueForMatch = async ({
  userId,
  teamUuid,
}: {
  userId: string;
  teamUuid: string;
}): Promise<
  | { success: false; message: string }
  | { success: true; matchUuid: string; matched: boolean }
> => {
  // Verify team ownership
  const [ownedTeam] = await db
    .select({ uuid: team.uuid })
    .from(team)
    .where(and(eq(team.uuid, teamUuid), eq(team.userId, userId)));

  if (!ownedTeam) return { success: false, message: "Team not found" };

  // Find sessions this user has already joined (to avoid re-joining)
  const myJoinedSessions = await db
    .select({ gameSessionUuid: gamePlayer.gameSessionUuid })
    .from(gamePlayer)
    .where(eq(gamePlayer.userId, userId));
  const myJoinedUuids = myJoinedSessions.map((s) => s.gameSessionUuid);

  // Find the oldest waiting match not created by this user
  const [candidate] = await db
    .select({ uuid: gameSession.uuid })
    .from(gameSession)
    .where(
      and(
        eq(gameSession.status, "waiting"),
        ne(gameSession.createdBy, userId),
        myJoinedUuids.length > 0
          ? notInArray(gameSession.uuid, myJoinedUuids)
          : undefined,
      ),
    )
    .orderBy(asc(gameSession.createdAt))
    .limit(1);

  if (candidate) {
    const joinResult = await joinGame({
      gameSessionUuid: candidate.uuid,
      userId,
      teamUuid,
    });
    if (!joinResult.success) return { success: false, message: joinResult.message };

    try {
      const { initializeMatchGame } = await import("./gameEngine.server");
      await initializeMatchGame(candidate.uuid);
    } catch (error) {
      console.error("Failed to auto-start matched game:", error);
      return { success: false, message: "Failed to start match" };
    }

    return { success: true, matchUuid: candidate.uuid, matched: true };
  }

  // No open match — create one with no timer and a random map
  const mapId = MAP_IDS[Math.floor(Math.random() * MAP_IDS.length)];
  const createResult = await createMatch({
    userId,
    teamUuid,
    timerSeconds: 0,
    mapId,
  });

  if (!createResult.success || !createResult.matchUuid) {
    return { success: false, message: createResult.message ?? "Failed to create match" };
  }

  return { success: true, matchUuid: createResult.matchUuid, matched: false };
};

export default queueForMatch;
