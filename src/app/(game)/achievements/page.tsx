import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "~/lib/auth.server";
import getUserAchievements from "~/data/getUserAchievements.server";
import type { AchievementWithStatus } from "~/data/getUserAchievements.server";
import type { AchievementCategory } from "../../../../lib/achievements";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  matches: "⚔️ Matches",
  ranked: "🏆 Ranked",
  sparring: "🤖 Sparring",
  collection: "📦 Collection",
  social: "🪪 Social",
  special: "⭐ Special",
};

const CATEGORY_ORDER: AchievementCategory[] = [
  "matches",
  "ranked",
  "sparring",
  "collection",
  "social",
  "special",
];

// ─── Badge card ───────────────────────────────────────────────────────────────

function AchievementCard({ a }: { a: AchievementWithStatus }) {
  const dateStr = a.unlockedAt
    ? a.unlockedAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 transition ${
        a.unlocked
          ? "bg-white border-yellow-200 shadow-sm"
          : "bg-gray-50 border-gray-100 opacity-60"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-2xl ${
          a.unlocked ? "bg-yellow-50 border border-yellow-200" : "bg-gray-100"
        }`}
      >
        {a.unlocked ? a.icon : "🔒"}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-semibold text-sm ${a.unlocked ? "text-gray-900" : "text-gray-400"}`}>
            {a.name}
          </p>
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
              a.unlocked
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {a.points} pts
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${a.unlocked ? "text-gray-500" : "text-gray-400"}`}>
          {a.description}
        </p>
        {dateStr && (
          <p className="text-xs text-green-600 mt-1 font-medium">✓ Unlocked {dateStr}</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AchievementsPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const { achievements, unlockedCount, totalCount, earnedPoints, totalPoints } =
    await getUserAchievements(session.user.id);

  const progressPct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  // Group by category
  const byCategory = new Map<AchievementCategory, AchievementWithStatus[]>();
  for (const a of achievements) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/player" className="text-sm text-blue-600 hover:underline">
          ← Hub
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🏅</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
          <p className="text-sm text-gray-500">
            {unlockedCount} / {totalCount} unlocked
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Total Points</span>
          <span className="text-sm font-bold text-yellow-600">
            {earnedPoints.toLocaleString()} / {totalPoints.toLocaleString()} pts
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">{progressPct}% complete</p>
      </div>

      {/* Achievement groups */}
      <div className="space-y-8">
        {CATEGORY_ORDER.map((category) => {
          const list = byCategory.get(category) ?? [];
          if (list.length === 0) return null;
          const catUnlocked = list.filter((a) => a.unlocked).length;

          return (
            <section key={category}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900">
                  {CATEGORY_LABEL[category]}
                </h2>
                <span className="text-xs text-gray-400">
                  {catUnlocked}/{list.length}
                </span>
              </div>
              <div className="space-y-2">
                {list.map((a) => (
                  <AchievementCard key={a.id} a={a} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
