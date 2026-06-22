"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { requireSubscriber } from "../../../../lib/subscription";
import { db } from "../../../../data/db";
import { gameSession, gamePlayer, team } from "../../../../data/schema";
import { eq } from "drizzle-orm";
import type { AIDifficulty } from "../../../../server/ai-opponent";
import { listAiProfiles, getAiProfile } from "~/data/aiProfiles.server";

/**
 * Create a sparring match against a random AI at the chosen difficulty.
 * AI team is generated in-memory by the game engine (random picks from library).
 */
export async function createSparringMatchAction(
  playerTeamUuid: string,
  difficulty: AIDifficulty,
  mapId: string,
): Promise<{ success: true; matchUuid: string } | { success: false; error: string }> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  try {
    await requireSubscriber(session.user.id);
  } catch {
    return { success: false, error: "Premium subscription required for AI sparring" };
  }

  const [playerTeam] = await db
    .select()
    .from(team)
    .where(eq(team.uuid, playerTeamUuid))
    .limit(1);

  if (!playerTeam || playerTeam.userId !== session.user.id) {
    return { success: false, error: "Invalid team selected" };
  }

  const [match] = await db
    .insert(gameSession)
    .values({
      createdBy: session.user.id,
      status: "playing",
      maxPlayers: 2,
      currentPlayers: 2,
      metadata: {
        matchSettings: {
          timerSeconds: 0 as const,
          mapId,
          mode: "casual" as const,
        },
        sparring: true,
        aiDifficulty: difficulty,
        aiTeamId: 2,
        playerTeamUuid,
      },
    })
    .returning();

  await db.insert(gamePlayer).values({
    gameSessionUuid: match.uuid,
    userId: session.user.id,
    teamUuid: playerTeamUuid,
  });

  return { success: true, matchUuid: match.uuid };
}

/**
 * Create a sparring match against a named AI profile.
 * The profile's specific team is stored in metadata so the game engine uses
 * those exact mons instead of random picks.
 */
export async function createProfileSparringMatchAction(
  playerTeamUuid: string,
  profileId: string,
  mapId: string,
): Promise<{ success: true; matchUuid: string } | { success: false; error: string }> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  try {
    await requireSubscriber(session.user.id);
  } catch {
    return { success: false, error: "Premium subscription required for AI sparring" };
  }

  const [playerTeam] = await db
    .select()
    .from(team)
    .where(eq(team.uuid, playerTeamUuid))
    .limit(1);

  if (!playerTeam || playerTeam.userId !== session.user.id) {
    return { success: false, error: "Invalid team selected" };
  }

  const profile = await getAiProfile(profileId);
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const [match] = await db
    .insert(gameSession)
    .values({
      createdBy: session.user.id,
      status: "playing",
      maxPlayers: 2,
      currentPlayers: 2,
      metadata: {
        matchSettings: {
          timerSeconds: 0 as const,
          mapId,
          mode: "casual" as const,
        },
        sparring: true,
        aiDifficulty: "medium" as const,
        aiTeamId: 2,
        playerTeamUuid,
        aiProfileId: profile.id,
        aiProfileTeamNames: profile.teamNames as string[],
        aiProfileName: profile.name,
      },
    })
    .returning();

  await db.insert(gamePlayer).values({
    gameSessionUuid: match.uuid,
    userId: session.user.id,
    teamUuid: playerTeamUuid,
  });

  return { success: true, matchUuid: match.uuid };
}

/**
 * Fetch the list of active profiles for the practice page picker.
 */
export async function getPracticeProfilesAction(): Promise<
  { id: string; name: string; description: string }[]
> {
  const profiles = await listAiProfiles();
  return profiles.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
}
