"use client";

import { useState } from "react";
import VellymonCard from "~/components/VellymonCard";
import BuyButton from "./BuyButton";

type FilterKey = "all" | "available" | "owned";

interface MarketVellymon {
  uuid: string;
  name: string;
  health: number;
  attack: number;
  speed: number;
  energy: number;
  flavor?: string;
  imageUrl?: string;
  isOwned: boolean;
}

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "owned", label: "Owned" },
];

export default function MarketGrid({
  vellymons,
}: {
  vellymons: MarketVellymon[];
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filtered = vellymons.filter((v) => {
    if (filter === "available" && v.isOwned) return false;
    if (filter === "owned" && !v.isOwned) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const ownedCount = vellymons.filter((v) => v.isOwned).length;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Filter toggles */}
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                filter === f.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {f.label}
              {f.key === "owned" && ` (${ownedCount})`}
              {f.key === "available" &&
                ` (${vellymons.length - ownedCount})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1 min-w-[160px]"
        />
      </div>

      {/* Results count */}
      {(filter !== "all" || search) && (
        <p className="text-sm text-gray-500 mb-4">
          Showing {filtered.length} of {vellymons.length} vellymons
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((vellymon) => (
          <VellymonCard
            key={vellymon.uuid}
            name={vellymon.name}
            health={vellymon.health}
            attack={vellymon.attack}
            speed={vellymon.speed}
            energy={vellymon.energy}
            flavor={vellymon.flavor}
            imageUrl={vellymon.imageUrl}
            variant="compact"
          >
            {vellymon.isOwned ? (
              <div className="mt-4 w-full bg-green-100 text-green-700 px-4 py-2 rounded text-center font-medium text-sm">
                ✓ Owned
              </div>
            ) : (
              <BuyButton
                modelUuid={vellymon.uuid}
                vellymonName={vellymon.name}
              />
            )}
          </VellymonCard>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-500">
            No vellymons match your filters.
          </p>
        </div>
      )}
    </div>
  );
}
