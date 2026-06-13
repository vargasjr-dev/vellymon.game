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

// ─── Power description lookup (client-safe) ───────────────────────────────────
// Import the power registry side-effects and vellymon library at module level
// so getPower() is populated. These files have no Node.js deps — safe to run in browser.
import { VELLYMON_LIBRARY } from "../../../../../../server/vellymonLibrary";
import { getPower } from "../../../../../../server/specialPowers";
import "../../../../../../server/powers"; // side-effect: registers all powers

/** Map from lowercase vellymon name → power description (or undefined if no power). */
const POWER_DESC_BY_NAME = new Map<string, string>(
  VELLYMON_LIBRARY.flatMap((v) => {
    if (!v.specialPowerId) return [];
    const power = getPower(v.specialPowerId);
    if (!power?.description) return [];
    return [[v.name.toLowerCase(), power.description]];
  }),
);

/** Map from lowercase vellymon name → power name. */
const POWER_NAME_BY_NAME = new Map<string, string>(
  VELLYMON_LIBRARY.flatMap((v) => {
    if (!v.specialPowerId) return [];
    const power = getPower(v.specialPowerId);
    if (!power?.name) return [];
    return [[v.name.toLowerCase(), power.name]];
  }),
);

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

/**
 * Scan along an attack direction in the pre-turn snapshot to find the actual
 * hit tile. Needed so the arrow draws to where the target actually was, not
 * just attacker + 1 tile (which is wrong for range-2+ attacks).
 */
function findAttackTargetTile(
  cmd: RawCommandResult,
  attackerPos: { x: number; y: number },
  dir: Dir,
  fromSnap: RawGameState,
): { x: number; y: number } {
  const offset = DIR_OFFSETS[dir];
  // Get attack range from snapshot
  let range = 1;
  for (const t of fromSnap.teams) {
    const v = t.active.find((av) => av.uuid === cmd.command.vellymonUuid);
    if (v) {
      const atk = v.attacks?.[cmd.command.attackIndex ?? 0];
      if (atk) range = atk.range;
      break;
    }
  }
  // Find attacker's team id
  const attackerTeamId = fromSnap.teams.find((t) =>
    t.active.some((v) => v.uuid === cmd.command.vellymonUuid),
  )?.id;
  // Scan for first enemy along direction within range
  for (let d = 1; d <= range; d++) {
    const pos = {
      x: attackerPos.x + offset.dx * d,
      y: attackerPos.y + offset.dy * d,
    };
    if (
      pos.x < 0 ||
      pos.x >= fromSnap.boardWidth ||
      pos.y < 0 ||
      pos.y >= fromSnap.boardHeight
    )
      break;
    for (const t of fromSnap.teams) {
      if (t.id === attackerTeamId) continue;
      const hit = t.active.find(
        (v) =>
          !v.isKO && v.position?.x === pos.x && v.position?.y === pos.y,
      );
      if (hit) return pos;
    }
  }
  // Fallback — attacker + 1 tile
  return { x: attackerPos.x + offset.dx, y: attackerPos.y + offset.dy };
}

/**
 * Unified step: one command's full animation (preview arrow → tween → optional
 * recoil for attacks → optional impact label). The runner chains these
 * sequentially so the board shows P1→A1→P2→A2→... instead of all P then all A.
 */
type UnifiedStep = {
  key: string;
  // Arrow(s) to accumulate before this step tweens
  previewOverlay: Overlays;
  previewMs: number;
  // Primary tween (move to new pos, or lunge toward target for attacks)
  tweenFrom: CanvasVellymon[];
  tweenTo: CanvasVellymon[];
  tweenMs: number;
  // Recoil tween (attacks only — snap attacker back to original pos)
  recoilTo?: CanvasVellymon[];
  recoilMs?: number;
  // Impact label after execute
  impactOverlay: Overlays | null;
  impactMs: number;
};

/**
 * Build a unified step list for one turn.
 * Each entry covers preview + animation for a single command.
 * A final reconciliation step snaps to the true toSnap state.
 */
