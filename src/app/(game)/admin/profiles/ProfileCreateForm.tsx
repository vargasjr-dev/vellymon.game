"use client";

import { useState, useTransition } from "react";
import { createProfileAction } from "./actions";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export default function ProfileCreateForm({
  allVellymonNames,
}: {
  allVellymonNames: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Team builder — up to 6 slots
  const [slots, setSlots] = useState<string[]>(["", "", "", "", "", ""]);

  function setSlot(i: number, value: string) {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    // Inject teamNames from controlled slots (FormData textarea is a fallback)
    const validSlots = slots.filter(Boolean);
    fd.set("teamNames", validSlots.join(","));

    startTransition(async () => {
      try {
        await createProfileAction(fd);
        setSuccess(true);
        setSlots(["", "", "", "", "", ""]);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create profile");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID <span className="text-gray-400 font-normal">(slug, e.g. aggro-hard)</span>
          </label>
          <input
            name="id"
            required
            pattern="[a-z0-9\-]+"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="aggro-hard"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            name="name"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Aggro Hard"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
        <select
          name="aiDifficulty"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          defaultValue="medium"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team{" "}
          <span className="text-gray-400 font-normal">
            (slots 1–4 = active starters, 5–6 = bench)
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {slots.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-12 shrink-0">
                {i < 4 ? `Active ${i + 1}` : `Bench ${i - 3}`}
              </span>
              <select
                value={val}
                onChange={(e) => setSlot(i, e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="">— pick —</option>
                {allVellymonNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          At least 4 active slots required. Bench slots are optional.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          name="description"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Fast aggro team, targets low-HP mons first"
        />
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
        {pending ? "Creating..." : "Create Profile"}
      </button>
    </form>
  );
}
