/**
 * Bridge between the 64-vellymon library (server/vellymonLibrary.ts)
 * and the client-facing VellymonStats type used by market/roster/UI.
 *
 * Generates stable UUIDs from library IDs so the market, purchases,
 * and team slots all reference consistent model identifiers.
 */
import type { VellymonStats } from "../types/game";
import {
  VELLYMON_LIBRARY,
  type VellymonTemplate,
} from "../../server/vellymonLibrary";
import { calculateDamage } from "../../server/archetypes";

/**
 * Generate a deterministic UUID v5-style string from a vellymon ID.
 * Uses a simple hash to create stable UUIDs across restarts.
 */
function idToUuid(id: number): string {
  const hex = id.toString(16).padStart(8, "0");
  // Format: vellymon-0000-4000-8000-{id padded}
  return `ve11ym0n-${hex.slice(0, 4)}-4${hex.slice(4, 7)}-8000-00000000${hex}`;
}

/**
 * Convert a library template to the client-facing VellymonStats format.
 */
function templateToStats(t: VellymonTemplate): VellymonStats {
  return {
    uuid: idToUuid(t.id),
    name: t.name,
    health: t.hp,
    attack: t.attack,
    speed: t.speed,
    energy: 0, // Energy is team-wide now, not per-vellymon
    attacks: t.attacks.map((atk) => ({
      name: atk.name,
      damage: calculateDamage(atk, t.attack),
      energyCost: atk.energyCost,
    })),
    flavor: t.flavor,
  };
}

/** All 64 vellymons as VellymonStats for the market/UI layer */
const all: VellymonStats[] = VELLYMON_LIBRARY.map(templateToStats);

export default all;

/** Lookup helpers */
export const vellymonByUuid = new Map<string, VellymonStats>(
  all.map((v) => [v.uuid, v]),
);

export const vellymonByName = new Map<string, VellymonStats>(
  all.map((v) => [v.name.toLowerCase(), v]),
);

/** Convert a library ID to UUID */
export { idToUuid };
