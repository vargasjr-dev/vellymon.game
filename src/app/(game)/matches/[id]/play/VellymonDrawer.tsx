"use client";

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
  /** Translate screen direction → display arrow */
  dirToArrow: (dir: Dir) => string;
  onMove: (dir: Dir) => void;
  onAttack: (dir: Dir) => void;
  onHarvest: () => void;
  onClose: () => void;
};

const ARCHETYPE_LABELS: Record<string, { label: string; color: string }> = {
  tank: { label: "Tank", color: "bg-blue-600/30 text-blue-300 border-blue-500/40" },
  speedster: { label: "Speedster", color: "bg-yellow-600/30 text-yellow-300 border-yellow-500/40" },
  glass_cannon: { label: "Glass Cannon", color: "bg-red-600/30 text-red-300 border-red-500/40" },
  support: { label: "Support", color: "bg-green-600/30 text-green-300 border-green-500/40" },
  balanced: { label: "Balanced", color: "bg-gray-600/30 text-gray-300 border-gray-500/40" },
};

export default function VellymonDrawer({
  vellymon,
  info,
  teamEnergy,
  pendingCommand,
  dirToArrow,
  onMove,
  onAttack,
  onHarvest,
  onClose,
}: Props) {
  const archetype = info ? ARCHETYPE_LABELS[info.archetype] : null;
  const hpPct = vellymon.maxHp > 0 ? (vellymon.hp / vellymon.maxHp) * 100 : 0;
  const hpColor = hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-yellow-500" : "bg-red-500";

  return (
    <>
      {/* Backdrop — dims the board */}
      <div className="absolute inset-0 bg-black/60 z-30" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute left-0 right-0 bottom-0 z-40 bg-[#0c1220] border-t border-gray-700 rounded-t-2xl max-h-[72vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-[#0c1220] z-10" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        <div className="px-4 pb-4 space-y-3">
          {/* ─── Identity ─── */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-xl bg-[#1a2535] border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
              {vellymon.imageUrl ? (
                <img
                  src={vellymon.imageUrl}
                  alt={vellymon.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-2xl">🟢</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-base font-bold text-white truncate">
                  {vellymon.name}
                </h3>
                {archetype && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${archetype.color} shrink-0`}>
                    {archetype.label}
                  </span>
                )}
              </div>
              {/* HP bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${hpColor}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono shrink-0">
                  {vellymon.hp}/{vellymon.maxHp}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Stats row ─── */}
          <div className="flex gap-2">
            <div className="flex-1 bg-[#1a2535] rounded-lg px-3 py-2 text-center">
              <span className="text-[10px] text-gray-500 uppercase block">ATK</span>
              <span className="text-sm font-bold text-red-400">{vellymon.attack}</span>
            </div>
            <div className="flex-1 bg-[#1a2535] rounded-lg px-3 py-2 text-center">
              <span className="text-[10px] text-gray-500 uppercase block">SPD</span>
              <span className="text-sm font-bold text-yellow-400">{vellymon.speed}</span>
            </div>
            <div className="flex-1 bg-[#1a2535] rounded-lg px-3 py-2 text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Energy</span>
              <span className="text-sm font-bold text-blue-400">⚡{teamEnergy}</span>
            </div>
          </div>

          {/* ─── Special Power ─── */}
          {info?.powerName && (
            <div className="bg-purple-950/40 border border-purple-800/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs">✨</span>
                <span className="text-xs font-bold text-purple-300">
                  {info.powerName}
                </span>
              </div>
              <p className="text-[11px] text-purple-400/80 leading-tight">
                {info.powerDesc}
              </p>
            </div>
          )}

          {/* ─── Attacks ─── */}
          {vellymon.attacks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500 uppercase font-semibold">
                Attacks
              </span>
              {vellymon.attacks.map((atk, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-[#1a2535] rounded-lg px-3 py-2"
                >
                  <span className="text-xs font-semibold text-gray-200">
                    {atk.name}
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="text-red-400">{atk.damage} dmg</span>
                    <span>⚡{atk.energyCost}</span>
                    <span>↔{atk.range}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Queued command badge ─── */}
          {pendingCommand && (
            <div className="bg-yellow-900/30 border border-yellow-700/30 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-xs">📋</span>
              <span className="text-xs text-yellow-300 font-medium">
                Queued: {pendingCommand.type}
                {pendingCommand.direction
                  ? ` ${dirToArrow(pendingCommand.direction)}`
                  : ""}
              </span>
            </div>
          )}

          {/* ─── Actions ─── */}
          <div className="border-t border-gray-800 pt-3 space-y-2">
            <div className="flex gap-2">
              {/* Move */}
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 mb-1 text-center font-semibold">
                  MOVE
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {(["up", "down", "left", "right"] as const).map((dir) => (
                    <button
                      key={`m-${dir}`}
                      onClick={() => onMove(dir)}
                      className="h-10 text-lg bg-gray-800 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition"
                    >
                      {dirToArrow(dir)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attack */}
              <div className="flex-1">
                <p className="text-[10px] text-red-400 mb-1 text-center font-semibold">
                  ATTACK
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {(["up", "down", "left", "right"] as const).map((dir) => (
                    <button
                      key={`a-${dir}`}
                      onClick={() => onAttack(dir)}
                      className="h-10 text-lg bg-red-950 rounded-lg hover:bg-red-900 active:bg-red-800 transition border border-red-800/50"
                    >
                      {dirToArrow(dir)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Harvest */}
              <div className="w-16 shrink-0">
                <p className="text-[10px] text-yellow-500 mb-1 text-center font-semibold">
                  HARVEST
                </p>
                <button
                  onClick={onHarvest}
                  className="w-full h-10 text-lg bg-yellow-900/60 rounded-lg hover:bg-yellow-800/60 active:bg-yellow-700/60 transition border border-yellow-700/30"
                >
                  ⚡
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
