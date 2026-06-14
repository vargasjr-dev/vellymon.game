"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { getOrCreateActiveSeason } from "../../../../lib/seasons";
import { getLeaderboard, type Rank } from "../../../../lib/ranked";
import { getRankSummary, type RankSummary } from "../../../../lib/rank-rewards";
import { isSubscriber } from "../../../../lib/subscription";
import { db } from "../../../../data/db";
import { user } from "../../../../data/schema";
import { eq } from "drizzle-orm";

export type LeaderboardRow = {
  userId: string;
  username: string;
  rank: Rank;
  stars: number;
  legendEntry: number | null;
  wins: number;
  losses: number;
  mmr: number;
};

export type RankedPageData = {
  hasActiveSeason: boolean;
  seasonName: string | null;
  summary: RankSummary | null;
  leaderboard: LeaderboardRow[];
  subscribed: boolean;
};

export async function getRankedPageData(): Promise<RankedPageData> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const activeSeason = await getOrCreateActiveSeason();
  if (!activeSeason) {
    return {
      hasActiveSeason: false,
      seasonName: null,
      summary: null,
      leaderboard: [],
      subscribed: false,
    };
  }

  const [summary, rawLeaderboard, subscribed] = await Promise.all([
    getRankSummary(session.user.id, activeSeason.id),
    getLeaderboard(activeSeason.id, 50),
    isSubscriber(session.user.id),
  ]);

  // Resolve usernames for leaderboard
  const leaderboard: LeaderboardRow[] = await Promise.all(
    rawLeaderboard.map(async (entry) => {
      const [u] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, entry.userId))
        .limit(1);
      return {
        ...entry,
        username: u?.name ?? "Unknown",
      };
    }),
  );

  return {
    hasActiveSeason: true,
    seasonName: activeSeason.name,
    summary,
    leaderboard,
    subscribed,
  };
}
