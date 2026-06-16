"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  getGameStateAction,
  submitCommandsAction,
  concedeAction,
  getVellymonInfoAction,
  getMatchRewardsAction,
  type PlayCommand,
  type VellymonInfo,
  type MatchRewards,
} from "./actions";
import { useRouter } from "next/navigation";
import VictoryModal from "./VictoryModal";
import { useSoundEffects } from "./useSoundEffects";

const BattleCanvas = dynamic(() => import("./BattleCanvas"), { ssr: false });
import type { Overlays } from "./BattleCanvas";
import TurnHistory, { type TurnSnapshot } from "./TurnHistory";
import VellymonDrawer from "./VellymonDrawer";

type Dir = "up" | "down" | "left" | "right";

/**
 * Translate a screen-space direction to a game-space direction.
 *
 * In landscape, screen = game (no transform).
 * In portrait the board is rotated so:
 *   Team 1 (x=0 spawns at bottom): screen↑ = game right, screen← = game up
 *   Team 2 (x=8 spawns at bottom): screen↑ = game left, screen← = game down
 */
function screenToGameDir(
  screenDir: Dir,
  isPortrait: boolean,
  teamId: 1 | 2,
): Dir {
  if (!isPortrait) return screenDir;

  if (teamId === 1) {
    const map: Record<Dir, Dir> = {
      up: "right",
      down: "left",
      left: "up",
      right: "down",
    };
    return map[screenDir];
  } else {
    const map: Record<Dir, Dir> = {
      up: "left",
      down: "right",
      left: "down",
      right: "up",
    };
    return map[screenDir];
  }
}

/** Reverse: game-space direction → screen arrow symbol for display */
function gameDirToScreenArrow(
  gameDir: Dir,
  isPortrait: boolean,
  teamId: 1 | 2,
): string {
  const arrows: Record<Dir, string> = {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
  };
  if (!isPortrait) return arrows[gameDir];

  // Invert the screen→game mapping
  if (teamId === 1) {
    const map: Record<Dir, Dir> = {
      right: "up",
      left: "down",
      up: "left",
      down: "right",
    };
    return arrows[map[gameDir]];
  } else {
    const map: Record<Dir, Dir> = {
      left: "up",
      right: "down",
      down: "left",
      up: "right",
    };
    return arrows[map[gameDir]];
  }
}

type Props = {
  matchUuid: string;
  userId: string;
  playerTeamName: string;
};

type AttackDisplay = {
  name: string;
  damage: number;
  energyCost: number;
  range: number;
};

