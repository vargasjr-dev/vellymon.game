"use client";

import { useState } from "react";
import Image from "next/image";

export interface VellymonData {
  name: string;
  hp: number;
  attack: number;
  speed: number;
  flavor?: string;
  imageUrl?: string;
  powerName?: string;
  powerDescription?: string;
}

interface MonTeamSelectorProps {
  vellymons: VellymonData[];
  /** Ordered 6-slot array of mon names (empty string = empty slot). */
  slots: string[];
  onChange: (slots: string[]) => void;
}

const SLOT_LABELS = [
  "Active 1",
  "Active 2",
  "Active 3",
  "Active 4",
  "Bench 1",
  "Bench 2",
];

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: "green" | "red" | "blue";
}) {
  const pct = Math.min(100, (value / max) * 100);
  const colorClass =
    color === "green"
      ? "bg-green-500"
      : color === "red"
        ? "bg-red-500"
        : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-6 text-right">{value}</span>
    </div>
  );
}

export default function MonTeamSelector({
  vellymons,
  slots,
  onChange,
}: MonTeamSelectorProps) {
  const [search, setSearch] = useState("");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [focused, setFocused] = useState<VellymonData | null>(null);

  const filtered = vellymons.filter((v) =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()),
  );

  /** Find the first empty slot index, or null if all full. */
  function nextEmpty(): number | null {
    const idx = slots.findIndex((s) => !s);
    return idx === -1 ? null : idx;
  }

  /** Which slot index (0-5) a mon occupies, or -1. */
  function slotOf(name: string): number {
    return slots.indexOf(name);
  }

  function handleSlotClick(i: number) {
    setActiveSlot(i);
    const monName = slots[i];
    if (monName) {
      const mon = vellymons.find((v) => v.name === monName);
      if (mon) setFocused(mon);
    }
  }

  function clearSlot(i: number, e: React.MouseEvent) {
    e.stopPropagation();
    const next = [...slots];
    next[i] = "";
    onChange(next);
    if (activeSlot === i) setActiveSlot(null);
  }

  function handleMonClick(mon: VellymonData) {
    setFocused(mon);

    const existingIdx = slotOf(mon.name);
    if (existingIdx !== -1) {
      // Already in team — clicking it focuses it and sets that slot as active
      setActiveSlot(existingIdx);
      return;
    }

    // Determine target slot
    const target = activeSlot !== null ? activeSlot : nextEmpty();
    if (target === null) return; // all 6 filled, nowhere to put it

    const next = [...slots];
    next[target] = mon.name;
    onChange(next);

    // Advance activeSlot to the next empty slot after target
    const tempSlots = [...next];
    const nextIdx = tempSlots.findIndex((s, i) => i > target && !s);
    setActiveSlot(nextIdx === -1 ? null : nextIdx);
  }

  return (
    <div className="space-y-3">
      {/* Team Slots */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700">Team</span>
          <span className="text-xs text-gray-400">
            {slots.filter(Boolean).length} / 6 selected
            {slots.filter(Boolean).length < 6 && (
              <span className="ml-1 text-purple-500">
                — Haiku will auto-fill the rest
              </span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {slots.map((name, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSlotClick(i)}
              className={`relative rounded-lg border-2 text-xs transition group overflow-hidden ${
                activeSlot === i
                  ? "border-blue-500 bg-blue-50"
                  : name
                    ? "border-gray-200 bg-white hover:border-blue-300"
                    : "border-dashed border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
              style={{ minHeight: 64 }}
            >
              {name ? (
                <>
                  {/* Mon avatar */}
                  {vellymons.find((v) => v.name === name)?.imageUrl ? (
                    <div className="relative w-full aspect-square">
                      <Image
                        src={vellymons.find((v) => v.name === name)!.imageUrl!}
                        alt={name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {name[0]}
                    </div>
                  )}
                  <div className="px-1 py-0.5 text-center">
                    <p className="text-[9px] text-gray-700 font-medium truncate">{name}</p>
                    <p className="text-[8px] text-gray-400">{SLOT_LABELS[i]}</p>
                  </div>
                  {/* Clear button */}
                  <button
                    type="button"
                    onClick={(e) => clearSlot(i, e)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-2 gap-0.5">
                  <span className="text-gray-300 text-base">+</span>
                  <span className="text-[9px] text-gray-400">{SLOT_LABELS[i]}</span>
                  {i >= 4 && (
                    <span className="text-[8px] text-gray-300">optional</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Grid + Detail panel */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vellymons…"
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-1.5 max-h-64 overflow-y-auto pr-1">
            {filtered.map((v) => {
              const currentSlot = slotOf(v.name);
              const isSelected = currentSlot !== -1;
              return (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => handleMonClick(v)}
                  className={`group relative rounded-lg overflow-hidden transition aspect-square ${
                    isSelected
                      ? "ring-2 ring-blue-500 opacity-100"
                      : focused?.name === v.name
                        ? "ring-2 ring-purple-400"
                        : "hover:ring-2 hover:ring-blue-300 hover:shadow-sm opacity-80 hover:opacity-100"
                  }`}
                >
                  {v.imageUrl ? (
                    <Image
                      src={v.imageUrl}
                      alt={v.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {v.name[0]}
                    </div>
                  )}
                  {/* Slot number badge */}
                  {isSelected && (
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">
                        {currentSlot + 1}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 px-0.5 py-0.5">
                    <p className="text-[8px] text-white truncate text-center font-medium">
                      {v.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No results</p>
          )}
        </div>

        {/* Detail panel */}
        <div className="hidden md:block w-48 shrink-0">
          {focused ? (
            <div className="bg-white rounded-xl border border-gray-200 sticky top-4 overflow-hidden">
              {focused.imageUrl && (
                <div className="relative w-full aspect-square bg-gray-50">
                  <Image
                    src={focused.imageUrl}
                    alt={focused.name}
                    fill
                    className="object-contain"
                    sizes="192px"
                  />
                </div>
              )}
              <div className="p-3">
                <p className="font-bold text-sm text-gray-900 mb-0.5">{focused.name}</p>
                {focused.flavor && (
                  <p className="text-[11px] text-gray-400 italic mb-2 line-clamp-2">
                    {focused.flavor}
                  </p>
                )}
                <div className="space-y-1 mb-2">
                  <StatBar label="HP" value={focused.hp} max={120} color="green" />
                  <StatBar label="ATK" value={focused.attack} max={20} color="red" />
                  <StatBar label="SPD" value={focused.speed} max={10} color="blue" />
                </div>
                {focused.powerName && (
                  <div className="bg-purple-50 border border-purple-100 rounded p-2">
                    <p className="text-[10px] font-bold text-purple-900 mb-0.5">
                      ✨ {focused.powerName}
                    </p>
                    <p className="text-[10px] text-purple-700 leading-tight">
                      {focused.powerDescription}
                    </p>
                  </div>
                )}
                {/* Add/Remove button */}
                {slotOf(focused.name) === -1 ? (
                  <button
                    type="button"
                    onClick={() => handleMonClick(focused)}
                    disabled={slots.every(Boolean)}
                    className="mt-2 w-full bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add to team
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => clearSlot(slotOf(focused.name), e as unknown as React.MouseEvent)}
                    className="mt-2 w-full bg-red-50 text-red-600 border border-red-200 text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-red-100"
                  >
                    Remove (slot {slotOf(focused.name) + 1})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center sticky top-4">
              <p className="text-2xl mb-2">👆</p>
              <p className="text-xs text-gray-400">Click a vellymon to see details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
