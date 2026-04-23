"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getGameStateAction, submitCommandsAction, concedeAction, type PlayCommand } from "./actions";
import { useRouter } from "next/navigation";
import VictoryModal from "./VictoryModal";

const BattleCanvas = dynamic(() => import("./BattleCanvas"), { ssr: false });
import TurnHistory, { type TurnSnapshot } from "./TurnHistory";

type Dir = "up" | "down" | "left" | "right";

/**
 * Translate a screen-space direction to a game-space direction.
 *
 * In landscape, screen = game (no transform).
 * In portrait the board is rotated so:
 *   Team 1 (x=0 spawns at bottom): screen↑ = game right, screen← = game up
 *   Team 2 (x=8 spawns at bottom): screen↑ = game left, screen← = game down
 */
function screenToGameDir(screenDir: Dir, isPortrait: boolean, teamId: 1 | 2): Dir {
  if (!isPortrait) return screenDir;

  if (teamId === 1) {
    const map: Record<Dir, Dir> = { up: "right", down: "left", left: "up", right: "down" };
    return map[screenDir];
  } else {
    const map: Record<Dir, Dir> = { up: "left", down: "right", left: "down", right: "up" };
    return map[screenDir];
  }
}

/** Reverse: game-space direction → screen arrow symbol for display */
function gameDirToScreenArrow(gameDir: Dir, isPortrait: boolean, teamId: 1 | 2): string {
  const arrows: Record<Dir, string> = { up: "↑", down: "↓", left: "←", right: "→" };
  if (!isPortrait) return arrows[gameDir];

  // Invert the screen→game mapping
  if (teamId === 1) {
    const map: Record<Dir, Dir> = { right: "up", left: "down", up: "left", down: "right" };
    return arrows[map[gameDir]];
  } else {
    const map: Record<Dir, Dir> = { left: "up", right: "down", down: "left", up: "right" };
    return arrows[map[gameDir]];
  }
}

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

type RawTeam = {
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
};

