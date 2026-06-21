"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "~/components/Toast";
import { queueForMatchAction } from "../matches/actions";
import type { RankSummary } from "../../../../lib/rank-rewards";
import type { Rank } from "../../../../lib/ranked";
import type { LeaderboardRow } from "./actions";

// ─── Rank display helpers ────────────────────────────────────────────────────

const RANK_EMOJI: Record<Rank, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💠",
  diamond: "💎",
  legend: "👑",
};

const RANK_BG: Record<Rank, string> = {
  bronze: "from-amber-50 to-orange-50 border-amber-200",
  silver: "from-slate-50 to-gray-100 border-slate-300",
  gold: "from-yellow-50 to-amber-50 border-yellow-300",
  platinum: "from-cyan-50 to-teal-50 border-cyan-300",
  diamond: "from-blue-50 to-indigo-50 border-blue-300",
  legend: "from-purple-50 to-pink-50 border-purple-300",
};

const RANK_COLOR: Record<Rank, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-500",
  gold: "text-yellow-600",
  platinum: "text-cyan-600",
  diamond: "text-blue-500",
  legend: "text-purple-600",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type VellymonSlot = {
  uuid: string;
  slotIndex: number;
  isActive: boolean;
  vellymon: {
    name: string;
    health: number;
    attack: number;
    speed: number;
    imageUrl?: string;
  } | null;
};

type Team = {
  uuid: string;
  name: string;
  slots: VellymonSlot[];
  activeCount: number;
};

type Props = {
  teams: Team[];
  summary: RankSummary | null;
  leaderboard: LeaderboardRow[];
  seasonName: string;
  starsPerRank: Record<Rank, number>;
};

const PAGE_SIZE = 6; // 2 rows × 3 cols

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarRow({ stars, max }: { stars: number; max: number }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`text-sm ${i < stars ? "opacity-100" : "opacity-20"}`}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}

