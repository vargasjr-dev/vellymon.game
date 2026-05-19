"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import {
  getMatchGameState,
  submitMatchCommands,
  concedeMatch,
} from "~/data/gameEngine.server";
import { db } from "../../../../../../data/db";
import { matchStats } from "../../../../../../data/schema";
import { eq, and, desc, gte, lt, count } from "drizzle-orm";
import { checkAndAwardAchievements } from "../../../../../../lib/achievementService";
import type { Achievement } from "../../../../../../lib/achievements";
import { getQuestsCompletedAroundMatch } from "../../../../../../lib/questService";
import type { QuestWithProgress } from "../../../../../../lib/questService";

// Command type for the play page — all actions are directional
export type PlayCommand = {
  type: "move" | "attack" | "harvest";
  vellymonUuid: string;
  direction: "up" | "down" | "left" | "right";
  attackIndex?: number;
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

  // Map to engine Command type — all commands are directional now
  const engineCommands = commands.map((c) => ({
    type: c.type,
    vellymonUuid: c.vellymonUuid,
    direction: c.direction,
    attackIndex: c.attackIndex,
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

// ─── Match Rewards ────────────────────────────────────────────────────────────

export type MatchRewards = {
  result: "win" | "loss" | null;
  xpAwarded: number;
  creditsAwarded: number;
  /** e.g. "Silver ★★" — null if not a ranked match or rank data unavailable */
  rankChange: string | null;
  isSparring: boolean;
  /** Achievements newly unlocked by this match — empty array if none */
  newAchievements: Achievement[];
  /** Daily quests completed by this match — empty array if none */
  newlyCompletedQuests: QuestWithProgress[];
};

/**
 * Fetch progression rewards for the current user in a completed match.
 * Reads the matchStats row written by writeMatchStats on game-over.
 * Returns null if stats haven't been written yet (slight async lag after game-over).
 */
export async function getMatchRewardsAction(
  matchUuid: string,
): Promise<MatchRewards | null> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [row] = await db
    .select()
    .from(matchStats)
    .where(
      and(
        eq(matchStats.gameSessionUuid, matchUuid),
        eq(matchStats.userId, session.user.id),
      ),
    )
    .orderBy(desc(matchStats.completedAt))
    .limit(1);

  if (!row) return null;

  const won = row.result === "win";
  const isSparring = row.isSparring;

  // Currency awarded: 10 participation + 25 win bonus (PvP only)
  const creditsAwarded = 10 + (won && !isSparring ? 25 : 0);

  // XP awarded: mirrors calculateMatchXP logic including first-win daily bonus
  const baseXp = won ? 100 : 50;
  const rankedMultiplier = !isSparring ? 1.5 : 1;
  let xpAwarded = Math.round(baseXp * rankedMultiplier);

  // Detect first-win-today: if exactly 1 win exists in matchStats today, this was it
  if (won) {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);

    const [{ value: winsToday }] = await db
      .select({ value: count() })
      .from(matchStats)
      .where(
        and(
          eq(matchStats.userId, session.user.id),
          eq(matchStats.result, "win"),
          gte(matchStats.completedAt, todayStart),
          lt(matchStats.completedAt, tomorrowStart),
        ),
      );

    if (winsToday === 1) {
      xpAwarded += 50; // first-win daily bonus
    }
  }

  // Check and award any newly unlocked achievements + fetch newly completed quests
  const [newAchievements, newlyCompletedQuests] = await Promise.all([
    checkAndAwardAchievements({
      userId: session.user.id,
      latestMatchUuid: matchUuid,
    }),
    getQuestsCompletedAroundMatch(session.user.id, row.completedAt),
  ]);

  return {
    result: row.result as "win" | "loss",
    xpAwarded,
    creditsAwarded,
    rankChange: null, // Phase 12 item 1 will surface this from userRank
    isSparring,
    newAchievements,
    newlyCompletedQuests,
  };
}