type VellymonDisplay = {
  uuid: string;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  attack: number;
  x: number;
  y: number;
  isKO: boolean;
  imageUrl?: string;
  attacks: AttackDisplay[];
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
      baseSpeed: number;
      attack: number;
      attacks?: AttackDisplay[];
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
      baseSpeed: v.baseSpeed,
      attack: v.attack,
      x: v.position?.x ?? 0,
      y: v.position?.y ?? 0,
      isKO: v.isKO,
      imageUrl: v.imageUrl,
      attacks: v.attacks ?? [],
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
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
  const [showVictory, setShowVictory] = useState<{
    winner: string;
    condition: string;
  } | null>(null);
  const [matchRewards, setMatchRewards] = useState<MatchRewards | null>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  /** Brief heal-label overlays shown on the board after each turn resolve */
  const [healOverlays, setHealOverlays] = useState<Overlays>({});
  const healOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [teams, setTeams] = useState<[TeamDisplay, TeamDisplay] | null>(null);
  const [boardWidth, setBoardWidth] = useState(8);
  const [boardHeight, setBoardHeight] = useState(5);
  const [boardSpaces, setBoardSpaces] = useState<
    Array<{
      x: number;
      y: number;
      type: string;
      occupationCounter?: number;
      harvestYield?: number;
    }>
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

  // Sparring (AI opponent) metadata
  const [isSparring, setIsSparring] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<string | null>(null);

  // Vellymon display metadata — fetched once from server (library + power registry)
  const [vellymonInfoCache, setVellymonInfoCache] = useState<
    Record<string, VellymonInfo>
  >({});
  const fetchedNamesRef = useRef<Set<string>>(new Set());

  // ─── Sound & animation ───────────────────────────────────────────────────
  const { play } = useSoundEffects();
  /** True while a turn submission is in-flight — shows "Submitting…" on button */
  const [submitting, setSubmitting] = useState(false);
  /** Briefly true after a turn resolves — pulses the Turn counter */
  const [turnFlash, setTurnFlash] = useState(false);
  /** Tracks previous KO counts to detect new KOs after turn resolve */
  const prevKnockedRef = useRef<{ t1: number; t2: number }>({ t1: 0, t2: 0 });
  /** Tracks whether victory/defeat sound has already been played */
  const resultSoundPlayedRef = useRef(false);

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
    (
      data: {
        gameState: Record<string, unknown>;
        status: string;
        turnHistory?: TurnSnapshot[];
        sparring?: boolean;
        aiDifficulty?: string | null;
      } | null,
    ) => {
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
          harvestYield?: number;
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
          harvestYield: s.harvestYield,
        })) ?? [],
      );

      // Store raw userIds for admin detection
      if (gs.teams.length >= 2) {
        setRawUserIds([gs.teams[0].userId, gs.teams[1].userId]);
      }

      // Sparring metadata — set once on first poll
      if (data.sparring) {
        setIsSparring(true);
        setAiDifficulty(data.aiDifficulty ?? null);
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

      // ── Heal overlays: flash +N 💧 labels on board for turn-start heals ─
      if (data.turnHistory && data.turnHistory.length > 0) {
        const latest = data.turnHistory[data.turnHistory.length - 1] as TurnSnapshot;
        type TurnStartEvt = { targetUuid: string; healAmount?: number; damageAmount?: number };
        const turnStartEvts: TurnStartEvt[] = (
          (latest?.log as { turnStartEvents?: TurnStartEvt[] })?.turnStartEvents ?? []
        );
        if (turnStartEvts.length > 0) {
          // Build position map from raw gs.teams
          const posMap = new Map<string, { x: number; y: number }>();
          for (const t of gs.teams) {
            for (const v of t.active) {
              if (v.position) posMap.set(v.uuid, v.position);
            }
          }
          const labels = turnStartEvts
            .map((e) => {
              const pos = posMap.get(e.targetUuid);
              if (!pos) return null;
              if (e.damageAmount) {
                return { x: pos.x, y: pos.y - 0.5, text: `-${e.damageAmount} 🔥`, color: 0xf97316, alpha: 1 };
              }
              if (e.healAmount) {
                return { x: pos.x, y: pos.y - 0.5, text: `+${e.healAmount} 💧`, color: 0x4ade80, alpha: 1 };
              }
              return null;
            })
            .filter((l): l is NonNullable<typeof l> => l !== null);

          if (labels.length > 0) {
            if (healOverlayTimerRef.current) clearTimeout(healOverlayTimerRef.current);
            setHealOverlays({ labels });
            healOverlayTimerRef.current = setTimeout(
              () => setHealOverlays({}),
              2000,
            );
          }
        }
      }

      // KO detection — play KO sound if either team gained a new KO
      const newT1Knocked = gs.teams[0]?.knocked?.length ?? 0;
      const newT2Knocked = gs.teams[1]?.knocked?.length ?? 0;
      if (
        newT1Knocked > prevKnockedRef.current.t1 ||
        newT2Knocked > prevKnockedRef.current.t2
      ) {
        play("ko");
      }
      prevKnockedRef.current = { t1: newT1Knocked, t2: newT2Knocked };

      if (gs.result) {
        const winnerName =
          gs.teams.find((t) => t.id === gs.result!.winner)?.name ??
          `Team ${gs.result.winner}`;
        setGameOver({
          winner: winnerName,
          condition: gs.result.condition,
        });
        // Trigger victory modal if not already showing
        setShowVictory(
          (prev) =>
            prev ?? { winner: winnerName, condition: gs.result!.condition },
        );
        // Play victory or defeat sound once
        if (!resultSoundPlayedRef.current) {
          resultSoundPlayedRef.current = true;
          const userTeamId = gs.teams.find((t) => t.userId === userId)?.id;
          if (userTeamId === gs.result.winner) {
            play("victory");
          } else {
            play("defeat");
          }
          // Fetch progression rewards with a short delay to let matchStats write commit
          setTimeout(() => {
            getMatchRewardsAction(matchUuid).then((rewards) => {
              if (rewards) setMatchRewards(rewards);
            }).catch(() => {/* silent — rewards are enhancement only */});
          }, 1500);
        }
      }
    },
    [userId, isAdminSelfMatch, play],
  );

  // Fetch vellymon display metadata once when teams are known
  useEffect(() => {
    if (!teams) return;
    const allNames = [...teams[0].active, ...teams[1].active].map(
      (v) => v.name,
    );
    const unfetched = allNames.filter((n) => !fetchedNamesRef.current.has(n));
    if (unfetched.length === 0) return;
    unfetched.forEach((n) => fetchedNamesRef.current.add(n));
    getVellymonInfoAction(unfetched).then((info) => {
      setVellymonInfoCache((prev) => ({ ...prev, ...info }));
    });
  }, [teams]);

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
          setError(
            e instanceof Error ? e.message : "Failed to load game state",
          );
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
    play("blip");
  }, [play]);

  // Wrap addCommand with screen→game direction translation — all commands are directional now
  const addDirectionalCommand = useCallback(
    (
      type: "move" | "attack" | "harvest",
      vellymonUuid: string,
      screenDir: Dir,
      attackIndex?: number,
    ) => {
      const gameDir = screenToGameDir(screenDir, isPortrait, yourTeam?.id ?? 1);
      addCommand({ type, vellymonUuid, direction: gameDir, attackIndex });
    },
    [addCommand, isPortrait, yourTeam?.id],
  );

  const handleSubmitTurn = useCallback(async () => {
    play("submit");
    setSubmitting(true);
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
        play("resolve");
        // Brief flash on the Turn counter
        setTurnFlash(true);
        setTimeout(() => setTurnFlash(false), 400);
        if (isAdminSelfMatch) {
          setActiveTeamId(1); // Reset to P1 for next turn
        }
      } else if (isAdminSelfMatch && activeTeamId === 2) {
        // P2 submitted in admin match — turn should resolve now
        const data = await getGameStateAction(matchUuid);
        parseState(data);
        play("resolve");
        setTurnFlash(true);
        setTimeout(() => setTurnFlash(false), 400);
        setActiveTeamId(1); // Reset to P1 for next turn
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit commands");
    } finally {
      setSubmitting(false);
    }
  }, [matchUuid, pendingCommands, parseState, isAdminSelfMatch, activeTeamId, play]);

  const handleConcede = useCallback(async () => {
    try {
      const result = await concedeAction(
        matchUuid,
        isAdminSelfMatch ? activeTeamId : undefined,
      );
      setShowConcedeConfirm(false);
      setShowVictory({ winner: result.winner, condition: result.condition });
      // Fetch rewards for the concede path too
      setTimeout(() => {
        getMatchRewardsAction(matchUuid).then((rewards) => {
          if (rewards) setMatchRewards(rewards);
        }).catch(() => {});
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to concede");
      setShowConcedeConfirm(false);
    }
  }, [matchUuid, isAdminSelfMatch, activeTeamId]);

  // Build all vellymons for the canvas
  const allVellymons = useMemo(
    () => [
      ...(teams?.[0]?.active.map((v) => ({
        ...v,
        teamId: teams[0].id as 1 | 2,
      })) ?? []),
      ...(teams?.[1]?.active.map((v) => ({
        ...v,
        teamId: teams[1].id as 1 | 2,
      })) ?? []),
    ],
    [teams],
  );

  const selectedVm = yourTeam?.active.find(
    (v) => v.uuid === selectedVellymon && !v.isKO,
  );
  const pendingForSelected = pendingCommands.find(
    (c) => c.vellymonUuid === selectedVellymon,
  );

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
            <Link
              href={`/matches/${matchUuid}`}
              className="text-blue-400 hover:underline"
            >
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
            <p className="text-gray-400 mb-6 capitalize">
              Victory by {gameOver.condition}
            </p>
            <Link
              href={`/matches/${matchUuid}`}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Match Results
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && !gameOver && (
        <>
          {/* ─── Top bar ─── */}
          <div className="flex justify-between items-center px-4 py-2 shrink-0">
            <Link
              href={`/matches/${matchUuid}`}
              className="text-gray-400 text-sm hover:text-white bg-black/40 px-3 py-1.5 rounded-lg"
            >
              ← Back
            </Link>
            <div className="flex items-center gap-2">
              {isAdminSelfMatch && (
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                  Playing as Team {activeTeamId}
                </span>
              )}
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className={`text-sm px-3 py-1.5 rounded-lg font-mono transition flex items-center gap-1 ${
                  turnFlash
                    ? "bg-green-600/80 text-white scale-105"
                    : "text-gray-300 bg-black/40 hover:bg-black/60 active:bg-black/80"
                }`}
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
              <button
                onClick={() => setShowGameMenu(true)}
                className="flex-1 bg-blue-950/60 border border-blue-500/30 rounded-lg px-3 py-1.5 text-left hover:bg-blue-900/40 active:bg-blue-900/60 transition"
              >
                <p className="font-bold text-sm truncate">{yourTeam.name}</p>
                <div className="flex gap-2 text-xs text-gray-300">
                  <span>⚡{yourTeam.energy}</span>
                  <span>🗡️{yourTeam.active.filter((v) => !v.isKO).length}</span>
                  <span>💀{yourTeam.knockedCount}</span>
                </div>
              </button>
            )}
            {opponentTeam && (
              <div className="flex-1 bg-red-950/60 border border-red-500/30 rounded-lg px-3 py-1.5">
                <p className="font-bold text-sm truncate">
                  {opponentTeam.name}
                </p>
                <div className="flex gap-2 text-xs text-gray-300">
                  <span>⚡{opponentTeam.energy}</span>
                  <span>
                    🗡️{opponentTeam.active.filter((v) => !v.isKO).length}
                  </span>
                  <span>💀{opponentTeam.knockedCount}</span>
                  {isSparring && aiDifficulty && (
                    <span className="ml-auto text-xs font-medium text-gray-400 uppercase tracking-wide">
                      🤖 {aiDifficulty}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── Canvas + drawer overlay ─── */}
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
              overlays={healOverlays}
            />

            {/* Vellymon drawer — overlays the board when a vellymon is selected */}
            {selectedVm && !waitingForSwitch && (
              <VellymonDrawer
                vellymon={selectedVm}
                info={vellymonInfoCache[selectedVm.name]}
                teamEnergy={yourTeam?.energy ?? 0}
                pendingCommand={pendingForSelected ?? null}
                dirToArrow={(dir) =>
                  gameDirToScreenArrow(dir, isPortrait, yourTeam?.id ?? 1)
                }
                onAction={(type, dir, attackIndex) =>
                  addDirectionalCommand(type, selectedVm.uuid, dir, attackIndex)
                }
                onClose={() => setSelectedVellymon(null)}
              />
            )}
          </div>

          {/* ─── Bottom bar: pending commands + submit ─── */}
          <div className="shrink-0 bg-[#0c1220] border-t border-gray-800 px-4 py-3">
            {waitingForSwitch ? (
              <div className="text-center py-2">
                <p className="text-purple-400 text-sm animate-pulse">
                  Switching to Team {activeTeamId}...
                </p>
              </div>
            ) : (
              <div className="mb-2">
                {/* Pending commands summary — always rendered to keep bar height stable */}
                {pendingCommands.length > 0 ? (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {pendingCommands.map((cmd) => {
                      const vm = yourTeam?.active.find(
                        (v) => v.uuid === cmd.vellymonUuid,
                      );
                      return (
                        <button
                          key={cmd.vellymonUuid}
                          onClick={() => setSelectedVellymon(cmd.vellymonUuid)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300 transition"
                        >
                          {vm?.name?.slice(0, 8)}: {cmd.type}{" "}
                          {cmd.direction
                            ? gameDirToScreenArrow(
                                cmd.direction,
                                isPortrait,
                                yourTeam?.id ?? 1,
                              )
                            : ""}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500">
                    Tap a vellymon to issue commands
                  </p>
                )}
              </div>
            )}

            {/* Submit button — always visible */}
            {!waitingForSwitch && (
              <button
                onClick={handleSubmitTurn}
                disabled={submitting}
                className={`w-full py-3 rounded-xl font-semibold transition text-base mt-1 ${
                  submitting
                    ? "bg-gray-600 cursor-not-allowed opacity-70"
                    : pendingCommands.length > 0
                      ? "bg-green-600 hover:bg-green-700 active:bg-green-800"
                      : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </span>
                ) : pendingCommands.length > 0 ? (
                  `Submit Turn (${pendingCommands.length} command${pendingCommands.length > 1 ? "s" : ""})`
                ) : (
                  "End Turn (skip all)"
                )}
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
        isPortrait={isPortrait}
        yourTeamId={yourTeam?.id ?? 1}
      />

      {/* Game menu (opens from your team card) */}
      {showGameMenu && !showConcedeConfirm && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowGameMenu(false)}
          />
          <div className="relative bg-[#1a2035] border-t border-gray-700 rounded-t-2xl w-full max-w-md mx-auto pb-safe">
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-600" />
            </div>
            <div className="px-4 pb-2 border-b border-gray-800">
              <p className="text-sm font-semibold text-gray-200">
                {yourTeam?.name ?? "Your Team"}
              </p>
            </div>
            <div className="p-4 space-y-2">
              {/* Team details */}
              {yourTeam && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-400 mb-3">
                  <div>
                    <span className="block text-lg text-white font-bold">
                      {yourTeam.active.filter((v) => !v.isKO).length}
                    </span>
                    Active
                  </div>
                  <div>
                    <span className="block text-lg text-white font-bold">
                      ⚡{yourTeam.energy}
                    </span>
                    Energy
                  </div>
                  <div>
                    <span className="block text-lg text-white font-bold">
                      {yourTeam.knockedCount}
                    </span>
                    KO&apos;d
                  </div>
                </div>
              )}

              {/* Concede */}
              <button
                onClick={() => {
                  setShowGameMenu(false);
                  setShowConcedeConfirm(true);
                }}
                className="w-full py-3 rounded-xl bg-red-950/60 border border-red-800/30 text-red-400 font-medium hover:bg-red-900/60 active:bg-red-800/60 transition text-sm"
              >
                🏳️ Concede Match
              </button>

              {/* Close */}
              <button
                onClick={() => setShowGameMenu(false)}
                className="w-full py-2.5 rounded-xl bg-gray-800 text-gray-400 font-medium hover:bg-gray-700 transition text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Concede confirmation dialog */}
      {showConcedeConfirm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowConcedeConfirm(false)}
          />
          <div className="relative bg-[#1a2035] border border-gray-700 rounded-2xl p-6 mx-6 max-w-sm w-full text-center">
            <h3 className="text-lg font-bold text-white mb-2">
              Concede Match?
            </h3>
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
          rewards={matchRewards}
          onComplete={() => {
            setShowVictory(null);
            router.push(`/matches/${matchUuid}`);
          }}
        />
      )}
    </div>
  );
}
