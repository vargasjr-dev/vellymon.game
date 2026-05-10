import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { getRankedPageData } from "./actions";
import RankedDashboard from "./RankedDashboard";

export default async function RankedPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const data = await getRankedPageData();

  if (!data.hasActiveSeason) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <div className="text-6xl mb-4">⚔️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          No Active Season
        </h1>
        <p className="text-gray-600">
          Ranked play begins when a season starts. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          ⚔️ Ranked — {data.seasonName}
        </h1>
        <p className="text-gray-600 mt-1">
          Climb the ladder. Earn rewards at every rank.
        </p>
      </div>

      <RankedDashboard
        summary={data.summary}
        leaderboard={data.leaderboard}
        subscribed={data.subscribed}
      />
    </div>
  );
}
