"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import {
  getActiveSeason,
  getSeasonTrack,
  getProgressSummary,
  claimFreeReward,
  claimPremiumReward,
  type SeasonProgressSummary,
  type ClaimResult,
} from "../../../../lib/seasons";
import { isSubscriber } from "../../../../lib/subscription";

export type TrackTier = {
  tier: number;
  freeReward: unknown;
  premiumReward: unknown;
};

export type SeasonPageData = {
  active: boolean;
  seasonName: string | null;
  progress: SeasonProgressSummary | null;
  track: TrackTier[];
  subscribed: boolean;
};

export async function getSeasonPageData(): Promise<SeasonPageData> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const activeSeason = await getActiveSeason();
  if (!activeSeason) {
    return {
      active: false,
      seasonName: null,
      progress: null,
      track: [],
      subscribed: false,
    };
  }

  const [progress, track, subscribed] = await Promise.all([
    getProgressSummary(session.user.id),
    getSeasonTrack(activeSeason.id),
    isSubscriber(session.user.id),
  ]);

  return {
    active: true,
    seasonName: activeSeason.name,
    progress,
    track: track.map((t) => ({
      tier: t.tier,
      freeReward: t.freeReward,
      premiumReward: t.premiumReward,
    })),
    subscribed,
  };
}

export async function claimRewardAction(
  seasonId: string,
  tier: number,
  trackType: "free" | "premium",
): Promise<ClaimResult> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  if (trackType === "premium") {
    const subscribed = await isSubscriber(session.user.id);
    if (!subscribed) {
      return { success: false, error: "Premium subscription required" };
    }
    return claimPremiumReward(session.user.id, seasonId, tier);
  }

  return claimFreeReward(session.user.id, seasonId, tier);
}
