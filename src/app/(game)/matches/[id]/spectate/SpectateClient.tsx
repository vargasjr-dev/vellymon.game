"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import TurnHistory, { type TurnSnapshot } from "../play/TurnHistory";
import type {
  Overlays,
  TweenTarget,
  VellymonDisplay as CanvasVellymon,
} from "../play/BattleCanvas";

const BattleCanvas = dynamic(() => import("../play/BattleCanvas"), {
  ssr: false,
});

// ─── Types ────────────────────────────────────────────────────────────────────

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
    attack: number;
    attacks?: AttackDisplay[];
    position: { x: number; y: number } | null;
    isKO: boolean;
    imageUrl?: string;
  }>;
  bench: unknown[];
  knocked: unknown[];
};

type RawGameState = {
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
};

// ─── Turn log types (mirrors server TurnLog / CommandResult / BenchEntry) ────

type RawCommand = {
  type: "move" | "attack" | "harvest";
  vellymonUuid: string;
  direction?: string;
  attackIndex?: number;
};

type RawCommandResult = {
  command: RawCommand;
  success: boolean;
  reason?: string;
  energyDelta?: number;
  damageDealt?: number;
  targetKO?: boolean;
};

type RawBenchEntry = {
  vellymonUuid: string;
  vellymonName: string;
  status: "entered" | "blocked";
};

type RawTurnLog = {
  turn: number;
  commandResults: RawCommandResult[];
  benchEntries: { team1: RawBenchEntry[]; team2: RawBenchEntry[] };
  winResult: { winner: 1 | 2; condition: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      attacks: v.attacks ?? [],
    })),
    benchCount: t.bench.length,
    knockedCount: t.knocked.length,
  };
}

function parseGameState(gs: RawGameState) {
  const teams: [TeamDisplay, TeamDisplay] | null =
    gs.teams.length >= 2 ? [mapTeam(gs.teams[0]), mapTeam(gs.teams[1])] : null;
  const boardSpaces =
    gs.board?.map((s) => ({
      x: s.position.x,
      y: s.position.y,
      type: s.type,
      occupationCounter: s.occupationCounter,
      harvestYield: s.harvestYield,
    })) ?? [];
  const gameOver = gs.result
    ? {
        winner:
          gs.teams.find((t) => t.id === gs.result!.winner)?.name ??
          `Team ${gs.result.winner}`,
        condition: gs.result.condition,
      }
    : null;
  return {
    turn: gs.turn,
    teams,
    boardWidth: gs.boardWidth,
    boardHeight: gs.boardHeight,
    boardSpaces,
    gameOver,
  };
}

// ─── Animation helpers ────────────────────────────────────────────────────────

type Dir = "up" | "down" | "left" | "right";
const DIR_OFFSETS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** Extract vellymons suitable for BattleCanvas from a RawGameState snapshot. */
function snapshotToVellymons(snap: RawGameState): CanvasVellymon[] {
  const result: CanvasVellymon[] = [];
  for (const t of snap.teams) {
    for (const v of t.active) {
      if (!v.position) continue;
      result.push({
        uuid: v.uuid,
        name: v.name,
        hp: v.hp,
        maxHp: v.maxHp,
        speed: v.speed,
        attack: v.attack,
        x: v.position.x,
        y: v.position.y,
        isKO: v.isKO,
        teamId: t.id as 1 | 2,
        imageUrl: v.imageUrl,
      });
    }
  }
  return result;
}

