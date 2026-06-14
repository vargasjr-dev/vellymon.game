import { db } from "../../data/db";
import { gameSession, gamePlayer, user, team, matchSnapshot, aiProfile } from "../../data/schema";
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
    // ── 1. Try gameSession (live / human matches) ─────────────────────────
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

    if (match) {
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
    }

    // ── 2. Fallback: matchSnapshot (admin-simulated / CLI-uploaded matches) ─
    const [snap] = await db
      .select({
        id: matchSnapshot.id,
        status: matchSnapshot.status,
        uploadedAt: matchSnapshot.uploadedAt,
        gameState: matchSnapshot.gameState,
        p1ProfileId: matchSnapshot.p1ProfileId,
        p2ProfileId: matchSnapshot.p2ProfileId,
      })
      .from(matchSnapshot)
      .where(eq(matchSnapshot.id, matchUuid));

    if (!snap) return null;

    // Resolve profile names for synthetic player rows (two queries max)
    const profileIds = [snap.p1ProfileId, snap.p2ProfileId].filter(Boolean) as string[];
    const profileMap = new Map<string, string>();
    for (const id of profileIds) {
      const [p] = await db
        .select({ id: aiProfile.id, name: aiProfile.name })
        .from(aiProfile)
        .where(eq(aiProfile.id, id));
      if (p) profileMap.set(p.id, p.name);
    }

    // Extract team names from gameState JSON if available
    const gs = snap.gameState as { teams?: Array<{ name?: string }> } | null;
    const t1Name = gs?.teams?.[0]?.name ?? profileMap.get(snap.p1ProfileId ?? "") ?? "Team 1";
    const t2Name = gs?.teams?.[1]?.name ?? profileMap.get(snap.p2ProfileId ?? "") ?? "Team 2";

    // Build synthetic MatchDetail — no real users/players for simulated matches
    const syntheticPlayers = [
      snap.p1ProfileId
        ? {
            uuid: `${matchUuid}-p1`,
            userId: snap.p1ProfileId,
            userName: profileMap.get(snap.p1ProfileId) ?? "AI",
            teamUuid: `${matchUuid}-t1`,
            teamName: t1Name,
            joinedAt: snap.uploadedAt,
          }
        : null,
      snap.p2ProfileId
        ? {
            uuid: `${matchUuid}-p2`,
            userId: snap.p2ProfileId,
            userName: profileMap.get(snap.p2ProfileId) ?? "AI",
            teamUuid: `${matchUuid}-t2`,
            teamName: t2Name,
            joinedAt: snap.uploadedAt,
          }
        : null,
    ].filter((p): p is NonNullable<typeof p> => p !== null);

    return {
      uuid: snap.id,
      status: snap.status,
      createdAt: snap.uploadedAt,
      createdBy: snap.p1ProfileId ?? "system",
      creatorName: profileMap.get(snap.p1ProfileId ?? "") ?? "System",
      currentPlayers: syntheticPlayers.length,
      maxPlayers: 2,
      players: syntheticPlayers,
    };
  } catch (error) {
    console.error("Failed to get match:", error);
    return null;
  }
};

export default getMatch;