function buildUnifiedSteps(
  sortedCmds: RawCommandResult[],
  fromSnap: RawGameState,
  toSnap: RawGameState,
  lookup: Map<string, { name: string; teamId: 1 | 2 }>,
): UnifiedStep[] {
  const steps: UnifiedStep[] = [];

  const workingPos = new Map<string, { x: number; y: number }>();
  const baseVms = snapshotToVellymons(fromSnap);
  baseVms.forEach((v) => workingPos.set(v.uuid, { x: v.x, y: v.y }));

  function snapshot(): CanvasVellymon[] {
    return baseVms.map((v) => {
      const pos = workingPos.get(v.uuid);
      return pos ? { ...v, x: pos.x, y: pos.y } : { ...v };
    });
  }

  let stepIdx = 0;

  for (const cmd of sortedCmds) {
    if (!cmd.success) continue;
    const uuid = cmd.command.vellymonUuid;
    const info = lookup.get(uuid);
    const teamId = info?.teamId ?? 1;
    const teamColor = teamId === 1 ? 0x3b82f6 : 0xef4444;
    const cur = workingPos.get(uuid);
    if (!cur) continue;

    const dir = cmd.command.direction as Dir | undefined;
    const offset = dir ? DIR_OFFSETS[dir] : null;

    if (cmd.command.type === "move" && offset) {
      // Preview: ghost at destination + arrow
      const previewOverlay: Overlays = {
        ghosts: [{ x: cur.x + offset.dx, y: cur.y + offset.dy, teamId, alpha: 1 }],
        arrows: [{ fromX: cur.x, fromY: cur.y, toX: cur.x + offset.dx, toY: cur.y + offset.dy, color: teamColor, alpha: 0.85 }],
      };

      const from = snapshot();
      workingPos.set(uuid, { x: cur.x + offset.dx, y: cur.y + offset.dy });
      const to = snapshot();

      steps.push({
        key: String(stepIdx++),
        previewOverlay,
        previewMs: 300,
        tweenFrom: from,
        tweenTo: to,
        tweenMs: 260,
        impactOverlay: null,
        impactMs: 0,
      });
    } else if (cmd.command.type === "attack" && offset) {
      // Find real target tile by scanning the pre-snap
      const targetTile = findAttackTargetTile(cmd, cur, dir!, fromSnap);

      // Preview: arrow extending to the actual hit tile
      const previewOverlay: Overlays = {
        arrows: [{ fromX: cur.x, fromY: cur.y, toX: targetTile.x, toY: targetTile.y, color: 0xff6b6b, alpha: 0.9 }],
      };

      // Lunge: attacker briefly moves 0.35 tiles toward target direction
      const from = snapshot();
      workingPos.set(uuid, { x: cur.x + offset.dx * 0.35, y: cur.y + offset.dy * 0.35 });
      const lunged = snapshot();
      workingPos.set(uuid, cur); // snap back
      const back = snapshot();

      // Impact at actual hit tile
      let impactOverlay: Overlays | null = null;
      if ((cmd.damageDealt && cmd.damageDealt > 0) || cmd.targetKO) {
        impactOverlay = {
          labels: [{
            x: targetTile.x,
            y: targetTile.y,
            text: cmd.targetKO ? "💀 KO!" : `-${cmd.damageDealt}`,
            color: cmd.targetKO ? 0xff4444 : 0xfbbf24,
            alpha: 1,
          }],
        };
      }

      steps.push({
        key: String(stepIdx++),
        previewOverlay,
        previewMs: 300,
        tweenFrom: from,
        tweenTo: lunged,
        tweenMs: 110,
        recoilTo: back,
        recoilMs: 80,
        impactOverlay,
        impactMs: 400,
      });
    } else if (cmd.command.type === "harvest" && offset) {
      // Harvest: just show a green arrow, no position change
      const previewOverlay: Overlays = {
        arrows: [{ fromX: cur.x, fromY: cur.y, toX: cur.x + offset.dx, toY: cur.y + offset.dy, color: 0x4ade80, alpha: 0.8 }],
      };
      const from = snapshot();
      steps.push({
        key: String(stepIdx++),
        previewOverlay,
        previewMs: 300,
        tweenFrom: from,
        tweenTo: from,
        tweenMs: 60,
        impactOverlay: null,
        impactMs: 0,
      });
    }
  }

  // Final reconciliation — snaps to true toSnap (handles KOs, HP, any edge cases)
  steps.push({
    key: "final",
    previewOverlay: {},
    previewMs: 0,
    tweenFrom: snapshot(),
    tweenTo: snapshotToVellymons(toSnap),
    tweenMs: 80,
    impactOverlay: null,
    impactMs: 0,
  });

  return steps;
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

  // Animation state — unified P1A1P2A2 loop
  type AnimPhase = "idle" | "animating";
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [overlays, setOverlays] = useState<Overlays | null>(null);
  // tween is passed straight to BattleCanvas — it handles interpolation internally (no React 60fps updates)
  const [activeTween, setActiveTween] = useState<TweenTarget | null>(null);
  const animRef = useRef<{
    pendingIndex: number;
    fromSnap: RawGameState | null;
    toSnap: RawGameState | null;
    log: RawTurnLog | null;
    lookup: Map<string, { name: string; teamId: 1 | 2 }>;
    timeoutId: ReturnType<typeof setTimeout> | null;
    // Unified step list: each entry = preview + animation for one command
    unifiedSteps: UnifiedStep[];
    stepIdx: number;
  }>({
    pendingIndex: 0,
    fromSnap: null,
    toSnap: null,
    log: null,
    lookup: new Map(),
    timeoutId: null,
    unifiedSteps: [],
    stepIdx: 0,
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
  // Forward ref allows runUnifiedStep to call itself recursively without
  // stale-closure issues.
  const runUnifiedStepRef = useRef<() => void>(() => {});

  const finishAnimation = useCallback(() => {
    const a = animRef.current;
    if (a.timeoutId !== null) clearTimeout(a.timeoutId);
    a.timeoutId = null;
    setOverlays(null);
    setActiveTween(null);
    setAnimPhase("idle");
    setReplayIndex(a.pendingIndex);
  }, []);
  const finishAnimationRef = useRef(finishAnimation);
  finishAnimationRef.current = finishAnimation;

  const runUnifiedStep = useCallback(() => {
    const a = animRef.current;

    if (a.stepIdx >= a.unifiedSteps.length) {
      finishAnimationRef.current();
      return;
    }

    const step = a.unifiedSteps[a.stepIdx];
    a.stepIdx += 1;

    // 1 — Accumulate preview arrow for this command
    if (step.previewOverlay && (step.previewOverlay.arrows?.length || step.previewOverlay.ghosts?.length)) {
      setOverlays((prev) => ({
        ghosts: [...(prev?.ghosts ?? []), ...(step.previewOverlay.ghosts ?? [])],
        arrows: [...(prev?.arrows ?? []), ...(step.previewOverlay.arrows ?? [])],
        labels: prev?.labels ?? [],
      }));
    }

    // 2 — Wait preview duration, then tween
    const fireTween = () => {
      setActiveTween({
        key: `${a.pendingIndex}-${step.key}`,
        from: step.tweenFrom,
        to: step.tweenTo,
        duration: step.tweenMs,
        onComplete: () => {
          setActiveTween(null);

          if (step.recoilTo) {
            // Attack recoil: snap attacker back
            setActiveTween({
              key: `${a.pendingIndex}-${step.key}-recoil`,
              from: step.tweenTo,
              to: step.recoilTo,
              duration: step.recoilMs ?? 80,
              onComplete: () => {
                setActiveTween(null);
                afterExecute();
              },
            });
          } else {
            afterExecute();
          }
        },
      });
    };

    const afterExecute = () => {
      if (step.impactOverlay) {
        // Show impact label, then continue
        setOverlays((prev) => ({
          ghosts: prev?.ghosts ?? [],
          arrows: prev?.arrows ?? [],
          labels: [...(prev?.labels ?? []), ...(step.impactOverlay?.labels ?? [])],
        }));
        a.timeoutId = setTimeout(() => {
          // Clear impact label (keep arrows)
          setOverlays((prev) => ({ ...prev, labels: [] }));
          runUnifiedStepRef.current();
        }, step.impactMs);
      } else {
        runUnifiedStepRef.current();
      }
    };

    if (step.previewMs > 0) {
      a.timeoutId = setTimeout(fireTween, step.previewMs);
    } else {
      fireTween();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  runUnifiedStepRef.current = runUnifiedStep;

  // Mon card overlay — tapping any vellymon on the board opens its card.
  const [selectedMonUuid, setSelectedMonUuid] = useState<string | null>(null);

  // Must be stable (useCallback with no deps) so BattleCanvas's draw effect
  // doesn't fire on every render and destroy/recreate the Pixi app mid-animation.
  const handleSelectVellymon = useCallback(
    (uuid: string | null) => setSelectedMonUuid(uuid),
    [],
  );

  const stepForward = useCallback(() => {
    if (!turnSnapshots || !isReplay) return;
    if (animPhase !== "idle") return; // already animating
    const nextIdx = replayIndex + 1;
    if (nextIdx >= turnSnapshots.length) return;

    const fromSnap = turnSnapshots[replayIndex];
    const toSnap = turnSnapshots[nextIdx];
    const log = turnLogs[replayIndex] ?? null;
    const lookup = buildVellymonLookup(fromSnap);

    // Sort commands by vellymon speed (fastest first)
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

    const a = animRef.current;
    a.pendingIndex = nextIdx;
    a.fromSnap = fromSnap;
    a.toSnap = toSnap;
    a.log = log;
    a.lookup = lookup;
    // Build unified steps: each command gets its own preview+animate cycle
    a.unifiedSteps = buildUnifiedSteps(sortedCmds, fromSnap, toSnap, lookup);
    a.stepIdx = 0;

    setAnimPhase("animating");
    setOverlays(null);
    runUnifiedStepRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnSnapshots, replayIndex, turnLogs, animPhase, isReplay]);

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
  // Stable empty set — never changes; passing `new Set()` inline creates a new
  // reference every render, which fires the vellymons useEffect in BattleCanvas
  // and clears committed displayVmsRef positions during multi-step animations.
  const emptyCommandedUuids = useMemo(() => new Set<string>(), []);

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
          href="/matches"
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

        {/* Right: live indicator only (no REPLAY badge — causes layout drift) */}
        <div className="w-16 flex items-center justify-end gap-1.5">
          {!isReplay && !gameOver && (
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
        {/* Compact team HUDs overlaid on board corners.
            yourTeamId=1 → Team 1 renders at bottom, Team 2 at top. */}
        {t1 && <CompactTeamHUD team={t1} color="blue" position="bottom-left" />}
        {t2 && <CompactTeamHUD team={t2} color="red" position="top-right" />}
        {/* Mon card overlay — shown when a vellymon is tapped */}
        {selectedMonUuid && (
          <MonCardOverlay
            uuid={selectedMonUuid}
            teams={teams}
            onClose={() => setSelectedMonUuid(null)}
          />
        )}
        <BattleCanvas
          boardWidth={boardWidth}
          boardHeight={boardHeight}
          spaces={boardSpaces}
          vellymons={allVellymons}
          yourTeamId={1}
          selectedVellymon={selectedMonUuid}
          onSelectVellymon={handleSelectVellymon}
          commandedUuids={emptyCommandedUuids}
          overlays={overlays ?? undefined}
          tween={activeTween ?? undefined}
          tapAllVellymons
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

// ─── Mon Card Overlay ─────────────────────────────────────────────────────────

function MonCardOverlay({
  uuid,
  teams,
  onClose,
}: {
  uuid: string;
  teams: [TeamDisplay, TeamDisplay] | null;
  onClose: () => void;
}) {
  if (!teams) return null;
  let vm: VellymonDisplay | undefined;
  let teamId: 1 | 2 = 1;
  for (const t of teams) {
    const found = t.active.find((v) => v.uuid === uuid);
    if (found) {
      vm = found;
      teamId = t.id;
      break;
    }
  }
  if (!vm) return null;

  const pct = vm.maxHp > 0 ? vm.hp / vm.maxHp : 0;
  const barColor =
    pct > 0.5 ? "bg-green-500" : pct > 0.25 ? "bg-yellow-500" : "bg-red-500";
  const borderColor =
    teamId === 1 ? "border-blue-500/60" : "border-red-500/60";
  const headerBg = teamId === 1 ? "bg-blue-900/70" : "bg-red-900/70";

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`bg-[#0d1520] border-2 ${borderColor} rounded-2xl p-4 mx-4 w-full max-w-[280px]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`${headerBg} rounded-xl px-3 py-2 mb-3 flex items-center justify-between`}
        >
          <span className="font-bold text-white text-base">{vm.name}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Sprite — background-size 200% crops the 25% whitespace padding per side */}
        {vm.imageUrl ? (
          <div
            className="w-32 h-32 mx-auto mb-3 rounded-xl"
            style={{
              backgroundImage: `url(${vm.imageUrl})`,
              backgroundSize: "200%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        ) : (
          <div
            className={`w-32 h-32 mx-auto mb-3 rounded-full opacity-60 ${teamId === 1 ? "bg-blue-500" : "bg-red-500"}`}
          />
        )}

        {/* HP */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>HP</span>
            <span className="font-mono">
              {vm.hp}/{vm.maxHp}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor} transition-all`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-800/60 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">
              Speed
            </p>
            <p className="text-white font-bold text-lg">{vm.speed}</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">
              Attack
            </p>
            <p className="text-white font-bold text-lg">{vm.attack}</p>
          </div>
        </div>

        {/* Special Power */}
        {(() => {
          const powerName = POWER_NAME_BY_NAME.get(vm.name.toLowerCase());
          const powerDesc = POWER_DESC_BY_NAME.get(vm.name.toLowerCase());
          if (!powerName && !powerDesc) return null;
          return (
            <div className="mb-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
                Special Power
              </p>
              <div className="bg-purple-900/40 border border-purple-500/30 rounded-xl px-3 py-2">
                {powerName && (
                  <p className="text-purple-300 text-xs font-semibold mb-0.5">
                    ✨ {powerName}
                  </p>
                )}
                {powerDesc && (
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {powerDesc}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Moves */}
        {vm.attacks.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
              Moves
            </p>
            <div className="space-y-1">
              {vm.attacks.map((atk, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-800/60 rounded-lg px-2.5 py-1.5"
                >
                  <span className="text-white text-xs font-medium">
                    {atk.name}
                  </span>
                  <div className="flex gap-2 text-[11px]">
                    <span className="text-orange-400">💥 {atk.damage}</span>
                    <span className="text-yellow-400">⚡ {atk.energyCost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compact Team HUD (corner overlay) ───────────────────────────────────────

function CompactTeamHUD({
  team,
  color,
  position,
}: {
  team: TeamDisplay;
  color: "blue" | "red";
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const posClass =
    position === "top-left"
      ? "top-2 left-2"
      : position === "top-right"
        ? "top-2 right-2"
        : position === "bottom-left"
          ? "bottom-2 left-2"
          : "bottom-2 right-2";
  const bgClass =
    color === "blue"
      ? "bg-blue-950/85 border-blue-500/40"
      : "bg-red-950/85 border-red-500/40";
  const aliveOnField = team.active.filter((v) => !v.isKO).length;
  const totalAlive = aliveOnField + team.benchCount;

  // Strip trailing "(Mon1, Mon2, ...)" if the name was generated that way
  const displayName = team.name.replace(/\s*\(.*\)\s*$/, "").trim() || team.name;

  return (
    <div
      className={`absolute ${posClass} z-10 ${bgClass} border rounded-xl px-2.5 py-1.5 backdrop-blur-sm pointer-events-none max-w-[140px]`}
    >
      <p className="font-bold text-xs text-white truncate">{displayName}</p>
      <div className="flex gap-2 text-xs text-gray-300 mt-0.5">
        <span>⚡{team.energy}</span>
        <span>🗡️{totalAlive}</span>
      </div>
    </div>
  );
}