/** Build overlay ghosts + arrows for a single command preview. */
function buildPreviewOverlay(
  cmd: RawCommandResult,
  snap: RawGameState,
  lookup: Map<string, { name: string; teamId: 1 | 2 }>,
): Overlays {
  const info = lookup.get(cmd.command.vellymonUuid);
  if (!info) return {};
  const teamId = info.teamId;

  // Find current vellymon position in snapshot
  const team = snap.teams.find((t) => t.id === teamId);
  const vm = team?.active.find((v) => v.uuid === cmd.command.vellymonUuid);
  if (!vm?.position) return {};

  const { x, y } = vm.position;
  const dir = cmd.command.direction as Dir | undefined;
  const offset = dir ? DIR_OFFSETS[dir] : null;

  const teamColor = teamId === 1 ? 0x3b82f6 : 0xef4444;

  if (cmd.command.type === "move" && offset) {
    const tx = x + offset.dx;
    const ty = y + offset.dy;
    return {
      ghosts: [{ x: tx, y: ty, teamId, alpha: 1 }],
      arrows: [
        { fromX: x, fromY: y, toX: tx, toY: ty, color: teamColor, alpha: 0.85 },
      ],
    };
  }

  if (cmd.command.type === "attack" && offset) {
    const tx = x + offset.dx;
    const ty = y + offset.dy;
    return {
      arrows: [
        { fromX: x, fromY: y, toX: tx, toY: ty, color: 0xff6b6b, alpha: 0.9 },
      ],
    };
  }

  // Harvest — arrow pointing in harvest direction
  if (cmd.command.type === "harvest" && offset) {
    const tx = x + offset.dx;
    const ty = y + offset.dy;
    return {
      arrows: [
        { fromX: x, fromY: y, toX: tx, toY: ty, color: 0x4ade80, alpha: 0.8 },
      ],
    };
  }

  return {};
}

/** Build impact labels from turn log (damage numbers, KO badges). */
function buildImpactOverlays(log: RawTurnLog, snap: RawGameState): Overlays {
  const labels: Overlays["labels"] = [];
  for (const r of log.commandResults) {
    if (!r.damageDealt && !r.targetKO) continue;
    // Find target position in the "after" snap by searching all teams
    // Attack direction tells us which tile was hit — but it's easiest to look up
    // the target vellymon from the snap (it'll be at its post-turn position)
    for (const team of snap.teams) {
      for (const vm of team.active) {
        // We can't perfectly match command → target without traversal, so we
        // show damage labels at the *attacker's* post-turn position offset by dir.
        // A solid UX approximation.
        void vm; // suppress unused warning — loop is for structure
      }
    }
    // Find attacker position in snap
    let attackerPos: { x: number; y: number } | null = null;
    for (const team of snap.teams) {
      const vm = team.active.find((v) => v.uuid === r.command.vellymonUuid);
      if (vm?.position) {
        attackerPos = vm.position;
        break;
      }
    }
    if (!attackerPos) continue;
    const dir = r.command.direction as Dir | undefined;
    const offset = dir ? DIR_OFFSETS[dir] : null;
    const labelX = offset ? attackerPos.x + offset.dx : attackerPos.x;
    const labelY = offset ? attackerPos.y + offset.dy : attackerPos.y;

    if (r.targetKO) {
      labels.push({
        x: labelX,
        y: labelY,
        text: "💀 KO!",
        color: 0xff4444,
        alpha: 1,
      });
    } else if (r.damageDealt) {
      labels.push({
        x: labelX,
        y: labelY,
        text: `-${r.damageDealt}`,
        color: 0xfbbf24,
        alpha: 1,
      });
    }
  }
  return { labels };
}

