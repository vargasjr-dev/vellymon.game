"use client";

import { useState } from "react";

type Dir = "up" | "down" | "left" | "right";

type AttackDisplay = {
  name: string;
  damage: number;
  energyCost: number;
  range: number;
};

type VellymonData = {
  uuid: string;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  attacks: AttackDisplay[];
  isKO: boolean;
  imageUrl?: string;
};

type PendingCmd = {
  type: "move" | "attack" | "harvest";
  vellymonUuid: string;
  direction?: Dir;
  attackIndex?: number;
};

type VellymonInfo = {
  archetype: string;
  flavor: string;
  powerName: string;
  powerDesc: string;
};

type Props = {
  vellymon: VellymonData;
  info?: VellymonInfo;
  teamEnergy: number;
  pendingCommand: PendingCmd | null;
  dirToArrow: (dir: Dir) => string;
  /** Unified callback: (actionType, screenDirection, attackIndex?) */
  onAction: (type: "move" | "attack" | "harvest", dir: Dir, attackIndex?: number) => void;
  onClose: () => void;
};

/**
 * Two-stage Pokémon-style command drawer.
 *
 * Screen 1 — Action select:
 *   [Move] [Attack 1] [Attack 2] [Harvest]
 *
 * Screen 2 — Direction select:
 *   [↑] [↓] [←] [→]
 *
 * Both screens show vellymon stats. Picking a direction dispatches the command.
 */
