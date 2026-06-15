import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "~/lib/auth.server";
import getSeasonHistory from "~/data/getSeasonHistory.server";
import type { Rank } from "../../../../../lib/ranked";

// ─── Rank display helpers ─────────────────────────────────────────────────────

const RANK_EMOJI: Record<Rank, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💠",
  diamond: "💎",
  legend: "👑",
};

const RANK_COLOR: Record<Rank, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-500",
  gold: "text-yellow-600",
  platinum: "text-cyan-600",
  diamond: "text-blue-500",
  legend: "text-purple-600",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
  upcoming: "bg-blue-100 text-blue-600",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SeasonHistoryPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const history = await getSeasonHistory(session.user.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/season" className="text-sm text-blue-600 hover:underline">
          ← Current Season
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">🗂️</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Season History</h1>
          <p className="text-sm text-gray-500">Your rank and ⚡️ across all seasons</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">No seasons yet</p>
          <p className="text-sm mt-1">Seasons will appear here once they start.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => {
            const didPlay = entry.gamesPlayed != null && entry.gamesPlayed > 0;
            const winRate =
              didPlay && entry.wins != null && entry.gamesPlayed
                ? Math.round((entry.wins / entry.gamesPlayed) * 100)
                : null;

            return (
              <div
                key={entry.seasonId}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
              >
                {/* Season header row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-gray-900">{entry.seasonName}</h2>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_BADGE[entry.status] ?? "bg-gray-100 text-gray-500"}`}
                      >
                        {entry.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(entry.startDate)} – {formatDate(entry.endDate)}
                    </p>
                  </div>

                  {/* Peak rank badge */}
                  {entry.peakRank ? (
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5">Peak Rank</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">{RANK_EMOJI[entry.peakRank]}</span>
                        <span className={`text-sm font-bold capitalize ${RANK_COLOR[entry.peakRank]}`}>
                          {entry.peakRank}
                          {entry.peakRank !== "legend" && entry.peakStars != null && (
                            <span className="ml-1 font-normal text-gray-400">
                              {"⭐".repeat(entry.peakStars)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Not played</span>
                  )}
                </div>

                {/* Stats row */}
                {didPlay ? (
                  <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Games</p>
                      <p className="font-bold text-gray-900">{entry.gamesPlayed}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">W / L</p>
                      <p className="font-bold text-gray-900">
                        {entry.wins ?? 0} / {entry.losses ?? 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Win %</p>
                      <p className="font-bold text-gray-900">{winRate ?? "—"}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">⚡️</p>
                      <p className="font-bold text-gray-900">
                        {entry.xpEarned != null ? entry.xpEarned.toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 pt-3 border-t border-gray-100 italic">
                    No ranked games played this season.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
