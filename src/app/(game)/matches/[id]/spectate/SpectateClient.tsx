"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import TurnHistory, { type TurnSnapshot } from "../play/TurnHistory";

const BattleCanvas = dynamic(() => import("../play/BattleCanvas"), { ssr: false });

// ─── Types (mirrors PlayPollingClient's RawTeam / TeamDisplay) ────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  matchId: string;
};

export default function SpectateClient({ matchId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [teams, setTeams] = useState<[TeamDisplay, TeamDisplay] | null>(null);
  const [boardWidth, setBoardWidth] = useState(9);
  const [boardHeight, setBoardHeight] = useState(5);
  const [boardSpaces, setBoardSpaces] = useState<
    Array<{ x: number; y: number; type: string; occupationCounter?: number; harvestYield?: number }>
  >([]);
  const [gameOver, setGameOver] = useState<{ winner: string; condition: string } | null>(null);
  const [turnHistory, setTurnHistory] = useState<TurnSnapshot[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const parseState = useCallback(
    (data: {
      gameState: {
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
      status: string;
      turnHistory?: TurnSnapshot[];
    }) => {
      const gs = data.gameState;

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

      if (gs.teams.length >= 2) {
        setTeams([mapTeam(gs.teams[0]), mapTeam(gs.teams[1])]);
      }

      if (data.turnHistory && data.turnHistory.length > 0) {
        setTurnHistory(data.turnHistory);
      }

      if (gs.result) {
        const winnerName =
          gs.teams.find((t) => t.id === gs.result!.winner)?.name ??
          `Team ${gs.result.winner}`;
        setGameOver({ winner: winnerName, condition: gs.result.condition });
      }

      setLastUpdated(new Date());
    },
    [],
  );

  // Poll every 2s
  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/spectate/${matchId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) {
          parseState(data);
          setLoading(false);
          setError(null);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load match");
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
  }, [matchId, parseState]);

  // Lock body scroll while spectating
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const allVellymons = useMemo(
    () => [
      ...(teams?.[0]?.active.map((v) => ({ ...v, teamId: teams[0].id as 1 | 2 })) ?? []),
      ...(teams?.[1]?.active.map((v) => ({ ...v, teamId: teams[1].id as 1 | 2 })) ?? []),
    ],
    [teams],
  );

  const [t1, t2] = teams ?? [null, null];

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
          <Link href="/matches" className="text-blue-400 hover:underline">← All matches</Link>
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

        <div className="flex items-center gap-2">
          {/* Spectate badge */}
          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded font-mono">
            👁 SPECTATING
          </span>

          {/* Turn counter + history toggle */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="text-gray-300 text-sm bg-black/40 px-3 py-1.5 rounded-lg font-mono hover:bg-black/60 transition flex items-center gap-1"
          >
            Turn {turn}
            {turnHistory.length > 0 && <span className="text-[10px] text-gray-500">▼</span>}
          </button>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          {gameOver ? (
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

      {/* ── Team HUDs ── */}
      <div className="flex gap-2 px-3 py-2 shrink-0">
        {t1 && (
          <TeamHUD team={t1} color="blue" />
        )}
        {t2 && (
          <TeamHUD team={t2} color="red" />
        )}
      </div>

      {/* ── Game over banner ── */}
      {gameOver && (
        <div className="mx-3 mb-2 bg-yellow-900/40 border border-yellow-500/40 rounded-xl px-4 py-3 text-center shrink-0">
          <p className="text-yellow-300 font-bold text-lg">🏆 {gameOver.winner} wins!</p>
          <p className="text-yellow-500 text-sm capitalize">Victory by {gameOver.condition}</p>
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
          onSelectVellymon={() => { /* spectate mode: selection disabled */ }}
          commandedUuids={new Set()}
        />
      </div>

      {/* ── Turn history sheet ── */}
      <TurnHistory
        history={turnHistory}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen(!historyOpen)}
      />
    </div>
  );
}

// ─── Team HUD ─────────────────────────────────────────────────────────────────

function TeamHUD({ team, color }: { team: TeamDisplay; color: "blue" | "red" }) {
  const borderClass = color === "blue" ? "border-blue-500/30" : "border-red-500/30";
  const bgClass = color === "blue" ? "bg-blue-950/60" : "bg-red-950/60";
  const alive = team.active.filter((v) => !v.isKO);

  return (
    <div className={`flex-1 ${bgClass} border ${borderClass} rounded-lg px-3 py-1.5`}>
      <p className="font-bold text-sm truncate">{team.name}</p>
      <div className="flex gap-2 text-xs text-gray-300 mt-0.5">
        <span>⚡{team.energy}</span>
        <span>🗡️{alive.length} active</span>
        <span>📦{team.benchCount} bench</span>
        <span>💀{team.knockedCount} KO</span>
      </div>
      {/* Live HP bars for active vellymons */}
      <div className="mt-1 space-y-0.5">
        {alive.map((v) => {
          const pct = Math.round((v.hp / v.maxHp) * 100);
          const barColor = pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";
          return (
            <div key={v.uuid} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-14 truncate">{v.name}</span>
              <div className="flex-1 h-1 bg-gray-700 rounded-full">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-gray-500 w-8 text-right">{v.hp}/{v.maxHp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
