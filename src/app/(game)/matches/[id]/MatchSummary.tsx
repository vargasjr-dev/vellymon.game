"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRematchAction } from "../actions";
import type { MatchSummaryData } from "~/data/getMatchSummary.server";

const WIN_CONDITION_LABEL: Record<string, string> = {
  elimination: "Elimination",
  occupation: "Occupation",
  accumulation: "Accumulation",
  concession: "Conceded",
};

function StarDots({ controlled, total }: { controlled: number; total: number }) {
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`text-base ${i < controlled ? "opacity-100" : "opacity-20"}`}>
          ⭐
        </span>
      ))}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-white/60 rounded-lg px-3 py-2 min-w-[64px]">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-base font-bold text-gray-800">{value}</span>
    </div>
  );
}

const RANK_EMOJI: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
  diamond: "💠",
  legend: "👑",
};

interface MatchSummaryProps {
  summary: MatchSummaryData;
  currentUserId: string;
}

export default function MatchSummary({ summary, currentUserId }: MatchSummaryProps) {
  const router = useRouter();
  const [rematching, setRematching] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);

  const handleRematch = async () => {
    setRematching(true);
    setRematchError(null);
    const result = await createRematchAction(summary.matchUuid);
    if (result.success) {
      router.push(`/matches/${result.matchUuid}`);
    } else {
      setRematchError(result.message);
      setRematching(false);
    }
  };

  const { stats, teamSummaries, turns: matchTurns, totalStarSpaces } = summary;

  if (stats.length === 0) {
    // Match completed but stats not yet written (rare race condition)
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-4">⏳</p>
        <p className="font-semibold">Match results are being tallied...</p>
        <p className="text-sm mt-2">Refresh in a moment to see your stats.</p>
        <Link href="/matches" className="mt-6 inline-block text-blue-600 hover:underline text-sm">
          ← Back to Matches
        </Link>
      </div>
    );
  }

  const myStats = stats.find((s) => s.userId === currentUserId);
  const isSparring = stats[0]?.isSparring ?? false;
  const winCondition = stats[0]?.winCondition ?? "";
  const conditionLabel = WIN_CONDITION_LABEL[winCondition] ?? winCondition;

  const resultEmoji = myStats?.result === "win" ? "🏆" : myStats?.result === "loss" ? "💔" : "⚔️";
  const resultLabel = myStats?.result === "win" ? "Victory" : myStats?.result === "loss" ? "Defeat" : "Completed";
  const resultBg = myStats?.result === "win"
    ? "from-yellow-50 to-amber-50 border-yellow-300"
    : myStats?.result === "loss"
      ? "from-slate-50 to-gray-100 border-slate-300"
      : "from-blue-50 to-indigo-50 border-blue-200";
  const resultTextColor = myStats?.result === "win" ? "text-yellow-700" : "text-gray-700";

  return (
    <div className="space-y-6">
      {/* Result Banner */}
      <div className={`bg-gradient-to-br ${resultBg} border-2 rounded-2xl p-6 text-center`}>
        <div className="text-5xl mb-2">{resultEmoji}</div>
        <h1 className={`text-3xl font-bold ${resultTextColor}`}>{resultLabel}</h1>
        <p className="text-sm text-gray-500 mt-1 uppercase tracking-wide">{conditionLabel}</p>
        {isSparring && (
          <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
            🥊 Practice Match
          </span>
        )}
        <p className="text-xs text-gray-400 mt-2">{matchTurns} turns played</p>
      </div>

      {/* Battle Breakdown */}
      {teamSummaries.length === 2 && (
        <div className="rounded-2xl border border-gray-200 bg-white/80 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Battle Breakdown</h2>
            <span className="text-xs text-gray-400">{matchTurns} turns</span>
          </div>

          {/* Team columns */}
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {teamSummaries.map((team) => (
              <div
                key={team.teamId}
                className={`p-4 space-y-3 ${team.isWinner ? "bg-amber-50" : "bg-white"}`}
              >
                {/* Team name + winner crown */}
                <div className="text-center">
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {team.isWinner && <span className="mr-1">🏆</span>}
                    {team.teamName}
                  </p>
                </div>

                {/* Energy */}
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Energy</p>
                  <p className="font-semibold text-gray-800">⚡ {team.energy}</p>
                </div>

                {/* Star spaces */}
                {totalStarSpaces > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Stars</p>
                    <StarDots controlled={team.starSpacesControlled} total={totalStarSpaces} />
                  </div>
                )}

                {/* KO'd mons */}
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">KO&apos;d</p>
                  {team.knockedMons.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">None</p>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {team.knockedMons.map((name) => (
                        <span
                          key={name}
                          className="text-xs bg-red-50 text-red-600 rounded px-1.5 py-0.5 font-medium"
                        >
                          💀 {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Stats Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Match Stats</h2>
        {stats.map((row) => {
          const isMe = row.userId === currentUserId;
          return (
            <div
              key={row.userId}
              className={`rounded-xl border p-4 ${
                row.result === "win"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-slate-50 border-slate-200"
              } ${isMe ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {row.userName}
                    {isMe && <span className="ml-2 text-xs text-blue-500 font-normal">(you)</span>}
                  </p>
                  {row.teamName && (
                    <p className="text-xs text-gray-500">{row.teamName}</p>
                  )}

                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    row.result === "win"
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {row.result === "win" ? "WIN" : "LOSS"}
                </span>
              </div>

              {/* Rank badge */}
              {!row.isSparring && row.rank && (
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="text-base">{RANK_EMOJI[row.rank] ?? "🎖️"}</span>
                  <span className="text-xs font-semibold text-gray-600 capitalize">{row.rank}</span>
                  {row.mmr !== null && (
                    <span className="text-xs text-gray-400 ml-1">{row.mmr} MMR</span>
                  )}
                </div>
              )}

              {/* Stat Pills */}
              <div className="flex flex-wrap gap-2">
                <StatPill label="KOs Dealt" value={row.enemyKOs} />
                <StatPill label="KOs Taken" value={row.ownKOs} />
                {isMe && !row.isSparring && (
                  <>
                    <StatPill label="⚡️" value={`+${row.xpAwarded}`} />
                    <StatPill label="💰 Credits" value={`+${row.creditsAwarded}`} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {/* Rematch — same team, new lobby */}
        <button
          onClick={handleRematch}
          disabled={rematching}
          className="flex-1 text-center bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold transition"
        >
          {rematching ? "Creating…" : "🔄 Rematch"}
        </button>

        {isSparring ? (
          <Link
            href="/practice"
            className="flex-1 text-center bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition"
          >
            🥊 Spar Again
          </Link>
        ) : (
          <Link
            href="/matches/new"
            className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
          >
            New Match
          </Link>
        )}

        <Link
          href={isSparring ? "/practice/history" : "/matches"}
          className="flex-1 text-center border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-semibold transition"
        >
          Match History
        </Link>
      </div>

      {/* Spectate replay */}
      <Link
        href={`/matches/${summary.matchUuid}/spectate`}
        className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-semibold transition"
      >
        🎬 Watch Replay
      </Link>

      {rematchError && (
        <p className="text-sm text-red-500 text-center mt-2">{rematchError}</p>
      )}
    </div>
  );
}
