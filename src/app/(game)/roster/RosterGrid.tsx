"use client";

import { useState } from "react";
import VellymonCard from "~/components/VellymonCard";

type SortKey = "name" | "health" | "attack" | "speed" | "energy";

interface RosterVellymon {
  uuid: string;
  name: string;
  health: number;
  attack: number;
  speed: number;
  energy: number;
  imageUrl?: string;
}

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "health", label: "HP" },
  { key: "attack", label: "ATK" },
  { key: "speed", label: "SPD" },
  { key: "energy", label: "NRG" },
];

export default function RosterGrid({ roster }: { roster: RosterVellymon[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const sorted = [...roster].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const cmp =
      typeof aVal === "string"
        ? aVal.localeCompare(bVal as string)
        : (aVal as number) - (bVal as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      {/* Sort Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-sm text-gray-500 font-medium">Sort by:</span>
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleSort(opt.key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              sortBy === opt.key
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {opt.label}
            {sortBy === opt.key && (
              <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((vellymon) => (
          <VellymonCard
            key={vellymon.uuid}
            name={vellymon.name}
            health={vellymon.health}
            attack={vellymon.attack}
            speed={vellymon.speed}
            energy={vellymon.energy}
            imageUrl={vellymon.imageUrl}
            href={`/player/${vellymon.uuid}`}
            variant="compact"
          />
        ))}
      </div>
    </div>
  );
}
