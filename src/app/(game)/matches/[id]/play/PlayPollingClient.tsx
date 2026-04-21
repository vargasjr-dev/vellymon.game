"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getGameStateAction, submitCommandsAction, type PlayCommand } from "./actions";

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
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [yourTeam, setYourTeam] = useState<TeamDisplay | null>(null);
  const [opponentTeam, setOpponentTeam] = useState<TeamDisplay | null>(null);
  const [boardWidth, setBoardWidth] = useState(8);
  const [boardHeight, setBoardHeight] = useState(5);
  const [commandsSubmitted, setCommandsSubmitted] = useState(false);
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
          }>;
          bench: unknown[];
          knocked: unknown[];
        }>;
        boardWidth: number;
        boardHeight: number;
        result: { winner: 1 | 2; condition: string } | null;
        phase: string;
      };

      setTurn(gs.turn);
      setBoardWidth(gs.boardWidth);
      setBoardHeight(gs.boardHeight);

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

      setGameState(data.gameState);
    },
    [userId],
  );

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

  const handleSubmitCommands = useCallback(
    async (commands: PlayCommand[]) => {
      try {
        const result = await submitCommandsAction(matchUuid, commands);
        setCommandsSubmitted(true);
        if (result.resolved) {
          // Refresh state after turn resolves
          const data = await getGameStateAction(matchUuid);
          parseState(data);
          setCommandsSubmitted(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit commands");
      }
    },
    [matchUuid, parseState],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading match...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <Link
            href={`/matches/${matchUuid}`}
            className="text-blue-400 hover:underline"
          >
            Back to match
          </Link>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Link href={`/matches/${matchUuid}`} className="text-gray-400 text-sm hover:text-white">
          ← Back
        </Link>
        <span className="text-gray-400 text-sm">Turn {turn}</span>
      </div>

      {/* Team HUDs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {yourTeam && <TeamHUD team={yourTeam} label="Your Team" isYours />}
        {opponentTeam && <TeamHUD team={opponentTeam} label="Opponent" isYours={false} />}
      </div>

      {/* Board */}
      <div className="mb-6">
        <Board
          width={boardWidth}
          height={boardHeight}
          yourTeam={yourTeam}
          opponentTeam={opponentTeam}
        />
      </div>

      {/* Command Area */}
      <div className="max-w-2xl mx-auto">
        {commandsSubmitted ? (
          <div className="text-center py-4">
            <p className="text-yellow-400 animate-pulse">
              ⏳ Waiting for opponent...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 text-center mb-2">
              Select commands for your vellymons
            </p>
            {yourTeam?.active
              .filter((v) => !v.isKO)
              .map((v) => (
                <VellymonCommandRow
                  key={v.uuid}
                  vellymon={v}
                  onSubmit={(cmd) => handleSubmitCommands([cmd])}
                />
              ))}
            <button
              onClick={() => handleSubmitCommands([])}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
            >
              End Turn (skip all)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TeamHUD({
  team,
  label,
  isYours,
}: {
  team: TeamDisplay;
  label: string;
  isYours: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 border ${isYours ? "border-blue-500/30 bg-blue-950/30" : "border-red-500/30 bg-red-950/30"}`}
    >
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-bold">{team.name}</p>
      <div className="flex gap-3 mt-1 text-xs text-gray-300">
        <span>⚡{team.energy}</span>
        <span>🗡️{team.active.filter((v) => !v.isKO).length} active</span>
        <span>📦{team.benchCount} bench</span>
        <span>💀{team.knockedCount} KO</span>
      </div>
    </div>
  );
}

function Board({
  width,
  height,
  yourTeam,
  opponentTeam,
}: {
  width: number;
  height: number;
  yourTeam: TeamDisplay | null;
  opponentTeam: TeamDisplay | null;
}) {
  const allVellymons = [
    ...(yourTeam?.active.map((v) => ({ ...v, teamId: yourTeam.id })) ?? []),
    ...(opponentTeam?.active.map((v) => ({ ...v, teamId: opponentTeam.id })) ?? []),
  ];

  return (
    <div className="flex justify-center">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => {
            const vellymon = allVellymons.find(
              (v) => v.x === x && v.y === y && !v.isKO,
            );
            const isYoursCell = vellymon && yourTeam && vellymon.teamId === yourTeam.id;

            return (
              <div
                key={`${x}-${y}`}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded border text-[10px] flex flex-col items-center justify-center ${
                  vellymon
                    ? isYoursCell
                      ? "bg-blue-900/50 border-blue-500/50"
                      : "bg-red-900/50 border-red-500/50"
                    : "bg-gray-900/50 border-gray-800"
                }`}
              >
                {vellymon ? (
                  <>
                    <span className="font-bold truncate w-full text-center px-0.5">
                      {vellymon.name.slice(0, 4)}
                    </span>
                    <span className="text-gray-300">
                      {vellymon.hp}/{vellymon.maxHp}
                    </span>
                  </>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function VellymonCommandRow({
  vellymon,
  onSubmit,
}: {
  vellymon: VellymonDisplay;
  onSubmit: (cmd: PlayCommand) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-2">
      <div className="flex-1">
        <span className="font-bold text-sm">{vellymon.name}</span>
        <span className="text-xs text-gray-400 ml-2">
          HP {vellymon.hp}/{vellymon.maxHp} | SPD {vellymon.speed}
        </span>
      </div>
      <div className="flex gap-1">
        {(["up", "down", "left", "right"] as const).map((dir) => (
          <button
            key={dir}
            onClick={() =>
              onSubmit({
                type: "move",
                vellymonUuid: vellymon.uuid,
                direction: dir,
              })
            }
            className="w-7 h-7 text-xs bg-gray-800 rounded hover:bg-gray-700"
            title={`Move ${dir}`}
          >
            {dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "left" ? "←" : "→"}
          </button>
        ))}
        <button
          onClick={() =>
            onSubmit({ type: "harvest", vellymonUuid: vellymon.uuid })
          }
          className="px-2 h-7 text-xs bg-yellow-800 rounded hover:bg-yellow-700"
        >
          ⚡
        </button>
      </div>
    </div>
  );
}
