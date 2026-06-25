"use client";

import { useState } from "react";

// ─── Types (matches TurnSnapshot from gameEngine.server.ts) ──────────────────

type CommandResult = {
  command: {
    type: "move" | "attack" | "harvest";
    vellymonUuid: string;
    direction?: string;
  };
  success: boolean;
  reason?: string;
  energyDelta?: number;
  damageDealt?: number;
  targetKO?: boolean;
  targetUuid?: string;
  attackName?: string;
  powerEnergyDeltas?: Partial<Record<1 | 2, number>>;
};

type BenchEntry = {
  vellymonUuid: string;
  vellymonName: string;
  status: "entered" | "blocked";
};

type TurnStartEvent = {
  casterUuid: string;
  casterName: string;
  team: 1 | 2;
  powerName: string;
  targetUuid: string;
  targetName: string;
  healAmount?: number;
  damageAmount?: number;
};

type OccupationEvent = {
  x: number;
  y: number;
  counterBefore: number;
  counterAfter: number;
  tickingTeam: 1 | 2;
};

type TurnLogData = {
  turn: number;
  turnStartEvents?: TurnStartEvent[];
  commandResults: CommandResult[];
  benchEntries: { team1: BenchEntry[]; team2: BenchEntry[] };
  occupationEvents?: OccupationEvent[];
  winResult: { winner: 1 | 2; condition: string } | null;
};

type TeamSnap = {
  id: 1 | 2;
  name: string;
  energy: number;
  active: Array<{
    uuid: string;
    name: string;
    hp: number;
    maxHp: number;
    position: { x: number; y: number } | null;
    isKO: boolean;
  }>;
  benchCount: number;
  knockedCount: number;
};

export type TurnSnapshot = {
  turn: number;
  boardBefore: unknown;
  teamsBefore: TeamSnap[];
  log: TurnLogData;
};

// ─── Direction helpers ────────────────────────────────────────────────────────

type Dir = "up" | "down" | "left" | "right";

/**
 * Convert a game-space direction to a screen-space label.
 * In portrait mode the board is rotated: team 1 gets row = boardWidth-1-gx
 * (so increasing gx = decreasing row = moving UP on screen), team 2 gets
 * row = gx (increasing gx = moving DOWN on screen).
 * In landscape or when direction is absent, returns the raw direction string.
 *
 * Derived from gridToScreen in BattleCanvas.tsx — must stay in sync.
 */
