import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { getSeasonPageData } from "./actions";
import SeasonTrack from "./SeasonTrack";
import Link from "next/link";

export default async function SeasonPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const data = await getSeasonPageData();

  if (!data.active) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <div className="text-6xl mb-4">🏔️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          No Active Season
        </h1>
        <p className="text-gray-600">
          The next season hasn&apos;t started yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🏆 {data.seasonName}
          </h1>
          <p className="text-gray-600 mt-1">
            Earn XP from matches to unlock rewards.
          </p>
        </div>
        {!data.subscribed && (
          <Link
            href="/subscribe"
            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-lg shadow hover:from-yellow-500 hover:to-orange-600 transition-all"
          >
            ⭐ Unlock Premium Track
          </Link>
        )}
      </div>

      {data.progress && (
        <SeasonTrack
          progress={data.progress}
          track={data.track}
          subscribed={data.subscribed}
        />
      )}
    </div>
  );
}
