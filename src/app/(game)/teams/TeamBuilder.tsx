"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "~/components/Toast";
import { createTeamAction, updateTeamAction } from "./actions";
import type { SlotInput } from "~/data/createTeam.server";

type RosterVellymon = {
  uuid: string;
  name: string;
  health: number;
  attack: number;
  speed: number;
  energy: number;
  modelUuid: string;
};

type ExistingSlot = {
  vellymonInstanceUuid: string;
  slotIndex: number;
  isActive: boolean;
};

type TeamBuilderProps = {
  roster: RosterVellymon[];
  mode: "create" | "edit";
  teamUuid?: string;
  initialName?: string;
  initialSlots?: ExistingSlot[];
};

type BuilderSlot = {
  vellymonInstanceUuid: string;
  isActive: boolean;
};

export default function TeamBuilder({
  roster,
  mode,
  teamUuid,
  initialName = "",
  initialSlots = [],
}: TeamBuilderProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [name, setName] = useState(initialName);
  const [slots, setSlots] = useState<BuilderSlot[]>(
    initialSlots.map((s) => ({
      vellymonInstanceUuid: s.vellymonInstanceUuid,
      isActive: s.isActive,
    })),
  );
  const [saving, setSaving] = useState(false);

  const assignedUuids = new Set(slots.map((s) => s.vellymonInstanceUuid));

  // Get model UUIDs already in slots (for dupe-type prevention)
  const assignedModelUuids = new Set(
    slots
      .map((s) => roster.find((r) => r.uuid === s.vellymonInstanceUuid)?.modelUuid)
      .filter(Boolean),
  );

  const availableRoster = roster.filter((v) => {
    if (assignedUuids.has(v.uuid)) return false;
    // Don't show vellymons whose type is already in the team
    if (assignedModelUuids.has(v.modelUuid)) return false;
    return true;
  });

  const addVellymon = (instanceUuid: string) => {
    if (slots.length >= 8) return;
    setSlots((prev) => [
      ...prev,
      { vellymonInstanceUuid: instanceUuid, isActive: false },
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      addToast("Team name is required", "error");
      return;
    }

    setSaving(true);

    // Auto-set first 4 slots as active lineup, rest as bench
    const slotInputs: SlotInput[] = slots.map((s, i) => ({
      vellymonInstanceUuid: s.vellymonInstanceUuid,
      slotIndex: i,
      isActive: i < 4,
    }));

    try {
      const result =
        mode === "create"
          ? await createTeamAction(name.trim(), slotInputs)
          : await updateTeamAction(teamUuid!, name.trim(), slotInputs);

      if (result.success) {
        addToast(result.message, "success");
        router.push("/teams");
        router.refresh();
      } else {
        addToast(result.message, "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  const getVellymon = (uuid: string) => roster.find((v) => v.uuid === uuid);

  return (
    <div className="space-y-8">
      {/* Team Name */}
      <div>
        <label
          htmlFor="teamName"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Team Name
        </label>
        <input
          id="teamName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a team name..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          maxLength={64}
        />
      </div>

      {/* Team Slots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">
            Team Slots ({slots.length}/8)
          </h2>
          <span className="text-sm text-gray-500">
            Pick up to 8 vellymons
          </span>
        </div>

        {slots.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-400">
              Add vellymons from your roster below
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.map((slot, index) => {
              const v = getVellymon(slot.vellymonInstanceUuid);
              return (
                <div
                  key={`${slot.vellymonInstanceUuid}-${index}`}
                  className="border-2 border-gray-200 bg-white rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate">
                        {v?.name ?? "Unknown"}
                      </p>
                    </div>
                    {v && (
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>HP {v.health}</span>
                        <span>ATK {v.attack}</span>
                        <span>SPD {v.speed}</span>
                        <span>NRG {v.energy}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeSlot(index)}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 font-medium transition ml-3"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Roster */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Add from Roster
        </h2>

        {roster.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-400">
              No vellymons in your roster. Visit the Market first!
            </p>
          </div>
        ) : availableRoster.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-400 text-sm">
              {slots.length >= 8
                ? "Team is full (8/8 slots)"
                : "All eligible roster vellymons are assigned"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableRoster.map((v) => (
              <button
                key={v.uuid}
                onClick={() => addVellymon(v.uuid)}
                disabled={slots.length >= 8}
                className="border border-gray-200 rounded-lg p-3 text-left hover:border-blue-400 hover:shadow-md transition group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 truncate">
                  {v.name}
                </p>
                <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-gray-500">
                  <span>HP {v.health}</span>
                  <span>ATK {v.attack}</span>
                  <span>SPD {v.speed}</span>
                  <span>NRG {v.energy}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => router.push("/teams")}
          className="text-gray-600 hover:text-gray-900 font-medium transition"
        >
          ← Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? "Saving..."
            : mode === "create"
              ? "Create Team"
              : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
