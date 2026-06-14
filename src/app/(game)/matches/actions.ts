"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { db } from "../../../../data/db";
import { gameSession, gamePlayer } from "../../../../data/schema";
import createMatch from "~/data/createMatch.server";
import joinGame from "~/data/joinGame.server";
import cancelMatch from "~/data/cancelMatch.server";
import getMatch from "~/data/getMatch.server";

export async function getMatchAction(matchUuid: string) {
  return getMatch(matchUuid);
}

export async function cancelMatchAction(matchUuid: string) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await cancelMatch({
    matchUuid,
    userId: session.user.id,
  });

  if (result.success) {
    revalidatePath("/matches");
    revalidatePath("/player");
  }

  return result;
}

export async function createMatchAction(
  teamUuid: string,
  settings?: { timerSeconds?: number; mapId?: string },
) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await createMatch({
    userId: session.user.id,
    teamUuid,
    timerSeconds: settings?.timerSeconds,
    mapId: settings?.mapId,
  });

  if (result.success) {
    revalidatePath("/matches");
    revalidatePath("/player");
  }

  return result;
}

export async function startMatchAction(matchUuid: string) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  // Verify match exists, is ready, and user is a player
  const match = await getMatch(matchUuid);
  if (!match) return { success: false, message: "Match not found" };
  if (match.status !== "ready")
    return { success: false, message: "Match is not ready to start" };

  const isPlayer = match.players.some((p) => p.userId === session.user.id);
  if (!isPlayer) return { success: false, message: "You are not in this match" };

  // Initialize the game engine and transition to playing
  try {
    const { initializeMatchGame } = await import("../../../data/gameEngine.server");
    await initializeMatchGame(matchUuid);
  } catch (error) {
    console.error("Failed to initialize game:", error);
    return { success: false, message: "Failed to initialize game engine" };
  }

  revalidatePath(`/matches/${matchUuid}`);
  revalidatePath("/matches");
  revalidatePath("/player");

  return { success: true };
}

export async function deleteMatchAction(matchUuid: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Admin-only
  const { isAdmin } = await import("~/lib/admin");
  if (!isAdmin(session)) {
    return { success: false, message: "Admin access required" };
  }

  // Verify match exists
  const match = await getMatch(matchUuid);
  if (!match) return { success: false, message: "Match not found" };

  // Delete — gamePlayers cascade automatically
  await db.delete(gameSession).where(eq(gameSession.uuid, matchUuid));

  revalidatePath("/matches");
  revalidatePath("/player");

  return { success: true };
}

/**
 * Create a rematch: look up the current user's team from the original match,
 * then create a new match with the same team and return the new match UUID.
 */
export async function createRematchAction(
  originalMatchUuid: string,
): Promise<{ success: true; matchUuid: string } | { success: false; message: string }> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  // Find the current user's team from the original match
  const [myPlayer] = await db
    .select({ teamUuid: gamePlayer.teamUuid })
    .from(gamePlayer)
    .where(
      and(
        eq(gamePlayer.gameSessionUuid, originalMatchUuid),
        eq(gamePlayer.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!myPlayer) {
    return { success: false, message: "You were not a player in that match" };
  }

  const result = await createMatch({
    userId: session.user.id,
    teamUuid: myPlayer.teamUuid,
  });

  if (!result.success) {
    return { success: false, message: result.message ?? "Failed to create rematch" };
  }

  revalidatePath("/matches");
  revalidatePath("/player");

  return { success: true, matchUuid: result.matchUuid! };
}

export async function queueForMatchAction(
  teamUuid: string,
): Promise<
  | { success: false; message: string }
  | { success: true; matchUuid: string; matched: boolean }
> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const queueForMatch = (await import("~/data/queueForMatch.server")).default;
  const result = await queueForMatch({ userId: session.user.id, teamUuid });

  if (result.success) {
    revalidatePath("/matches");
    revalidatePath("/player");
  }

  return result;
}

export async function joinMatchAction(matchUuid: string, teamUuid: string) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await joinGame({
    gameSessionUuid: matchUuid,
    userId: session.user.id,
    teamUuid,
  });

  if (result.success) {
    revalidatePath("/matches");
    revalidatePath(`/matches/${matchUuid}`);
    revalidatePath("/player");
  }

  return result;
}
