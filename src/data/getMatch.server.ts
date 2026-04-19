import { db } from "../../data/db";
import { gameSession, gamePlayer, user, team } from "../../data/schema";
import { eq } from "drizzle-orm";

export type MatchDetail = {
  uuid: string;
  status: string;
  createdAt: Date;
  createdBy: string;
  creatorName: string | null;
  currentPlayers: number;
  maxPlayers: number;
  players: {
    uuid: string;
    userId: string;
    userName: string | null;
    teamUuid: string;
    teamName: string | null;
    joinedAt: Date;
  }[];
};

const getMatch = async (matchUuid: string): Promise<MatchDetail | null> => {
  try {
    const [match] = await db
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
      .where(eq(gameSession.uuid, matchUuid));

    if (!match) return null;

    const players = await db
      .select({
        uuid: gamePlayer.uuid,
        userId: gamePlayer.userId,
        userName: user.name,
        teamUuid: gamePlayer.teamUuid,
        teamName: team.name,
        joinedAt: gamePlayer.joinedAt,
      })
      .from(gamePlayer)
      .leftJoin(user, eq(gamePlayer.userId, user.id))
      .leftJoin(team, eq(gamePlayer.teamUuid, team.uuid))
      .where(eq(gamePlayer.gameSessionUuid, matchUuid));

    return { ...match, players };
  } catch (error) {
    console.error("Failed to get match:", error);
    return null;
  }
};

export default getMatch;
