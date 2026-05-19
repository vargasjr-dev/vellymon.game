import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "~/lib/auth.server";
import { getTodayQuests, todayUTC } from "../../../../lib/questService";
import { QuestCard } from "./QuestCard";

export default async function QuestsPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [quests, date] = await Promise.all([
    getTodayQuests(session.user.id),
    Promise.resolve(todayUTC()),
  ]);

  const completedCount = quests.filter((q) => q.completed).length;
  const allClaimed = quests.length > 0 && quests.every((q) => q.rewardClaimed);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/player" className="text-sm text-blue-600 hover:underline">
          ← Hub
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-3xl">📋</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Quests</h1>
          <p className="text-sm text-gray-500">
            {completedCount} / {quests.length} complete
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-8">
        Quests reset at midnight UTC &middot; {date}
      </p>

      {/* Quest cards */}
      <div className="space-y-4">
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>

      {/* All done banner */}
      {allClaimed && (
        <div className="mt-8 text-center p-6 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-bold text-green-700 text-lg">All quests complete!</p>
          <p className="text-sm text-green-600 mt-1">
            New quests unlock at midnight UTC.
          </p>
        </div>
      )}

      {/* Footer hint */}
      <p className="text-center text-xs text-gray-300 mt-10">
        Complete matches to make progress on your daily quests.
      </p>
    </div>
  );
}
