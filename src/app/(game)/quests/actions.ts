"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { claimQuestReward, todayUTC } from "../../../../lib/questService";

/**
 * Server action: claim the reward for a completed daily quest.
 * Uses the current user's session and today's UTC date.
 */
export async function claimQuestRewardAction(
  questId: string,
): Promise<{ xpAwarded: number; creditsAwarded: number }> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const date = todayUTC();
  return claimQuestReward(session.user.id, questId, date);
}
