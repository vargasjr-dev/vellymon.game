"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import {
  getMatchGameState,
  submitMatchCommands,
  concedeMatch,
} from "~/data/gameEngine.server";

// Command type for the play page
export type PlayCommand = {
  type: "move" | "attack" | "harvest";
  vellymonUuid: string;
  direction?: "up" | "down" | "left" | "right";
  attackIndex?: number;
  targetX?: number;
  targetY?: number;
};

export async function getGameStateAction(matchUuid: string) {
  return getMatchGameState(matchUuid);
}

export async function submitCommandsAction(
  matchUuid: string,
  commands: PlayCommand[],
  asTeamId?: 1 | 2,
) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  // Map to engine Command type
  const engineCommands = commands.map((c) => ({
    type: c.type,
    vellymonUuid: c.vellymonUuid,
    direction: c.direction,
    attackIndex: c.attackIndex,
    targetX: c.targetX,
    targetY: c.targetY,
  }));

  return submitMatchCommands(matchUuid, session.user.id, engineCommands as never[], asTeamId);
}

export async function concedeAction(matchUuid: string, asTeamId?: 1 | 2) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  return concedeMatch(matchUuid, session.user.id, asTeamId);
}

// ─── Vellymon info (reads from library + power registry at runtime) ──────────

export type VellymonInfo = {
  archetype: string;
  flavor: string;
  powerName: string;
  powerDesc: string;
};

/**
 * Look up display metadata for vellymons by name.
 * Reads from the server-side library + power registry — always in sync.
 */
export async function getVellymonInfoAction(
  names: string[],
): Promise<Record<string, VellymonInfo>> {
  const { VELLYMON_LIBRARY } = await import("../../../../../../server/vellymonLibrary");
  await import("../../../../../../server/powers");
  const { getPower } = await import("../../../../../../server/specialPowers");

  const result: Record<string, VellymonInfo> = {};
  for (const name of names) {
    const template = VELLYMON_LIBRARY.find((v) => v.name === name);
    if (!template) continue;
    const power = template.specialPowerId
      ? getPower(template.specialPowerId)
      : undefined;
    result[name] = {
      archetype: template.archetype,
      flavor: template.flavor,
      powerName: power?.name ?? "",
      powerDesc: power?.description ?? "",
    };
  }
  return result;
}