function mapTeam(t: RawTeam): TeamDisplay {
  return {
    id: t.id,
    name: t.name,
    energy: t.energy,
    active: t.active.map((v) => ({
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
    benchCount: t.bench.length,
    knockedCount: t.knocked.length,
  };
}

export default function PlayPollingClient({ matchUuid, userId }: Props) {
  const [isPortrait, setIsPortrait] = useState(false);

  // Track orientation
  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [loading, setLoading] = useState(true);
  const [turnHistory, setTurnHistory] = useState<TurnSnapshot[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
  const [showVictory, setShowVictory] = useState<{ winner: string; condition: string } | null>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [teams, setTeams] = useState<[TeamDisplay, TeamDisplay] | null>(null);
  const [boardWidth, setBoardWidth] = useState(8);
  const [boardHeight, setBoardHeight] = useState(5);
  const [boardSpaces, setBoardSpaces] = useState<
    Array<{ x: number; y: number; type: string; occupationCounter?: number }>
  >([]);
  const [selectedVellymon, setSelectedVellymon] = useState<string | null>(null);
  const [pendingCommands, setPendingCommands] = useState<PlayCommand[]>([]);
  const [gameOver, setGameOver] = useState<{
    winner: string;
    condition: string;
  } | null>(null);

  // Admin play-both-sides: track which team we're currently commanding
  const [activeTeamId, setActiveTeamId] = useState<1 | 2>(1);
  const [waitingForSwitch, setWaitingForSwitch] = useState(false);

  // We track raw team userIds to detect admin matches (same user on both teams)
  const [rawUserIds, setRawUserIds] = useState<[string, string] | null>(null);
  const isAdminSelfMatch = rawUserIds ? rawUserIds[0] === rawUserIds[1] : false;

  // Your team = the one you're currently commanding
  const yourTeam = useMemo(() => {
    if (!teams) return null;
    if (isAdminSelfMatch) {
      return teams.find((t) => t.id === activeTeamId) ?? teams[0];
    }
    return teams.find((t) => t.id === activeTeamId) ?? teams[0];
  }, [teams, activeTeamId, isAdminSelfMatch]);

  const opponentTeam = useMemo(() => {
    if (!teams) return null;
    if (isAdminSelfMatch) {
      return teams.find((t) => t.id !== activeTeamId) ?? teams[1];
    }
    return teams.find((t) => t.id !== activeTeamId) ?? teams[1];
  }, [teams, activeTeamId, isAdminSelfMatch]);

  const parseState = useCallback(
    (data: { gameState: Record<string, unknown>; status: string; turnHistory?: TurnSnapshot[] } | null) => {
      if (!data?.gameState) return;

      // Update turn history if provided
      if (data.turnHistory && data.turnHistory.length > 0) {
        setTurnHistory(data.turnHistory);
      }

      const gs = data.gameState as {
        turn: number;
        teams: RawTeam[];
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

      // Store raw userIds for admin detection
      if (gs.teams.length >= 2) {
        setRawUserIds([gs.teams[0].userId, gs.teams[1].userId]);
      }

      // Figure out which team this user belongs to
      const userTeam = gs.teams.find((t) => t.userId === userId);
      if (userTeam && !isAdminSelfMatch) {
        // Normal match: lock activeTeamId to user's team
        setActiveTeamId(userTeam.id);
      }

      const t1 = mapTeam(gs.teams[0]);
      const t2 = gs.teams[1] ? mapTeam(gs.teams[1]) : t1;
      setTeams([t1, t2]);

      if (gs.result) {
        const winnerName = gs.teams.find((t) => t.id === gs.result!.winner)?.name ?? `Team ${gs.result.winner}`;
        setGameOver({
          winner: winnerName,
          condition: gs.result.condition,
        });
        // Trigger victory modal if not already showing
        setShowVictory((prev) => prev ?? { winner: winnerName, condition: gs.result!.condition });
      }
    },
    [userId, isAdminSelfMatch],
  );

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Poll game state
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

  // Add command for a vellymon, then auto-deselect so user can pick the next one
  const addCommand = useCallback((cmd: PlayCommand) => {
    setPendingCommands((prev) => {
      const filtered = prev.filter((c) => c.vellymonUuid !== cmd.vellymonUuid);
      return [...filtered, cmd];
    });
    setSelectedVellymon(null);
  }, []);

  // Wrap addCommand with screen→game direction translation
  const addDirectionalCommand = useCallback(
    (type: "move" | "attack", vellymonUuid: string, screenDir: Dir) => {
      const gameDir = screenToGameDir(screenDir, isPortrait, yourTeam?.id ?? 1);
      addCommand({ type, vellymonUuid, direction: gameDir });
    },
    [addCommand, isPortrait, yourTeam?.id],
  );

  const handleSubmitTurn = useCallback(async () => {
    try {
      const result = await submitCommandsAction(
        matchUuid,
        pendingCommands,
        isAdminSelfMatch ? activeTeamId : undefined,
      );
      setPendingCommands([]);
      setSelectedVellymon(null);

      if (isAdminSelfMatch && activeTeamId === 1) {
        // Admin match: switch to P2's perspective
        setActiveTeamId(2);
        setWaitingForSwitch(true);
        setTimeout(() => setWaitingForSwitch(false), 500);
      } else if (result.resolved) {
        // Turn resolved — refresh state
        const data = await getGameStateAction(matchUuid);
        parseState(data);
        if (isAdminSelfMatch) {
          setActiveTeamId(1); // Reset to P1 for next turn
        }
      } else if (isAdminSelfMatch && activeTeamId === 2) {
        // P2 submitted in admin match — turn should resolve now
        const data = await getGameStateAction(matchUuid);
        parseState(data);
        setActiveTeamId(1); // Reset to P1 for next turn
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit commands");
    }
  }, [matchUuid, pendingCommands, parseState, isAdminSelfMatch, activeTeamId]);

  const handleConcede = useCallback(async () => {
    try {
      const result = await concedeAction(
        matchUuid,
        isAdminSelfMatch ? activeTeamId : undefined,
      );
      setShowConcedeConfirm(false);
      setShowVictory({ winner: result.winner, condition: result.condition });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to concede");
      setShowConcedeConfirm(false);
    }
  }, [matchUuid, isAdminSelfMatch, activeTeamId]);

  // Build all vellymons for the canvas
  const allVellymons = useMemo(() => [
    ...(teams?.[0]?.active.map((v) => ({ ...v, teamId: teams[0].id as 1 | 2 })) ?? []),
    ...(teams?.[1]?.active.map((v) => ({ ...v, teamId: teams[1].id as 1 | 2 })) ?? []),
  ], [teams]);

  const selectedVm = yourTeam?.active.find((v) => v.uuid === selectedVellymon && !v.isKO);
  const pendingForSelected = pendingCommands.find((c) => c.vellymonUuid === selectedVellymon);

  // Vellymons that have pending commands (for board indicators)
  const commandedUuids = useMemo(
    () => new Set(pendingCommands.map((c) => c.vellymonUuid)),
    [pendingCommands],
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0f1a] text-white flex flex-col">
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading match...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <p className="text-red-400 mb-4">{error}</p>
            <Link href={`/matches/${matchUuid}`} className="text-blue-400 hover:underline">
              Back to match
            </Link>
          </div>
        </div>
      )}

      {gameOver && !showVictory && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h1 className="text-4xl font-bold mb-4">🏆 Game Over</h1>
            <p className="text-xl mb-2">
              <span className="text-yellow-400">{gameOver.winner}</span> wins!
            </p>
            <p className="text-gray-400 mb-6 capitalize">Victory by {gameOver.condition}</p>
            <Link href={`/matches/${matchUuid}`} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
              Match Results
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && !gameOver && (
        <>
          {/* ─── Top bar ─── */}
          <div className="flex justify-between items-center px-4 py-2 shrink-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/matches/${matchUuid}`}
                className="text-gray-400 text-sm hover:text-white bg-black/40 px-3 py-1.5 rounded-lg"
              >
                ← Back
              </Link>
              <button
                onClick={() => setShowConcedeConfirm(true)}
                className="text-red-400 text-sm bg-red-950/40 hover:bg-red-900/60 active:bg-red-800/60 px-3 py-1.5 rounded-lg border border-red-800/30 transition"
              >
                Concede
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isAdminSelfMatch && (
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                  Playing as Team {activeTeamId}
                </span>
              )}
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="text-gray-300 text-sm bg-black/40 px-3 py-1.5 rounded-lg font-mono hover:bg-black/60 active:bg-black/80 transition flex items-center gap-1"
              >
                Turn {turn}
                {turnHistory.length > 0 && (
                  <span className="text-[10px] text-gray-500">▼</span>
                )}
              </button>
            </div>
          </div>

          {/* ─── Team HUDs ─── */}
          <div className="flex gap-2 px-3 pb-2 shrink-0">
            {yourTeam && (
              <div className="flex-1 bg-blue-950/60 border border-blue-500/30 rounded-lg px-3 py-1.5">
                <p className="font-bold text-sm truncate">{yourTeam.name}</p>
                <div className="flex gap-2 text-xs text-gray-300">
                  <span>⚡{yourTeam.energy}</span>
                  <span>🗡️{yourTeam.active.filter((v) => !v.isKO).length}</span>
                  <span>💀{yourTeam.knockedCount}</span>
                </div>
              </div>
            )}
            {opponentTeam && (
              <div className="flex-1 bg-red-950/60 border border-red-500/30 rounded-lg px-3 py-1.5">
                <p className="font-bold text-sm truncate">{opponentTeam.name}</p>
                <div className="flex gap-2 text-xs text-gray-300">
                  <span>⚡{opponentTeam.energy}</span>
                  <span>🗡️{opponentTeam.active.filter((v) => !v.isKO).length}</span>
                  <span>💀{opponentTeam.knockedCount}</span>
                </div>
              </div>
            )}
          </div>

          {/* ─── Canvas (flex-1, never overlapped by command panel) ─── */}
          <div className="flex-1 relative min-h-0">
            <BattleCanvas
              boardWidth={boardWidth}
              boardHeight={boardHeight}
              spaces={boardSpaces}
              vellymons={allVellymons}
              yourTeamId={yourTeam?.id ?? 1}
              selectedVellymon={selectedVellymon}
              onSelectVellymon={setSelectedVellymon}
              commandedUuids={commandedUuids}
            />
          </div>

          {/* ─── Command panel (below canvas, not overlapping) ─── */}
          <div className="shrink-0 bg-[#0c1220] border-t border-gray-800 px-4 py-3">
            {waitingForSwitch ? (
              <div className="text-center py-2">
                <p className="text-purple-400 text-sm animate-pulse">
                  Switching to Team {activeTeamId}...
                </p>
              </div>
            ) : selectedVm ? (
              <div className="space-y-2">
                {/* Selected vellymon info + dismiss + queued badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold truncate">{selectedVm.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {selectedVm.hp}/{selectedVm.maxHp}
                    </span>
                    {pendingForSelected && (
                      <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded shrink-0">
                        {pendingForSelected.type} {pendingForSelected.direction ? gameDirToScreenArrow(pendingForSelected.direction, isPortrait, yourTeam?.id ?? 1) : ""}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedVellymon(null)}
                    className="text-gray-500 hover:text-white text-sm px-2 shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* Compact action grid: Move | Attack | Harvest all visible */}
                <div className="flex gap-2 items-start">
                  {/* Move — 4 directional buttons */}
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 mb-1 text-center">MOVE</p>
                    <div className="grid grid-cols-4 gap-1">
                      {(["up", "down", "left", "right"] as const).map((dir) => (
                        <button
                          key={`move-${dir}`}
                          onClick={() => addDirectionalCommand("move", selectedVm.uuid, dir)}
                        className="h-9 text-base bg-gray-800 rounded hover:bg-gray-700 active:bg-gray-600 transition"
                        >
                          {dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "left" ? "←" : "→"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Attack — 4 directional buttons */}
                  <div className="flex-1">
                    <p className="text-[10px] text-red-400 mb-1 text-center">ATTACK</p>
                    <div className="grid grid-cols-4 gap-1">
                      {(["up", "down", "left", "right"] as const).map((dir) => (
                        <button
                          key={`atk-${dir}`}
                          onClick={() => addDirectionalCommand("attack", selectedVm.uuid, dir)}
                        className="h-9 text-base bg-red-950 rounded hover:bg-red-900 active:bg-red-800 transition border border-red-800/50"
                        >
                          {dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "left" ? "←" : "→"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Harvest — single button */}
                  <div className="w-16 shrink-0">
                    <p className="text-[10px] text-yellow-500 mb-1 text-center">HARVEST</p>
                    <button
                      onClick={() => addCommand({ type: "harvest", vellymonUuid: selectedVm.uuid })}
                      className="w-full h-9 text-base bg-yellow-900/60 rounded hover:bg-yellow-800/60 active:bg-yellow-700/60 transition border border-yellow-700/30"
                    >
                      ⚡
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Pending commands summary */}
                {pendingCommands.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-2 justify-center">
                    {pendingCommands.map((cmd) => {
                      const vm = yourTeam?.active.find((v) => v.uuid === cmd.vellymonUuid);
                      return (
                        <button
                          key={cmd.vellymonUuid}
                          onClick={() => setSelectedVellymon(cmd.vellymonUuid)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300 transition"
                        >
                          {vm?.name?.slice(0, 8)}: {cmd.type} {cmd.direction ? gameDirToScreenArrow(cmd.direction, isPortrait, yourTeam?.id ?? 1) : ""}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500 mb-2">
                    Tap a vellymon to issue commands
                  </p>
                )}
              </div>
            )}

            {/* Submit button — always visible */}
            {!waitingForSwitch && (
              <button
                onClick={handleSubmitTurn}
                className={`w-full py-3 rounded-xl font-semibold transition text-base mt-1 ${
                  pendingCommands.length > 0
                    ? "bg-green-600 hover:bg-green-700 active:bg-green-800"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {pendingCommands.length > 0
                  ? `Submit Turn (${pendingCommands.length} command${pendingCommands.length > 1 ? "s" : ""})`
                  : "End Turn (skip all)"}
              </button>
            )}
          </div>
        </>
      )}

      {/* Turn History bottom sheet */}
      <TurnHistory
        history={turnHistory}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen(!historyOpen)}
      />

      {/* Concede confirmation dialog */}
      {showConcedeConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConcedeConfirm(false)} />
          <div className="relative bg-[#1a2035] border border-gray-700 rounded-2xl p-6 mx-6 max-w-sm w-full text-center">
            <h3 className="text-lg font-bold text-white mb-2">Concede Match?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Your opponent will be declared the winner. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConcedeConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConcede}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition"
              >
                Concede
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory celebration modal */}
      {showVictory && (
        <VictoryModal
          winner={showVictory.winner}
          condition={showVictory.condition}
          onComplete={() => {
            setShowVictory(null);
            router.push(`/matches/${matchUuid}`);
          }}
        />
      )}
    </div>
  );
}
