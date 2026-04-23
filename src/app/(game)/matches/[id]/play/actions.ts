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