export default function VellymonDrawer({
  vellymon,
  info,
  teamEnergy,
  pendingCommand,
  dirToArrow,
  onAction,
  onClose,
}: Props) {
  // null = action select (screen 1), object = direction select (screen 2)
  const [selectedAction, setSelectedAction] = useState<{
    type: "move" | "attack" | "harvest";
    attackIndex?: number;
    label: string;
  } | null>(null);

  const hpPct = vellymon.maxHp > 0 ? (vellymon.hp / vellymon.maxHp) * 100 : 0;
  const hpColor = hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-yellow-500" : "bg-red-500";

  const attack1 = vellymon.attacks[0];
  const attack2 = vellymon.attacks[1];
  const canAfford1 = attack1 ? teamEnergy >= attack1.energyCost : false;
  const canAfford2 = attack2 ? teamEnergy >= attack2.energyCost : false;

  const handleDirectionPick = (dir: Dir) => {
    if (!selectedAction) return;
    onAction(selectedAction.type, dir, selectedAction.attackIndex);
  };

  const goBack = () => setSelectedAction(null);

  return (
    <>
      {/* Dim overlay — tap to close */}
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />

      {/* Drawer — slides up from bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] bg-[#0c1220] border-t border-gray-700 rounded-t-2xl max-h-[65%] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        <div className="px-4 pb-4">
          {/* ─── Vellymon info header (always visible) ─── */}
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-lg bg-gray-800 border border-gray-600 flex items-center justify-center overflow-hidden shrink-0">
              {vellymon.imageUrl ? (
                <img src={vellymon.imageUrl} alt={vellymon.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base truncate">{vellymon.name}</h3>
                {info?.archetype && (
                  <span className="text-[10px] bg-gray-700/60 text-gray-300 px-1.5 py-0.5 rounded">
                    {info.archetype}
                  </span>
                )}
              </div>

              {/* HP bar */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${hpColor} transition-all`} style={{ width: `${hpPct}%` }} />
                </div>
                <span className="text-xs text-gray-400 tabular-nums">
                  {vellymon.hp}/{vellymon.maxHp}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 text-xs mb-3">
            <span className="text-red-400">⚔️ ATK {vellymon.attack}</span>
            <span className="text-yellow-400">💨 SPD {vellymon.speed}</span>
            <span className="text-blue-400">⚡ NRG {teamEnergy}</span>
          </div>

          {/* Special power */}
          {info?.powerName && (
            <div className="bg-purple-900/30 border border-purple-700/30 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-purple-300 font-semibold">{info.powerName}</p>
              <p className="text-[11px] text-purple-400/80">{info.powerDesc}</p>
            </div>
          )}

          {/* Pending command badge */}
          {pendingCommand && (
            <div className="bg-yellow-900/30 border border-yellow-700/30 rounded-lg px-3 py-1.5 mb-3 flex items-center gap-2">
              <span className="text-yellow-400 text-xs">📋 Queued:</span>
              <span className="text-yellow-300 text-xs font-medium">
                {pendingCommand.type}
                {pendingCommand.direction ? ` ${dirToArrow(pendingCommand.direction)}` : ""}
                {pendingCommand.type === "attack" && pendingCommand.attackIndex !== undefined
                  ? ` (${vellymon.attacks[pendingCommand.attackIndex]?.name ?? "?"})`
                  : ""}
              </span>
            </div>
          )}

          {/* ─── Screen 1: Action Select ─── */}
          {!selectedAction && (
            <div className="grid grid-cols-2 gap-2">
              {/* Move */}
              <button
                onClick={() => setSelectedAction({ type: "move", label: "Move" })}
                className="bg-gray-700/60 hover:bg-gray-600/60 active:bg-gray-500/60 border border-gray-600/40 rounded-xl px-3 py-3 transition text-center"
              >
                <p className="text-sm font-semibold text-gray-200">Move</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Free • 1 tile</p>
              </button>

              {/* Attack 1 */}
              {attack1 && (
                <button
                  onClick={() => canAfford1 && setSelectedAction({ type: "attack", attackIndex: 0, label: attack1.name })}
                  disabled={!canAfford1}
                  className={`border rounded-xl px-3 py-3 transition text-center ${
                    canAfford1
                      ? "bg-red-900/40 hover:bg-red-800/40 active:bg-red-700/40 border-red-700/40"
                      : "bg-gray-800/40 border-gray-700/30 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <p className="text-sm font-semibold text-red-300">{attack1.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {attack1.damage} dmg • {attack1.energyCost}⚡ • rng {attack1.range}
                  </p>
                </button>
              )}

              {/* Attack 2 */}
              {attack2 && (
                <button
                  onClick={() => canAfford2 && setSelectedAction({ type: "attack", attackIndex: 1, label: attack2.name })}
                  disabled={!canAfford2}
                  className={`border rounded-xl px-3 py-3 transition text-center ${
                    canAfford2
                      ? "bg-red-900/40 hover:bg-red-800/40 active:bg-red-700/40 border-red-700/40"
                      : "bg-gray-800/40 border-gray-700/30 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <p className="text-sm font-semibold text-red-300">{attack2.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {attack2.damage} dmg • {attack2.energyCost}⚡ • rng {attack2.range}
                  </p>
                </button>
              )}

              {/* Harvest */}
              <button
                onClick={() => setSelectedAction({ type: "harvest", label: "Harvest" })}
                className="bg-yellow-900/40 hover:bg-yellow-800/40 active:bg-yellow-700/40 border border-yellow-700/40 rounded-xl px-3 py-3 transition text-center"
              >
                <p className="text-sm font-semibold text-yellow-300">Harvest</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Free • adjacent tile</p>
              </button>
            </div>
          )}

          {/* ─── Screen 2: Direction Select ─── */}
          {selectedAction && (
            <div>
              {/* Back button + action label */}
              <button
                onClick={goBack}
                className="text-xs text-gray-400 hover:text-white mb-2 flex items-center gap-1 transition"
              >
                ← Pick different action
              </button>

              <div className="text-center mb-3">
                <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${
                  selectedAction.type === "move"
                    ? "bg-gray-700/60 text-gray-200"
                    : selectedAction.type === "attack"
                      ? "bg-red-900/40 text-red-300"
                      : "bg-yellow-900/40 text-yellow-300"
                }`}>
                  {selectedAction.label} — pick direction
                </span>
              </div>

              {/* Directional pad — 2×2 grid */}
              <div className="grid grid-cols-4 gap-2">
                {(["up", "down", "left", "right"] as Dir[]).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => handleDirectionPick(dir)}
                    className={`h-14 rounded-xl text-xl font-bold transition active:scale-95 ${
                      selectedAction.type === "move"
                        ? "bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/40 text-white"
                        : selectedAction.type === "attack"
                          ? "bg-red-900/50 hover:bg-red-800/50 border border-red-700/40 text-red-200"
                          : "bg-yellow-900/50 hover:bg-yellow-800/50 border border-yellow-700/40 text-yellow-200"
                    }`}
                  >
                    {dirToArrow(dir)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
