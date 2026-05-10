"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { requireSubscriber } from "../../../../lib/subscription";
import { db } from "../../../../data/db";
import { gameSession, gamePlayer, team } from "../../../../data/schema";
import { eq } from "drizzle-orm";
import type { AIDifficulty } from "../../../../server/ai-opponent";

/**
 * Create a sparring match against AI.
 * - Validates subscription + team ownership
 * - Creates a game session with sparring metadata
 * - AI team is generated in-memory by the game engine (no DB team needed)
 * - Match starts immediately in "playing" state
 */
export async function createSparringMatchAction(
  playerTeamUuid: string,
  difficulty: AIDifficulty,
  mapId: string,
): Promise<{ success: true; matchUuid: string } | { success: false; error: string }> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  // Require subscription
  try {
    await requireSubscriber(session.user.id);
  } catch {
    return { success: false, error: "Premium subscription required for AI sparring" };
  }

  // Verify the player's team exists and belongs to them
  const [playerTeam] = await db
    .select()
    .from(team)
    .where(eq(team.uuid, playerTeamUuid))
    .limit(1);

  if (!playerTeam || playerTeam.userId !== session.user.id) {
    return { success: false, error: "Invalid team selected" };
  }

  // Create game session — starts in "playing" state (no matchmaking needed)
  // AI team is generated from the vellymon library at match start time
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
        aiTeamId: 2, // AI is always team 2
        playerTeamUuid,
      },
    })
    .returning();

  // Only add the human player — AI doesn't need a gamePlayer row
  await db.insert(gamePlayer).values({
    gameSessionUuid: match.uuid,
    userId: session.user.id,
    teamUuid: playerTeamUuid,
  });

  return { success: true, matchUuid: match.uuid };
}