function VellymonAvatar({
  slot,
  size = "md",
}: {
  slot: VellymonSlot;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "w-16 h-16" : size === "md" ? "w-10 h-10" : "w-7 h-7";
  const textClass =
    size === "lg" ? "text-xs" : size === "md" ? "text-[9px]" : "text-[7px]";

  return (
    <div
      className={`${sizeClass} rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative flex-shrink-0`}
      title={slot.vellymon?.name ?? "?"}
    >
      {slot.vellymon?.imageUrl ? (
        <Image
          src={slot.vellymon.imageUrl}
          alt={slot.vellymon.name}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-gray-500 font-bold ${textClass}`}
        >
          {slot.vellymon?.name?.slice(0, 3) ?? "?"}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RankedPlayPage({
  teams,
  summary,
  leaderboard,
  seasonName,
  starsPerRank,
}: Props) {
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedTeamUuid, setSelectedTeamUuid] = useState<string | null>(
    teams.length === 1 ? teams[0].uuid : null,
  );
  const [page, setPage] = useState(0);
  const [searching, setSearching] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const totalPages = Math.ceil(teams.length / PAGE_SIZE);
  const pagedTeams = teams.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedTeam = teams.find((t) => t.uuid === selectedTeamUuid) ?? null;

  const rank = summary?.rank ?? "bronze";
  const stars = summary?.stars ?? 0;
  const maxStars = starsPerRank[rank] ?? 3;

  const handleQueue = async () => {
    if (!selectedTeamUuid) {
      addToast("Select a team first", "error");
      return;
    }
    setSearching(true);
    try {
      const result = await queueForMatchAction(selectedTeamUuid);
      if (result.success) {
        if (result.matched) {
          addToast("Opponent found! Starting match…", "success");
          router.push(`/matches/${result.matchUuid}/play`);
        } else {
          addToast("Searching for an opponent…", "success");
          router.push(`/matches/${result.matchUuid}`);
        }
        router.refresh();
      } else {
        addToast(result.message, "error");
        setSearching(false);
      }
    } catch {
      addToast("Failed to queue for match", "error");
      setSearching(false);
    }
  };

  // ── No teams state ────────────────────────────────────────────────────────
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="text-6xl">⚔️</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No teams yet
          </h2>
          <p className="text-gray-600 mb-6">
            Build a team before entering the arena.
          </p>
          <Link
            href="/teams/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Build a Team
          </Link>
        </div>
      </div>
    );
  }

  // ── Leaderboard modal ─────────────────────────────────────────────────────
  if (showLeaderboard) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <button
          onClick={() => setShowLeaderboard(false)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition"
        >
          ← Back to Ranked
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🏆 {seasonName} — Leaderboard
        </h1>
        <p className="text-sm text-gray-500 mb-6">Top 50 players this season</p>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-gray-600">
                  #
                </th>
                <th className="py-3 px-4 text-left font-semibold text-gray-600">
                  Player
                </th>
                <th className="py-3 px-4 text-center font-semibold text-gray-600">
                  Rank
                </th>
                <th className="py-3 px-4 text-center font-semibold text-gray-600">
                  W/L
                </th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">
                  MMR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaderboard.map((entry, i) => (
                <tr key={entry.userId} className="hover:bg-gray-50 transition">
                  <td className="py-2.5 px-4 text-gray-400 font-mono">
                    {i + 1}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-gray-900">
                    {entry.username}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {RANK_EMOJI[entry.rank]}{" "}
                    {entry.rank !== "legend" && "⭐".repeat(entry.stars)}
                  </td>
                  <td className="py-2.5 px-4 text-center text-gray-600">
                    {entry.wins}/{entry.losses}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-gray-900">
                    {entry.mmr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-56px)] bg-gray-50">
      {/* ── LEFT: Team Picker ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:w-[58%] p-4 sm:p-6 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Choose Your Team</h1>
          <Link
            href="/matches"
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Match History →
          </Link>
        </div>

        {/* Team grid — 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          {pagedTeams.map((team) => {
            const isSelected = selectedTeamUuid === team.uuid;
            const activeSlots = team.slots.filter((s) => s.isActive);

            return (
              <button
                key={team.uuid}
                onClick={() => setSelectedTeamUuid(team.uuid)}
                disabled={searching}
                className={`relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                  isSelected
                    ? "border-blue-500 bg-white shadow-md ring-2 ring-blue-200"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                } disabled:opacity-50`}
              >
                {/* Team name */}
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {team.name}
                </p>

                {/* Vellymon avatar grid — 2×2 */}
                <div className="grid grid-cols-2 gap-1.5">
                  {activeSlots.slice(0, 4).map((slot) => (
                    <VellymonAvatar key={slot.uuid} slot={slot} size="md" />
                  ))}
                  {/* Empty placeholders */}
                  {Array.from({
                    length: Math.max(0, 4 - activeSlots.length),
                  }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="w-10 h-10 rounded-lg bg-gray-100 border border-dashed border-gray-200"
                    />
                  ))}
                </div>

                {/* Slot count */}
                <p className="text-[10px] text-gray-400">
                  {team.activeCount}/4 active ·{" "}
                  {team.slots.filter((s) => !s.isActive).length} bench
                </p>

                {/* Selected indicator */}
                {isSelected && (
                  <span className="absolute top-2 right-2 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}

          {/* Fill remaining grid slots so layout stays stable */}
          {pagedTeams.length < PAGE_SIZE &&
            Array.from({ length: PAGE_SIZE - pagedTeams.length }).map(
              (_, i) => <div key={`filler-${i}`} className="hidden sm:block" />,
            )}
        </div>

        {/* Pagination + edit link */}
        <div className="flex items-center justify-between pt-1">
          <Link
            href="/teams/new"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
          >
            + New team
          </Link>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 transition flex items-center justify-center text-xs"
              >
                ‹
              </button>
              <span className="text-xs text-gray-400">
                {page + 1}/{totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 transition flex items-center justify-center text-xs"
              >
                ›
              </button>
            </div>
          )}

          <Link
            href="/roster"
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Edit teams →
          </Link>
        </div>
      </div>

      {/* ── RIGHT: Rank + Preview + Play ────────────────────────────────── */}
      <div className="flex flex-col lg:w-[42%] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-4 sm:p-6 gap-5">
        {/* Rank card — clickable → leaderboard */}
        <button
          onClick={() => setShowLeaderboard(true)}
          className={`w-full text-left bg-gradient-to-br ${RANK_BG[rank]} border-2 rounded-xl p-4 transition hover:shadow-md group`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-label={rank}>
                {RANK_EMOJI[rank]}
              </span>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                  {seasonName}
                </p>
                <p
                  className={`text-xl font-bold capitalize ${RANK_COLOR[rank]}`}
                >
                  {rank}
                </p>
                {rank !== "legend" ? (
                  <StarRow stars={stars} max={maxStars} />
                ) : (
                  <p className="text-xs text-purple-500 font-semibold mt-1">
                    #{summary?.mmr ?? 1000} MMR
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">W/L</p>
              <p className="text-sm font-bold text-gray-700">
                {summary?.wins ?? 0}/{summary?.losses ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1 group-hover:text-blue-500 transition">
                Leaderboard →
              </p>
            </div>
          </div>
        </button>

        {/* Selected team preview */}
        <div className="flex-1 flex flex-col">
          {selectedTeam ? (
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedTeam.name}
                </h2>
                <span className="text-xs text-gray-400">
                  {selectedTeam.activeCount}/4 active
                </span>
              </div>

              {/* Active vellymons — enlarged */}
              <div className="grid grid-cols-2 gap-3 flex-1">
                {selectedTeam.slots
                  .filter((s) => s.isActive)
                  .map((slot) => (
                    <div
                      key={slot.uuid}
                      className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100"
                    >
                      <VellymonAvatar slot={slot} size="lg" />
                      <p className="text-xs font-semibold text-gray-700 text-center leading-tight">
                        {slot.vellymon?.name ?? "?"}
                      </p>
                      {slot.vellymon && (
                        <div className="flex gap-2 text-[9px] text-gray-400">
                          <span>❤️ {slot.vellymon.health}</span>
                          <span>⚔️ {slot.vellymon.attack}</span>
                          <span>⚡ {slot.vellymon.speed}</span>
                        </div>
                      )}
                    </div>
                  ))}

                {/* Empty active slots */}
                {Array.from({
                  length: Math.max(0, 4 - selectedTeam.activeCount),
                }).map((_, i) => (
                  <div
                    key={`empty-active-${i}`}
                    className="flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 min-h-[80px]"
                  >
                    <span className="text-gray-300 text-xs">Empty slot</span>
                  </div>
                ))}
              </div>

              {/* Bench preview */}
              {selectedTeam.slots.filter((s) => !s.isActive).length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-400 shrink-0">
                    Bench:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedTeam.slots
                      .filter((s) => !s.isActive)
                      .map((slot) => (
                        <VellymonAvatar key={slot.uuid} slot={slot} size="sm" />
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400 text-sm text-center">
                ← Select a team to preview
              </p>
            </div>
          )}
        </div>

        {/* Play button */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            onClick={handleQueue}
            disabled={searching || !selectedTeamUuid}
            className={`relative w-36 h-36 rounded-full font-black text-xl text-white shadow-xl transition-all
              ${
                selectedTeamUuid && !searching
                  ? "bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
              }
              ${selectedTeamUuid && !searching ? "animate-pulse" : ""}
            `}
          >
            {/* Outer ring when active */}
            {selectedTeamUuid && !searching && (
              <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
            )}
            <span className="relative">
              {searching ? (
                <span className="flex flex-col items-center gap-1 text-sm font-bold">
                  <span className="animate-spin text-2xl">⚙️</span>
                  Searching
                </span>
              ) : (
                "▶ Play"
              )}
            </span>
          </button>

          {!selectedTeamUuid && (
            <p className="text-xs text-gray-400">Select a team to play</p>
          )}
        </div>
      </div>
    </div>
  );
}