function gameDirToScreenLabel(
  gameDir: string | undefined,
  isPortrait: boolean,
  teamId: 1 | 2,
): string {
  if (!gameDir) return "";
  if (!isPortrait) return ` ${gameDir}`;

  const labels: Record<Dir, string> = {
    up: " up",
    down: " down",
    left: " left",
    right: " right",
  };

  if (teamId === 1) {
    // row = boardWidth-1-gx → gx+ = row- = pixel y- = screen UP
    // col = gy            → gy+ = col+ = pixel x+ = screen RIGHT
    const map: Record<Dir, string> = {
      right: " up",
      left: " down",
      up: " left",
      down: " right",
    };
    return map[gameDir as Dir] ?? labels[gameDir as Dir] ?? ` ${gameDir}`;
  } else {
    // row = gx → gx+ = row+ = pixel y+ = screen DOWN
    // col = gy → gy+ = col+ = pixel x+ = screen RIGHT
    const map: Record<Dir, string> = {
      right: " down",
      left: " up",
      up: " right",
      down: " left",
    };
    return map[gameDir as Dir] ?? labels[gameDir as Dir] ?? ` ${gameDir}`;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Find vellymon name from uuid across both team snapshots */
function findName(teams: TeamSnap[], uuid: string): string {
  for (const t of teams) {
    const vm = t.active.find((v) => v.uuid === uuid);
    if (vm) return vm.name;
  }
  // Fallback: extract from uuid format "1-0" etc.
  return uuid;
}

function resultIcon(r: CommandResult): string {
  if (!r.success) return "⊘";
  switch (r.command.type) {
    case "move": return "→";
    case "attack": return r.targetKO ? "💀" : r.damageDealt === 0 ? "💨" : "⚔️";
    case "harvest": return "🌿";
    default: return "•";
  }
}

/**
 * Compute the net energy delta per team across all command results for a turn.
 * Accounts for both base command costs/gains (energyDelta) and special-power
 * triggered energy changes (powerEnergyDeltas).
 */
function computeTeamEnergyDeltas(
  log: TurnLogData,
): Partial<Record<1 | 2, number>> {
  const deltas: Partial<Record<1 | 2, number>> = {};
  for (const r of log.commandResults) {
    if (!r.success) continue;
    const teamId: 1 | 2 = r.command.vellymonUuid.startsWith("1-") ? 1 : 2;
    if (r.energyDelta !== undefined) {
      deltas[teamId] = (deltas[teamId] ?? 0) + r.energyDelta;
    }
    if (r.powerEnergyDeltas) {
      for (const [t, amt] of Object.entries(r.powerEnergyDeltas)) {
        const tid = Number(t) as 1 | 2;
        deltas[tid] = (deltas[tid] ?? 0) + (amt ?? 0);
      }
    }
  }
  return deltas;
}

function turnSummaryIcons(log: TurnLogData): string {
  const icons: string[] = [];
  const attacks = log.commandResults.filter((r) => r.command.type === "attack" && r.success);
  const kos = log.commandResults.filter((r) => r.targetKO);
  const harvests = log.commandResults.filter((r) => r.command.type === "harvest" && r.success);
  const occCaptures = (log.occupationEvents ?? []).filter((e) => Math.abs(e.counterAfter) >= 2);
  if (attacks.length > 0) icons.push(`⚔️${attacks.length}`);
  if (kos.length > 0) icons.push(`💀${kos.length}`);
  if (harvests.length > 0) icons.push(`🌿${harvests.length}`);
  if (occCaptures.length > 0) icons.push(`⭐${occCaptures.length}`);
  if (icons.length === 0) icons.push("→"); // all moves
  return icons.join(" ");
}

function formatResult(
  r: CommandResult,
  teams: TeamSnap[],
  isPortrait: boolean,
  yourTeamId: 1 | 2,
): string {
  const name = findName(teams, r.command.vellymonUuid);
  // Determine which team this mon belongs to so we use their perspective
  const monTeamId = teams.find((t) => t.active.some((v) => v.uuid === r.command.vellymonUuid))?.id ?? yourTeamId;
  const dir = gameDirToScreenLabel(r.command.direction, isPortrait, monTeamId);

  if (!r.success) {
    return `${name} ${r.command.type}${dir} — failed${r.reason ? `: ${r.reason}` : ""}`;
  }

  switch (r.command.type) {
    case "move":
      return `${name} moved${dir}`;
    case "attack": {
      const targetName = r.targetUuid ? findName(teams, r.targetUuid) : null;
      const victim = targetName ? ` → ${targetName}` : "";
      const dmg = r.damageDealt ? ` −${r.damageDealt} HP` : "";
      const ko = r.targetKO ? " [KO!]" : "";
      const move = r.attackName ? ` ${r.attackName}` : "";
      const missed = !r.damageDealt ? " — missed" : "";
      const cost =
        r.energyDelta !== undefined && r.energyDelta < 0
          ? ` [−${Math.abs(r.energyDelta)}⚡]`
          : "";
      const powerDrain = r.powerEnergyDeltas
        ? Object.entries(r.powerEnergyDeltas)
            .map(([t, amt]) =>
              amt < 0 ? ` T${t} −${Math.abs(amt)}⚡` : ` T${t} +${amt}⚡`,
            )
            .join("")
        : "";
      return `${name} used${move}${dir}${victim}${dmg}${ko}${missed}${cost}${powerDrain}`;
    }
    case "harvest": {
      const energy = r.energyDelta ? ` (+${r.energyDelta}⚡)` : "";
      return `${name} harvested${energy}`;
    }
    default:
      return `${name} ${r.command.type}${dir}`;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  history: TurnSnapshot[];
  isOpen: boolean;
  onToggle: () => void;
  isPortrait?: boolean;
  yourTeamId?: 1 | 2;
};

export default function TurnHistory({ history, isOpen, onToggle, isPortrait = false, yourTeamId = 1 }: Props) {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);

  if (history.length === 0 && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onToggle}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 bg-[#0c1220] border-t border-gray-700 rounded-t-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "60vh" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1" onClick={onToggle}>
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-4 pb-2 border-b border-gray-800">
          <span className="text-sm font-semibold text-gray-200">Turn History</span>
          <span className="text-xs text-gray-500">{history.length} turns</span>
        </div>

        {/* Turn list */}
        <div className="overflow-y-auto px-4 py-2" style={{ maxHeight: "calc(60vh - 60px)" }}>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No turns yet</p>
          ) : (
            [...history].reverse().map((snap) => {
              const isExpanded = expandedTurn === snap.turn;
              return (
                <div key={snap.turn} className="mb-1">
                  {/* Turn header — tap to expand */}
                  <button
                    onClick={() => setExpandedTurn(isExpanded ? null : snap.turn)}
                    className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-mono w-6">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                      <span className="text-sm text-gray-200 font-medium">
                        Turn {snap.turn}
                      </span>
                      <span className="text-xs text-gray-500">
                        {turnSummaryIcons(snap.log)}
                      </span>
                    </div>
                    {snap.log.winResult && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                        🏆 {snap.log.winResult.condition}
                      </span>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="ml-8 mb-2 space-y-1">
                      {/* Energy: before → after for each team */}
                      {(() => {
                        const deltas = computeTeamEnergyDeltas(snap.log);
                        return (
                          <div className="text-xs text-gray-500 mb-1">
                            {([1, 2] as const).map((tid) => {
                              const before = snap.teamsBefore.find((t) => t.id === tid)?.energy;
                              const delta = deltas[tid] ?? 0;
                              const after = before !== undefined ? before + delta : undefined;
                              const deltaLabel =
                                delta > 0
                                  ? ` +${delta}⚡`
                                  : delta < 0
                                    ? ` −${Math.abs(delta)}⚡`
                                    : "";
                              return (
                                <span key={tid}>
                                  {tid > 1 && " | "}
                                  ⚡ T{tid}: {before ?? "?"}
                                  {after !== undefined && after !== before && (
                                    <span
                                      className={
                                        delta > 0 ? "text-emerald-400" : "text-red-400"
                                      }
                                    >
                                      {deltaLabel} → {after}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}


                      {/* Turn-start passive power events (heals, burns) */}
                      {(snap.log.turnStartEvents ?? []).map((e, i) => (
                        <div key={`ts-${i}`} className="flex items-start gap-1.5 text-xs">
                          {e.damageAmount ? (
                            <>
                              <span className="shrink-0">🔥</span>
                              <span className="text-orange-400">
                                {e.casterName}: {e.powerName} burned {e.targetName} −{e.damageAmount} HP
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="shrink-0">💧</span>
                              <span className="text-emerald-400">
                                {e.casterName}: {e.powerName} healed {e.targetName} +{e.healAmount} HP
                              </span>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Command results sorted by execution order.
                          Skip "Vellymon not found" — it means a mon was KO'd
                          earlier in the same turn and its queued command never ran. */}
                      {snap.log.commandResults.filter((r) => r.reason !== "Vellymon not found").map((r, i) => {
                        const icon = resultIcon(r);
                        const teamId = r.command.vellymonUuid.startsWith("1-") ? 1 : 2;
                        const teamColor = teamId === 1 ? "text-blue-400" : "text-red-400";
                        return (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <span className="shrink-0">{icon}</span>
                            <span className={`${teamColor} ${!r.success ? "line-through opacity-50" : ""}`}>
                              {formatResult(r, snap.teamsBefore, isPortrait, yourTeamId)}
                            </span>
                          </div>
                        );
                      })}

                      {/* Bench entries */}
                      {[...snap.log.benchEntries.team1, ...snap.log.benchEntries.team2].map((b, i) => (
                        <div key={`bench-${i}`} className="flex items-start gap-1.5 text-xs">
                          <span className="shrink-0">📥</span>
                          <span className="text-green-400">
                            {b.vellymonName} {b.status === "entered" ? "entered from bench" : "bench entry blocked"}
                          </span>
                        </div>
                      ))}

                      {/* Occupation events */}
                      {(snap.log.occupationEvents ?? []).map((e, i) => {
                        const threshold = 2; // matches GAME_CONFIG.occupation.ticksToControl
                        const owned = Math.abs(e.counterAfter) >= threshold;
                        const contested = Math.sign(e.counterBefore) !== 0 && Math.sign(e.counterAfter) !== Math.sign(e.counterBefore);
                        const teamColor = e.tickingTeam === yourTeamId ? "text-blue-400" : "text-red-400";
                        const label = owned
                          ? `⭐ Point (${e.x},${e.y}) captured`
                          : contested
                            ? `⭐ Point (${e.x},${e.y}) contested`
                            : `⭐ Point (${e.x},${e.y}) +1 (${e.counterAfter > 0 ? "T2" : "T1"})`;
                        return (
                          <div key={`occ-${i}`} className="flex items-start gap-1.5 text-xs">
                            <span className="shrink-0">⭐</span>
                            <span className={teamColor}>{label.replace("⭐ ", "")}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
