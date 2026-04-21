"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { db } from "../../../../data/db";
import { gameSession } from "../../../../data/schema";
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

export async function createMatchAction(teamUuid: string) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await createMatch({
    userId: session.user.id,
    teamUuid,
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

  // Transition to playing
  await db
    .update(gameSession)
    .set({ status: "playing" })
    .where(eq(gameSession.uuid, matchUuid));

  revalidatePath(`/matches/${matchUuid}`);
  revalidatePath("/matches");
  revalidatePath("/player");

  return { success: true };
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
