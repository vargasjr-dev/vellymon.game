"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteTeamAction } from "./actions";
import { useToast } from "~/components/Toast";

type TeamSlot = {
  uuid: string;
  slotIndex: number;
  isActive: boolean;
  vellymon: {
    name: string;
    health: number;
    attack: number;
    speed: number;
    energy: number;
  } | null;
};

type Team = {
  uuid: string;
  name: string;
  createdAt: Date;
  slots: TeamSlot[];
  activeCount: number;
};

export default function TeamCard({ team }: { team: Team }) {
  const router = useRouter();
  const { addToast } = useToast();

  const activeSlots = team.slots.filter((s) => s.isActive);
  const benchSlots = team.slots.filter((s) => !s.isActive);

  const handleDelete = async () => {
    const result = await deleteTeamAction(team.uuid);
    if (result.success) {
      addToast(result.message, "success");
      router.refresh();
    } else {
      addToast(result.message, "error");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
          <p className="text-sm text-gray-500">
            {team.slots.length}/8 slots · {team.activeCount}/4 active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teams/${team.uuid}/edit`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Active Lineup */}
      {activeSlots.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
            Active Lineup
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {activeSlots.map((slot) => (
              <div
                key={slot.uuid}
                className="border border-green-200 bg-green-50 rounded-lg p-3 text-center"
              >
                <p className="text-sm font-bold text-gray-900 truncate">
                  {slot.vellymon?.name ?? "Unknown"}
                </p>
                {slot.vellymon && (
                  <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-gray-500">
                    <span>HP {slot.vellymon.health}</span>
                    <span>ATK {slot.vellymon.attack}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bench */}
      {benchSlots.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Bench
          </p>
          <div className="flex flex-wrap gap-2">
            {benchSlots.map((slot) => (
              <div
                key={slot.uuid}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600"
              >
                {slot.vellymon?.name ?? "Unknown"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {team.slots.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">
            No vellymons assigned.{" "}
            <Link
              href={`/teams/${team.uuid}/edit`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit team →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
