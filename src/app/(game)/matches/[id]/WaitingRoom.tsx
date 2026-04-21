"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "~/components/Toast";
import { getMatchAction, cancelMatchAction, startMatchAction } from "../actions";

type Player = {
  uuid: string;
  userId: string;
  userName: string | null;
  teamUuid: string;
  teamName: string | null;
  joinedAt: Date;
};

type MatchData = {
  uuid: string;
  status: string;
  createdAt: Date;
  createdBy: string;
  creatorName: string | null;
  currentPlayers: number;
  maxPlayers: number;
  players: Player[];
};

type WaitingRoomProps = {
  initialMatch: MatchData;
  currentUserId: string;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  waiting: { label: "Waiting", color: "bg-yellow-100 text-yellow-700" },
  ready: { label: "Ready", color: "bg-green-100 text-green-700" },
  playing: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600" },
};

export default function WaitingRoom({
  initialMatch,
  currentUserId,
}: WaitingRoomProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [match, setMatch] = useState<MatchData>(initialMatch);
  const [cancelling, setCancelling] = useState(false);
  const [starting, setStarting] = useState(false);

  const isCreator = match.createdBy === currentUserId;
  const isPlayer = match.players.some((p) => p.userId === currentUserId);
  const status = statusConfig[match.status] ?? {
    label: match.status,
    color: "bg-gray-100 text-gray-600",
  };

  // Poll for updates every 3 seconds while waiting
  const pollMatch = useCallback(async () => {
    const updated = await getMatchAction(match.uuid);
    if (updated) {
      setMatch(updated);
    }
  }, [match.uuid]);

  useEffect(() => {
    if (match.status !== "waiting" && match.status !== "ready") return;
    const interval = setInterval(pollMatch, 3000);
    return () => clearInterval(interval);
  }, [match.status, pollMatch]);

  const handleCancel = async () => {
    setCancelling(true);
    const result = await cancelMatchAction(match.uuid);
    if (result.success) {
      addToast("Match cancelled", "success");
      router.push("/matches");
      router.refresh();
    } else {
      addToast(result.message, "error");
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/matches"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2 inline-block"
          >
            ← Back to Matches
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {match.status === "waiting"
              ? "Waiting for Opponent"
              : match.status === "ready"
                ? "Match Ready!"
                : match.status === "playing"
                  ? "Match in Progress"
                  : match.status === "cancelled"
                    ? "Match Cancelled"
                    : "Match"}
          </h1>
        </div>
        <span
          className={`text-sm font-medium px-3 py-1 rounded-full ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      {/* Waiting pulse */}
      {match.status === "waiting" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          <p className="text-sm text-yellow-800">
            Waiting for an opponent to join. Share the match link or wait for
            someone to find it in the lobby.
          </p>
        </div>
      )}

      {/* Ready banner */}
      {match.status === "ready" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <div>
            <p className="text-sm font-semibold text-green-800">
              Both players are in! Match is ready.
            </p>
          </div>
        </div>
      )}

      {/* Players */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Players ({match.currentPlayers}/{match.maxPlayers})
        </h2>
        <div className="space-y-4">
          {match.players.map((player, idx) => (
            <div
              key={player.uuid}
              className={`border-2 rounded-lg p-4 ${
                idx === 0
                  ? "border-blue-200 bg-blue-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      idx === 0
                        ? "bg-blue-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    P{idx + 1}
                  </span>
                  <p className="font-semibold text-gray-900">
                    {player.userName ?? "Unknown"}
                    {player.userId === currentUserId && (
                      <span className="text-xs text-gray-500 ml-1">(You)</span>
                    )}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Team: <span className="font-medium">{player.teamName ?? "Unknown"}</span>
              </p>
            </div>
          ))}

          {/* Empty slot */}
          {match.currentPlayers < match.maxPlayers && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full animate-pulse mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                Waiting for opponent to join...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Match Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Match Info</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Created by</p>
            <p className="font-semibold text-gray-900">
              {match.creatorName ?? "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Match ID</p>
            <p className="font-mono text-xs text-gray-700">
              {match.uuid.slice(0, 8)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Format</p>
            <p className="font-semibold text-gray-900">1v1</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-semibold text-gray-900 capitalize">
              {match.status}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {match.status === "waiting" && !isPlayer && (
          <Link
            href={`/matches/${match.uuid}/join`}
            className="block w-full text-center bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Join This Match
          </Link>
        )}

        {match.status === "waiting" && isCreator && (
          <Link
            href={`/matches/${match.uuid}/join?pbs=true`}
            className="block w-full text-center bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            ⚔️ Play Both Sides (Playtest)
          </Link>
        )}

        {match.status === "ready" && isPlayer && (
          <button
            onClick={async () => {
              setStarting(true);
              const result = await startMatchAction(match.uuid);
              if (result.success) {
                router.push(`/matches/${match.uuid}/play`);
              } else {
                addToast(result.message ?? "Failed to start", "error");
                setStarting(false);
              }
            }}
            disabled={starting}
            className="block w-full text-center bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {starting ? "Starting..." : "⚔️ Start Match"}
          </button>
        )}

        {match.status === "playing" && isPlayer && (
          <Link
            href={`/matches/${match.uuid}/play`}
            className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Enter Battle
          </Link>
        )}

        {match.status === "waiting" && isCreator && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="block w-full text-center border border-red-300 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-50 transition disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Match"}
          </button>
        )}
      </div>
    </div>
  );
}
