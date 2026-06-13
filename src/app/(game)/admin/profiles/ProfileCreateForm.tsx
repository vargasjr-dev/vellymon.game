"use client";

import { useState, useTransition } from "react";
import { createProfileAction } from "./actions";
import MonTeamSelector, { type VellymonData } from "./MonTeamSelector";

export default function ProfileCreateForm({
  vellymons,
}: {
  vellymons: VellymonData[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 6 slots: [active1, active2, active3, active4, bench1, bench2]
  const [slots, setSlots] = useState<string[]>(["", "", "", "", "", ""]);
  const [randomness, setRandomness] = useState(0.5);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    fd.set("teamNames", slots.filter(Boolean).join(","));
    fd.set("randomness", String(randomness));

    startTransition(async () => {
      try {
        await createProfileAction(fd);
        setSuccess(true);
        setSlots(["", "", "", "", "", ""]);
        setRandomness(0.5);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create profile");
      }
    });
  }

  const filledCount = slots.filter(Boolean).length;
  const needsAutoSelect = filledCount < 6;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          name="name"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Aggro Hard"
        />
        <p className="text-xs text-gray-400 mt-0.5">
          ID will be auto-generated from this name
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prompt{" "}
          <span className="text-gray-400 font-normal">(required)</span>
        </label>
        <textarea
          name="description"
          required
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Describe this AI player's personality and strategy. This becomes the user message prefix for every turn.&#10;&#10;Example: You are an aggressive vellymon player. Always push forward and attack the nearest enemy. Prioritize targeting low-HP mons to finish them off quickly. Don't retreat unless you have no other option."
        />
        <p className="text-xs text-gray-400 mt-0.5">
          This is the AI player's identity — it shapes every decision it makes.
        </p>
      </div>

      {/* Randomness slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">
            Randomness
          </label>
          <span className="text-sm font-mono text-gray-600">
            {randomness.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={randomness}
          onChange={(e) => setRandomness(parseFloat(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>0.0 — Deterministic</span>
          <span>1.0 — Very random</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Maps to LLM temperature. Lower = more predictable play; higher = more creative/chaotic.
        </p>
      </div>

      {/* Mon selector */}
      <div>
        <MonTeamSelector
          vellymons={vellymons}
          slots={slots}
          onChange={setSlots}
        />
        {needsAutoSelect && filledCount === 0 && (
          <p className="text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mt-2">
            ✨ Leave all slots empty and Haiku will pick a team that fits your prompt.
          </p>
        )}
        {needsAutoSelect && filledCount > 0 && (
          <p className="text-xs text-purple-600 mt-1">
            ✨ {6 - filledCount} slot{6 - filledCount > 1 ? "s" : ""} will be auto-filled by Haiku based on your prompt.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          ✅ Profile created!
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create Profile"}
      </button>
    </form>
  );
}