/** Build a uuid → {name, teamId} lookup from a RawGameState (pre-turn state). */
function buildVellymonLookup(
  gs: RawGameState,
): Map<string, { name: string; teamId: 1 | 2 }> {
  const map = new Map<string, { name: string; teamId: 1 | 2 }>();
  for (const t of gs.teams) {
    for (const v of [
      ...t.active,
      ...(t.bench as Array<{ uuid: string; name: string }>),
      ...(t.knocked as Array<{ uuid: string; name: string }>),
    ]) {
      map.set(v.uuid, { name: v.name, teamId: t.id });
    }
  }
  return map;
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = { matchId: string };

export default function SpectateClient({ matchId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Replay mode
  const [turnSnapshots, setTurnSnapshots] = useState<RawGameState[] | null>(
    null,
  );
  const [turnLogs, setTurnLogs] = useState<RawTurnLog[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [logOpen, setLogOpen] = useState(false);

  // Animation state (Phase 1 → Preview, Phase 2 → Execute, Phase 3 → Impact)
  type AnimPhase = "idle" | "previewing" | "executing" | "impacting";
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [overlays, setOverlays] = useState<Overlays | null>(null);
  // tween is passed straight to BattleCanvas — it handles interpolation internally (no React 60fps updates)
  const [activeTween, setActiveTween] = useState<TweenTarget | null>(null);
  const animRef = useRef<{
    pendingIndex: number;
    previewCmds: RawCommandResult[];
    previewIdx: number;
    fromSnap: RawGameState | null;
    toSnap: RawGameState | null;
    log: RawTurnLog | null;
    lookup: Map<string, { name: string; teamId: 1 | 2 }>;
    timeoutId: ReturnType<typeof setTimeout> | null;
  }>({
    pendingIndex: 0,
    previewCmds: [],
    previewIdx: 0,
    fromSnap: null,
    toSnap: null,
    log: null,
    lookup: new Map(),
    timeoutId: null,
  });

  // Live mode
  const [liveState, setLiveState] = useState<ReturnType<
    typeof parseGameState
  > | null>(null);
  const [turnHistory, setTurnHistory] = useState<TurnSnapshot[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isReplay = turnSnapshots !== null && turnSnapshots.length > 0;

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/spectate/${matchId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          gameState: RawGameState;
          turnSnapshots?: RawGameState[];
          turnLogs?: RawTurnLog[];
          status: string;
          turnHistory?: TurnSnapshot[];
        };
        if (!active) return;

        const snapshots = data.turnSnapshots ?? [];

        if (snapshots.length > 0) {
          setTurnSnapshots(snapshots);
          setTurnLogs(data.turnLogs ?? []);
          setReplayIndex(0);
          setLoading(false);
          return;
        }

        // Live mode
        setLiveState(parseGameState(data.gameState));
        if (data.turnHistory?.length) setTurnHistory(data.turnHistory);
        setLastUpdated(new Date());
        setLoading(false);

        interval = setInterval(async () => {
          if (!active) return;
          try {
            const r = await fetch(`/api/spectate/${matchId}`);
            if (!r.ok) return;
            const d = (await r.json()) as {
              gameState: RawGameState;
              turnHistory?: TurnSnapshot[];
            };
            if (!active) return;
            setLiveState(parseGameState(d.gameState));
            if (d.turnHistory?.length) setTurnHistory(d.turnHistory);
            setLastUpdated(new Date());
          } catch {
            /* ignore */
          }
        }, 2000);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load match");
          setLoading(false);
        }
      }
    };

    void fetchState();
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [matchId]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close log when index changes
  useEffect(() => {
    setLogOpen(false);
  }, [replayIndex]);

  // Cleanup timeouts on unmount (Pixi ticker cleanup is handled by BattleCanvas)
  useEffect(() => {
    return () => {
      const a = animRef.current;
      if (a.timeoutId !== null) clearTimeout(a.timeoutId);
    };
  }, []);

  // ── Animation state machine ───────────────────────────────────────────────
  // Forward ref so startExecutePhase can call finishAnimation before it's defined
  const finishAnimationRef = useRef<() => void>(() => {
    /* filled below */
  });

  const startExecutePhase = useCallback(() => {
    const a = animRef.current;
    if (!a.fromSnap || !a.toSnap) return;
    setAnimPhase("executing");
    setOverlays(null);

    // Hand the animation off to BattleCanvas — it uses its Pixi ticker internally.
    // This fires onComplete when done, with zero React state updates per frame.
    setActiveTween({
      key: a.pendingIndex,
      from: snapshotToVellymons(a.fromSnap),
      to: snapshotToVellymons(a.toSnap),
      duration: 480,
      onComplete: () => {
        // Phase 3: show impact labels briefly, then finish
        const impactOverlays = a.log
          ? buildImpactOverlays(a.log, a.toSnap!)
          : null;
        const hasImpact = (impactOverlays?.labels?.length ?? 0) > 0;
        setAnimPhase("impacting");
        setActiveTween(null);
        if (hasImpact) {
          setOverlays(impactOverlays);
          a.timeoutId = setTimeout(() => {
            setOverlays(null);
            finishAnimationRef.current();
          }, 450);
        } else {
          a.timeoutId = setTimeout(() => finishAnimationRef.current(), 100);
        }
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finishAnimation = useCallback(() => {
    const a = animRef.current;
    setOverlays(null);
    setActiveTween(null);
    setAnimPhase("idle");
    setReplayIndex(a.pendingIndex);
  }, []);
  // Keep forward ref in sync
  finishAnimationRef.current = finishAnimation;

  const advancePreview = useCallback(() => {
    const a = animRef.current;
    const cmd = a.previewCmds[a.previewIdx];
    if (!cmd || !a.fromSnap) {
      // All previews shown — move to execute
      startExecutePhase();
      return;
    }
    const ovl = buildPreviewOverlay(cmd, a.fromSnap, a.lookup);
    // Accumulate overlays so all arrows remain visible throughout the preview phase
    setOverlays((prev) => ({
      ghosts: [...(prev?.ghosts ?? []), ...(ovl.ghosts ?? [])],
      arrows: [...(prev?.arrows ?? []), ...(ovl.arrows ?? [])],
      labels: [...(prev?.labels ?? []), ...(ovl.labels ?? [])],
    }));
    a.previewIdx += 1;
    a.timeoutId = setTimeout(advancePreview, 420);
  }, [startExecutePhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable no-op: spectate mode has no vellymon selection.
  // Must be stable (useCallback) so BattleCanvas's draw doesn't change on every render,
  // which would otherwise destroy and recreate the Pixi app mid-animation.
  const handleSelectVellymon = useCallback(() => {}, []);

  const stepForward = useCallback(() => {
    if (!turnSnapshots || !isReplay) return;
    if (animPhase !== "idle") return; // already animating
    const nextIdx = replayIndex + 1;
    if (nextIdx >= turnSnapshots.length) return;

    const fromSnap = turnSnapshots[replayIndex];
    const toSnap = turnSnapshots[nextIdx];
    const log = turnLogs[replayIndex] ?? null;
    const lookup = buildVellymonLookup(fromSnap);

    const a = animRef.current;
    a.pendingIndex = nextIdx;
    a.fromSnap = fromSnap;
    a.toSnap = toSnap;
    a.log = log;
    a.lookup = lookup;
    a.previewIdx = 0;

    // Sort commands by vellymon speed (fastest first — highest speed = first preview)
    const cmds = log?.commandResults ?? [];
    const getSpeed = (uuid: string): number => {
      for (const team of fromSnap.teams) {
        const vm = team.active.find(
          (av: { uuid: string; speed: number }) => av.uuid === uuid,
        );
        if (vm) return vm.speed;
      }
      return 0;
    };
    const sortedCmds = [...cmds].sort(
      (x, y) =>
        getSpeed(y.command.vellymonUuid) - getSpeed(x.command.vellymonUuid),
    );
    a.previewCmds = sortedCmds;

    // Start Phase 1: show "before" board (replayIndex hasn't changed yet), kick off preview sequence
    setAnimPhase("previewing");
    advancePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    turnSnapshots,
    replayIndex,
    turnLogs,
    animPhase,
    isReplay,
    advancePreview,
  ]);

  // ── Replay display state ──────────────────────────────────────────────────
  const replayParsed = useMemo(() => {
    if (!isReplay || !turnSnapshots) return null;
    return parseGameState(turnSnapshots[replayIndex]);
  }, [isReplay, turnSnapshots, replayIndex]);

  const displayState = isReplay ? replayParsed : liveState;
  const { turn, teams, boardWidth, boardHeight, boardSpaces, gameOver } =
    displayState ?? {
      turn: 0,
      teams: null,
      boardWidth: 9,
      boardHeight: 5,
      boardSpaces: [],
      gameOver: null,
    };

  const [t1, t2] = teams ?? [null, null];

  // Vellymons for BattleCanvas — always the current snapshot state.
  // During tween, BattleCanvas overrides positions internally via its ticker.
  const allVellymons = useMemo(
    () => [
      ...(t1?.active.map((v: VellymonDisplay) => ({
        ...v,
        teamId: t1.id as 1 | 2,
      })) ?? []),
      ...(t2?.active.map((v: VellymonDisplay) => ({
        ...v,
        teamId: t2.id as 1 | 2,
      })) ?? []),
    ],
    [t1, t2],
  );

  // ── Turn log for the current replay index ─────────────────────────────────
  // turnLogs[i] describes the transition from snapshot[i] → snapshot[i+1]
  // So for replayIndex N (N > 0), the log is turnLogs[N - 1].
  const currentLog: RawTurnLog | null =
    isReplay && replayIndex > 0 ? (turnLogs[replayIndex - 1] ?? null) : null;

  // Build vellymon name lookup from the "before" snapshot
  const vellymonLookup = useMemo(() => {
    if (!currentLog || !turnSnapshots)
      return new Map<string, { name: string; teamId: 1 | 2 }>();
    return buildVellymonLookup(turnSnapshots[replayIndex - 1]);
  }, [currentLog, turnSnapshots, replayIndex]);

  const hasLog = currentLog !== null && turnLogs.length > 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading match...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/matches" className="text-blue-400 hover:underline">
            ← All matches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0f1a] text-white flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex justify-between items-center px-4 py-2 shrink-0 border-b border-gray-800">
        <Link
          href={`/matches/${matchId}`}
          className="text-gray-400 text-sm hover:text-white bg-black/40 px-3 py-1.5 rounded-lg"
        >
          ← Back
        </Link>

        {/* Center: replay stepper or live turn counter */}
        {isReplay && turnSnapshots ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReplayIndex((i: number) => Math.max(0, i - 1))}
              disabled={replayIndex === 0}
              className="text-gray-300 bg-black/40 px-3 py-1.5 rounded-lg font-mono hover:bg-black/60 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              ←
            </button>
            <button
              onClick={() => hasLog && setLogOpen((o: boolean) => !o)}
              className={`text-sm bg-black/40 px-3 py-1.5 rounded-lg font-mono min-w-[120px] text-center transition ${
                hasLog
                  ? "text-gray-300 hover:bg-black/60 cursor-pointer"
                  : "text-gray-500 cursor-default"
              }`}
            >
              {replayIndex === 0 ? "Start" : `Turn ${turn}`}
              {hasLog && (
                <span className="text-[10px] text-gray-500 ml-1">
                  {logOpen ? "▲" : "▼"}
                </span>
              )}
              <span className="text-gray-600 text-xs ml-1">
                / {turnSnapshots.length - 1}
              </span>
            </button>
            <button
              onClick={stepForward}
              disabled={
                replayIndex === turnSnapshots.length - 1 || animPhase !== "idle"
              }
              className="text-gray-300 bg-black/40 px-3 py-1.5 rounded-lg font-mono hover:bg-black/60 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              {animPhase !== "idle" ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin align-middle" />
              ) : (
                "→"
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded font-mono">
              👁 SPECTATING
            </span>
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="text-gray-300 text-sm bg-black/40 px-3 py-1.5 rounded-lg font-mono hover:bg-black/60 transition flex items-center gap-1"
            >
              Turn {turn}
              {turnHistory.length > 0 && (
                <span className="text-[10px] text-gray-500">▼</span>
              )}
            </button>
          </div>
        )}

        {/* Right: badge */}
        <div className="flex items-center gap-1.5">
          {isReplay ? (
            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded font-mono">
              📼 REPLAY
            </span>
          ) : gameOver ? (
            <span className="text-xs text-yellow-400">🏆 FINAL</span>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "live"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Turn log drawer (replay mode) ── */}
      {isReplay && logOpen && currentLog && (
        <TurnLogDrawer log={currentLog} lookup={vellymonLookup} />
      )}

      {/* ── Team HUDs ── */}
      <div className="flex gap-2 px-3 py-2 shrink-0">
        {t1 && <TeamHUD team={t1} color="blue" />}
        {t2 && <TeamHUD team={t2} color="red" />}
      </div>

      {/* ── Game over banner ── */}
      {gameOver &&
        (isReplay
          ? replayIndex === (turnSnapshots?.length ?? 1) - 1
          : true) && (
          <div className="mx-3 mb-2 bg-yellow-900/40 border border-yellow-500/40 rounded-xl px-4 py-3 text-center shrink-0">
            <p className="text-yellow-300 font-bold text-lg">
              🏆 {gameOver.winner} wins!
            </p>
            <p className="text-yellow-500 text-sm capitalize">
              Victory by {gameOver.condition}
            </p>
          </div>
        )}

      {/* ── Board canvas ── */}
      <div className="flex-1 relative min-h-0">
        <BattleCanvas
          boardWidth={boardWidth}
          boardHeight={boardHeight}
          spaces={boardSpaces}
          vellymons={allVellymons}
          yourTeamId={1}
          selectedVellymon={null}
          onSelectVellymon={handleSelectVellymon}
          commandedUuids={new Set()}
          overlays={overlays ?? undefined}
          tween={activeTween ?? undefined}
        />
      </div>

      {/* ── Turn history sheet (live mode only) ── */}
      {!isReplay && (
        <TurnHistory
          history={turnHistory}
          isOpen={historyOpen}
          onToggle={() => setHistoryOpen(!historyOpen)}
        />
      )}
    </div>
  );
}

// ─── Turn Log Drawer ──────────────────────────────────────────────────────────

function TurnLogDrawer({
  log,
  lookup,
}: {
  log: RawTurnLog;
  lookup: Map<string, { name: string; teamId: 1 | 2 }>;
}) {
  const bench1 = log.benchEntries?.team1 ?? [];
  const bench2 = log.benchEntries?.team2 ?? [];
  const allBench = [...bench1, ...bench2];

  return (
    <div className="shrink-0 border-b border-gray-800 bg-[#0d1520] px-3 py-2 max-h-52 overflow-y-auto">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">
        Turn {log.turn} — Actions
      </p>
      <div className="space-y-1">
        {log.commandResults.map((r, i) => {
          const info = lookup.get(r.command.vellymonUuid);
          const name = info?.name ?? r.command.vellymonUuid;
          const teamId = info?.teamId ?? 1;
          const teamColor = teamId === 1 ? "text-blue-400" : "text-red-400";
          const icon =
            r.command.type === "attack"
              ? "⚔️"
              : r.command.type === "harvest"
                ? "🌿"
                : "👟";
          const dirStr = r.command.direction ? ` ${r.command.direction}` : "";
          const dmgStr = r.damageDealt ? ` −${r.damageDealt} HP` : "";
          const koStr = r.targetKO ? " 💀 KO!" : "";
          const energyStr =
            r.energyDelta && r.energyDelta > 0 ? ` +${r.energyDelta}⚡` : "";
          const failStr = !r.success ? ` ✗ ${r.reason ?? "failed"}` : "";

          return (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className={`font-semibold w-20 truncate ${teamColor}`}>
                {name}
              </span>
              <span className="text-gray-500">{icon}</span>
              <span className="text-gray-300">
                {r.command.type}
                {dirStr}
              </span>
              {dmgStr && (
                <span className="text-orange-400 font-mono">{dmgStr}</span>
              )}
              {koStr && <span className="text-red-400 font-bold">{koStr}</span>}
              {energyStr && (
                <span className="text-yellow-400 font-mono">{energyStr}</span>
              )}
              {failStr && (
                <span className="text-gray-600 italic">{failStr}</span>
              )}
            </div>
          );
        })}

        {allBench.length > 0 && (
          <div className="pt-1 border-t border-gray-800/60 mt-1">
            {allBench.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-400 font-semibold w-20 truncate">
                  {e.vellymonName}
                </span>
                <span className="text-gray-500">🔄</span>
                <span
                  className={
                    e.status === "entered" ? "text-green-400" : "text-gray-600"
                  }
                >
                  {e.status === "entered"
                    ? "entered from bench"
                    : "bench entry blocked"}
                </span>
              </div>
            ))}
          </div>
        )}

        {log.winResult && (
          <div className="pt-1 border-t border-yellow-800/40 mt-1">
            <span className="text-yellow-400 text-xs font-bold">
              🏆 Team {log.winResult.winner} wins by {log.winResult.condition}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Team HUD ─────────────────────────────────────────────────────────────────

function TeamHUD({
  team,
  color,
}: {
  team: TeamDisplay;
  color: "blue" | "red";
}) {
  const borderClass =
    color === "blue" ? "border-blue-500/30" : "border-red-500/30";
  const bgClass = color === "blue" ? "bg-blue-950/60" : "bg-red-950/60";
  const alive = team.active.filter((v) => !v.isKO);

  return (
    <div
      className={`flex-1 ${bgClass} border ${borderClass} rounded-lg px-3 py-1.5`}
    >
      <p className="font-bold text-sm truncate">{team.name}</p>
      <div className="flex gap-2 text-xs text-gray-300 mt-0.5">
        <span>⚡{team.energy}</span>
        <span>🗡️{alive.length} active</span>
        <span>📦{team.benchCount} bench</span>
        <span>💀{team.knockedCount} KO</span>
      </div>
      <div className="mt-1 space-y-0.5">
        {alive.map((v) => {
          const pct = Math.round((v.hp / v.maxHp) * 100);
          const barColor =
            pct > 50
              ? "bg-green-500"
              : pct > 25
                ? "bg-yellow-500"
                : "bg-red-500";
          return (
            <div key={v.uuid} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-14 truncate">
                {v.name}
              </span>
              <div className="flex-1 h-1 bg-gray-700 rounded-full">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 w-8 text-right">
                {v.hp}/{v.maxHp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
