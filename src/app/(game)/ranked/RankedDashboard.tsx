"use client";

import type { RankSummary } from "../../../../lib/rank-rewards";
import type { Rank } from "../../../../lib/ranked";
import type { LeaderboardRow } from "./actions";

const RANK_ICONS: Record<Rank, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
  diamond: "💠",
  legend: "🏆",
};

const RANK_COLORS: Record<Rank, string> = {
  bronze: "from-amber-600 to-amber-800",
  silver: "from-gray-300 to-gray-500",
  gold: "from-yellow-400 to-yellow-600",
  platinum: "from-cyan-300 to-cyan-500",
  diamond: "from-blue-400 to-purple-500",
  legend: "from-yellow-300 via-orange-400 to-red-500",
};

const STAR_THRESHOLDS: Record<Rank, number> = {
  bronze: 3,
  silver: 4,
  gold: 5,
  platinum: 5,
  diamond: 5,
  legend: 0,
};

interface RankedDashboardProps {
  summary: RankSummary | null;
  leaderboard: LeaderboardRow[];
  subscribed: boolean;
}

export default function RankedDashboard({
  summary,
  leaderboard,
  subscribed,
}: RankedDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Rank Card */}
      {summary ? (
        <div
          className={`bg-gradient-to-r ${RANK_COLORS[summary.rank]} rounded-2xl shadow-xl p-6 text-white`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-80 uppercase tracking-wide">
                Current Rank
              </p>
              <h2 className="text-3xl font-bold">
                {RANK_ICONS[summary.rank]}{" "}
                {summary.rank.charAt(0).toUpperCase() + summary.rank.slice(1)}
                {summary.legendEntry != null && (
                  <span className="text-lg ml-2">#{summary.legendEntry}</span>
                )}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">MMR</p>
              <p className="text-2xl font-bold">{summary.mmr}</p>
            </div>
          </div>

          {/* Stars */}
          {summary.rank !== "legend" && (
            <div className="flex gap-1 mb-4">
              {Array.from({ length: STAR_THRESHOLDS[summary.rank] }).map(
                (_, i) => (
                  <span
                    key={i}
                    className={`text-2xl ${i < summary.stars ? "opacity-100" : "opacity-30"}`}
                  >
                    ⭐
                  </span>
                ),
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-bold">{summary.gamesPlayed}</p>
              <p className="text-xs opacity-70">Games</p>
            </div>
            <div>
              <p className="text-xl font-bold">{summary.wins}</p>
              <p className="text-xs opacity-70">Wins</p>
            </div>
            <div>
              <p className="text-xl font-bold">{summary.losses}</p>
              <p className="text-xs opacity-70">Losses</p>
            </div>
            <div>
              <p className="text-xl font-bold">{summary.winRate}%</p>
              <p className="text-xs opacity-70">Win Rate</p>
            </div>
          </div>

          {/* Peak Rank */}
          <div className="mt-4 pt-3 border-t border-white/20 text-sm opacity-80">
            Peak: {RANK_ICONS[summary.peakRank]}{" "}
            {summary.peakRank.charAt(0).toUpperCase() +
              summary.peakRank.slice(1)}
            {subscribed && (
              <span className="ml-3 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                ⭐ 2x Rewards
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-2xl p-6 text-center">
          <p className="text-gray-600">
            Play a ranked match to start your ladder journey!
          </p>
        </div>
      )}

      {/* Milestones */}
      {summary && summary.milestones.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            🎖️ Rank Milestones
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {summary.milestones.map((m) => (
              <div
                key={m.rank}
                className={`p-3 rounded-lg border-2 transition ${
                  m.reached
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200 bg-gray-50 opacity-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {RANK_ICONS[m.rank]}
                  </span>
                  <span className="font-medium text-sm text-gray-900 capitalize">
                    {m.rank}
                  </span>
                  {m.reached && <span className="text-green-600">✅</span>}
                </div>
                <p className="text-xs text-gray-600">{m.rewards.description}</p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  +{m.rewards.credits} 💎
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          📊 Leaderboard
        </h3>
        {leaderboard.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No ranked players yet this season.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <th className="py-2 text-left">#</th>
                  <th className="py-2 text-left">Player</th>
                  <th className="py-2 text-center">Rank</th>
                  <th className="py-2 text-center">W/L</th>
                  <th className="py-2 text-right">MMR</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr
                    key={entry.userId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 text-gray-400 font-medium">
                      {i + 1}
                    </td>
                    <td className="py-2 font-medium text-gray-900">
                      {entry.username}
                      {entry.legendEntry != null && (
                        <span className="text-xs text-yellow-600 ml-1">
                          Legend #{entry.legendEntry}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {RANK_ICONS[entry.rank]}{" "}
                      {entry.rank !== "legend" &&
                        "⭐".repeat(entry.stars)}
                    </td>
                    <td className="py-2 text-center text-gray-600">
                      {entry.wins}/{entry.losses}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-900">
                      {entry.mmr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
