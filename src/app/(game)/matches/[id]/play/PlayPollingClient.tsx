"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getGameStateAction, submitCommandsAction, type PlayCommand } from "./actions";

// Lazy-load PixiJS canvas (no SSR — needs window/document)
const BattleCanvas = dynamic(() => import("./BattleCanvas"), { ssr: false });

type Props = {
  matchUuid: string;
  userId: string;
  playerTeamName: string;
};

type VellymonDisplay = {
  uuid: string;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  x: number;
  y: number;
  isKO: boolean;
  imageUrl?: string;
};

type TeamDisplay = {
  id: 1 | 2;
  name: string;
  energy: number;
  active: VellymonDisplay[];
  benchCount: number;
  knockedCount: number;
};

export default function PlayPollingClient({
  matchUuid,
  userId,
  playerTeamName,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [yourTeam, setYourTeam] = useState<TeamDisplay | null>(null);
  const [opponentTeam, setOpponentTeam] = useState<TeamDisplay | null>(null);
  const [boardWidth, setBoardWidth] = useState(8);
  const [boardHeight, setBoardHeight] = useState(5);
  const [boardSpaces, setBoardSpaces] = useState<
    Array<{ x: number; y: number; type: string; occupationCounter?: number }>
  >([]);
  const [commandsSubmitted, setCommandsSubmitted] = useState(false);
  const [selectedVellymon, setSelectedVellymon] = useState<string | null>(null);
  const [pendingCommands, setPendingCommands] = useState<PlayCommand[]>([]);
  const [gameOver, setGameOver] = useState<{
    winner: string;
    condition: string;
  } | null>(null);

  const parseState = useCallback(
    (data: { gameState: Record<string, unknown>; status: string } | null) => {
      if (!data?.gameState) return;

      const gs = data.gameState as {
        turn: number;
        teams: Array<{
          id: 1 | 2;
          userId: string;
          name: string;
          energy: number;
          active: Array<{
              uuid: string;
              name: string;
              hp: number;
              maxHp: number;
              speed: number;
              attack: number;
              position: { x: number; y: number } | null;
              isKO: boolean;
              imageUrl?: string;
            }>;
            bench: unknown[];
            knocked: unknown[];
        }>;
        boardWidth: number;
        boardHeight: number;
        board: Array<{
          position: { x: number; y: number };
          type: string;
          occupationCounter?: number;
        }>;
        result: { winner: 1 | 2; condition: string } | null;
        phase: string;
      };

      setTurn(gs.turn);
      setBoardWidth(gs.boardWidth);
      setBoardHeight(gs.boardHeight);
      setBoardSpaces(
        gs.board?.map((s) => ({
          x: s.position.x,
          y: s.position.y,
          type: s.type,
          occupationCounter: s.occupationCounter,
        })) ?? [],
      );

      const yours = gs.teams.find((t) => t.userId === userId);
      const opponent = gs.teams.find((t) => t.userId !== userId);

      // For admin play-both-sides, pick team 1 as "yours"
      const yourTeamData = yours ?? gs.teams[0];
      const oppTeamData = opponent ?? gs.teams[1];

      if (yourTeamData) {
        setYourTeam({
          id: yourTeamData.id,
          name: yourTeamData.name,
          energy: yourTeamData.energy,
          active: yourTeamData.active.map((v) => ({
            uuid: v.uuid,
            name: v.name,
            hp: v.hp,
            maxHp: v.maxHp,
            speed: v.speed,
            attack: v.attack,
            x: v.position?.x ?? 0,
            y: v.position?.y ?? 0,
            isKO: v.isKO,
            imageUrl: v.imageUrl,
          })),
          benchCount: yourTeamData.bench.length,
          knockedCount: yourTeamData.knocked.length,
        });
      }

      if (oppTeamData) {
        setOpponentTeam({
          id: oppTeamData.id,
          name: oppTeamData.name,
          energy: oppTeamData.energy,
          active: oppTeamData.active.map((v) => ({
              uuid: v.uuid,
              name: v.name,
              hp: v.hp,
              maxHp: v.maxHp,
              speed: v.speed,
              attack: v.attack,
              x: v.position?.x ?? 0,
              y: v.position?.y ?? 0,
              isKO: v.isKO,
              imageUrl: v.imageUrl,
            })),
            benchCount: oppTeamData.bench.length,
            knockedCount: oppTeamData.knocked.length,
        });
      }

      if (gs.result) {
        const winnerTeam = gs.teams.find((t) => t.id === gs.result!.winner);
        setGameOver({
          winner: winnerTeam?.name ?? `Team ${gs.result.winner}`,
          condition: gs.result.condition,
        });
      }
    },
    [userId],
  );

  // Lock body scroll on mount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Poll for game state
  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const data = await getGameStateAction(matchUuid);
        if (active) {
          parseState(data);
          setLoading(false);
          setError(null);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load game state");
          setLoading(false);
        }
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [matchUuid, parseState]);

  const addCommand = useCallback((cmd: PlayCommand) => {
    setPendingCommands((prev) => {
      // Replace existing command for same vellymon
      const filtered = prev.filter((c) => c.vellymonUuid !== cmd.vellymonUuid);
      return [...filtered, cmd];
    });
  }, []);

  const handleSubmitTurn = useCallback(async () => {
    try {
      const result = await submitCommandsAction(matchUuid, pendingCommands);
      setCommandsSubmitted(true);
      setPendingCommands([]);
      setSelectedVellymon(null);
      if (result.resolved) {
        const data = await getGameStateAction(matchUuid);
        parseState(data);
        setCommandsSubmitted(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit commands");
    }
  }, [matchUuid, pendingCommands, parseState]);

  // Build vellymons list with team IDs for the canvas
  const allVellymons = [
    ...(yourTeam?.active.map((v) => ({ ...v, teamId: yourTeam.id as 1 | 2 })) ?? []),
    ...(opponentTeam?.active.map((v) => ({ ...v, teamId: opponentTeam.id as 1 | 2 })) ?? []),
  ];

  const selectedVm = yourTeam?.active.find((v) => v.uuid === selectedVellymon && !v.isKO);
  const pendingForSelected = pendingCommands.find((c) => c.vellymonUuid === selectedVellymon);

  // Fullscreen overlay — covers navbar
  return (
    <div className="fixed inset-0 z-50 bg-[#0a0f1a] text-white flex flex-col">
      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading match...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              href={`/matches/${matchUuid}`}
              className="text-blue-400 hover:underline"
            >
              Back to match
            </Link>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h1 className="text-4xl font-bold mb-4">🏆 Game Over</h1>
            <p className="text-xl mb-2">
              <span className="text-yellow-400">{gameOver.winner}</span> wins!
            </p>
            <p className="text-gray-400 mb-6 capitalize">
              Victory by {gameOver.condition}
            </p>
            <Link
              href="/player"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      )}

      {/* Main game view */}
      {!loading && !error && !gameOver && (
        <>
          {/* Top bar — minimal, overlays the canvas */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-3">
            <Link
              href={`/matches/${matchUuid}`}
              className="text-gray-400 text-sm hover:text-white bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm"
            >
              ← Back
            </Link>
            <span className="text-gray-300 text-sm bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm font-mono">
              Turn {turn}
            </span>
          </div>

          {/* Team HUDs — your team first (left), opponent second (right) */}
          <div className="absolute top-12 left-0 right-0 z-10 flex gap-2 px-3">
            {yourTeam && (
              <div className="flex-1 bg-blue-950/60 border border-blue-500/30 rounded-lg px-3 py-2 backdrop-blur-sm">
                <p className="font-bold text-sm truncate">{yourTeam.name}</p>
                <div className="flex gap-2 text-xs text-gray-300">
                  <span>⚡{yourTeam.energy}</span>
                  <span>🗡️{yourTeam.active.filter((v) => !v.isKO).length}</span>
                  <span>💀{yourTeam.knockedCount}</span>
                </div>
              </div>
            )}
            {opponentTeam && (
              <div className="flex-1 bg-red-950/60 border border-red-500/30 rounded-lg px-3 py-2 backdrop-blur-sm">
                <p className="font-bold text-sm truncate">{opponentTeam.name}</p>
                <div className="flex gap-2 text-xs text-gray-300">
                  <span>⚡{opponentTeam.energy}</span>
                  <span>🗡️{opponentTeam.active.filter((v) => !v.isKO).length}</span>
                  <span>💀{opponentTeam.knockedCount}</span>
                </div>
              </div>
            )}
          </div>

          {/* PixiJS Canvas — fills the middle */}
          <div className="flex-1 relative mt-24 mb-44">
            <BattleCanvas
              boardWidth={boardWidth}
              boardHeight={boardHeight}
              spaces={boardSpaces}
              vellymons={allVellymons}
              yourTeamId={yourTeam?.id ?? 1}
              selectedVellymon={selectedVellymon}
              onSelectVellymon={setSelectedVellymon}
            />
          </div>

          {/* Bottom command panel */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/95 to-transparent pt-8 pb-6 px-4">
            {commandsSubmitted ? (
              <div className="text-center py-3">
                <p className="text-yellow-400 animate-pulse text-sm">
                  ⏳ Waiting for opponent...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Selected vellymon actions */}
                {selectedVm ? (
                  <div className="bg-blue-950/60 border border-blue-500/30 rounded-xl p-3 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold">{selectedVm.name}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          HP {selectedVm.hp}/{selectedVm.maxHp} · ATK {selectedVm.attack} · SPD {selectedVm.speed}
                        </span>
                      </div>
                      {pendingForSelected && (
                        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                          {pendingForSelected.type} {pendingForSelected.direction ?? ""}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Move buttons */}
                      <div className="flex gap-1">
                        {(["up", "down", "left", "right"] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => addCommand({ type: "move", vellymonUuid: selectedVm.uuid, direction: dir })}
                            className="w-10 h-10 text-lg bg-gray-800 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition"
                          >
                            {dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "left" ? "←" : "→"}
                          </button>
                        ))}
                      </div>
                      <div className="w-px bg-gray-700" />
                      {/* Attack */}
                      <button
                        onClick={() => addCommand({ type: "attack", vellymonUuid: selectedVm.uuid })}
                        className="h-10 px-4 text-sm bg-red-900 rounded-lg hover:bg-red-800 active:bg-red-700 transition font-semibold"
                      >
                        ⚔️ Attack
                      </button>
                      {/* Harvest */}
                      <button
                        onClick={() => addCommand({ type: "harvest", vellymonUuid: selectedVm.uuid })}
                        className="h-10 px-4 text-sm bg-yellow-900 rounded-lg hover:bg-yellow-800 active:bg-yellow-700 transition font-semibold"
                      >
                        ⚡ Harvest
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500">
                    Tap a vellymon on the board to issue commands
                  </p>
                )}

                {/* Pending commands summary */}
                {pendingCommands.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {pendingCommands.map((cmd) => {
                      const vm = yourTeam?.active.find((v) => v.uuid === cmd.vellymonUuid);
                      return (
                        <span key={cmd.vellymonUuid} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                          {vm?.name?.slice(0, 6)}: {cmd.type} {cmd.direction ?? ""}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Submit / Skip */}
                <button
                  onClick={handleSubmitTurn}
                  className={`w-full py-3.5 rounded-xl font-semibold transition text-lg ${
                    pendingCommands.length > 0
                      ? "bg-green-600 hover:bg-green-700 active:bg-green-800"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {pendingCommands.length > 0
                    ? `Submit Turn (${pendingCommands.length} command${pendingCommands.length > 1 ? "s" : ""})`
                    : "End Turn (skip all)"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
