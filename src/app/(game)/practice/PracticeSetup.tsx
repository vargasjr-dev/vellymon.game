"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSparringMatchAction } from "./actions";
import type { AIDifficulty } from "../../../../server/ai-opponent";
import { MAP_OPTIONS } from "~/lib/matchSettings";
import VellymonPremiumLogo from "~/components/VellymonPremiumLogo";

type TeamOption = { uuid: string; name: string };

const DIFFICULTIES: {
  value: AIDifficulty;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    value: "easy",
    label: "Easy",
    icon: "🟢",
    desc: "Random moves — good for learning",
  },
  {
    value: "medium",
    label: "Medium",
    icon: "🟡",
    desc: "Basic strategy — a real workout",
  },
  {
    value: "hard",
    label: "Hard",
    icon: "🔴",
    desc: "Optimized play — prepare to sweat",
  },
];

interface PracticeSetupProps {
  teams: TeamOption[];
  subscribed: boolean;
}

export default function PracticeSetup({
  teams,
  subscribed,
}: PracticeSetupProps) {
  const router = useRouter();
  const [teamUuid, setTeamUuid] = useState(teams[0]?.uuid ?? "");
  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");
  const [mapId, setMapId] = useState("standard");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!teamUuid) return;
    setCreating(true);
    setError(null);

    const result = await createSparringMatchAction(teamUuid, difficulty, mapId);

    if (result.success) {
      router.push(`/matches/${result.matchUuid}`);
    } else {
      setError(result.error);
      setCreating(false);
    }
  }

  if (!subscribed) {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-5">
          <VellymonPremiumLogo />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Premium Required
        </h2>
        <p className="text-gray-600 mb-4">
          Practice Mode is a Premium feature — subscribe to battle custom
          opponent profiles and sharpen your strategy.
        </p>
        <a
          href="/subscribe"
          className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-lg"
        >
          Subscribe — $8/month
        </a>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🏗️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Teams Yet</h2>
        <p className="text-gray-600 mb-4">
          Build a team first, then come back for sparring practice.
        </p>
        <a
          href="/roster"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-lg"
        >
          Build a Team
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Team
        </label>
        <select
          value={teamUuid}
          onChange={(e) => setTeamUuid(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {teams.map((t) => (
            <option key={t.uuid} value={t.uuid}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Difficulty Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opponent Difficulty
        </label>
        <div className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`p-4 rounded-xl border-2 text-center transition ${
                difficulty === d.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-2xl block mb-1">{d.icon}</span>
              <span className="font-bold text-sm text-gray-900">{d.label}</span>
              <p className="text-xs text-gray-500 mt-1">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Map Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Map
        </label>
        <div className="grid grid-cols-2 gap-3">
          {MAP_OPTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMapId(m.id)}
              className={`p-3 rounded-lg border-2 text-left transition ${
                mapId === m.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="font-medium text-sm text-gray-900">
                {m.name}
              </span>
              <span className="text-xs text-gray-400 ml-2">{m.dimensions}</span>
              <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        onClick={handleStart}
        disabled={creating || !teamUuid}
        className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all"
      >
        {creating ? "Setting up match…" : "🥊 Start Practice"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Practice Mode has no ranked impact. Train freely!
      </p>
    </div>
  );
}
