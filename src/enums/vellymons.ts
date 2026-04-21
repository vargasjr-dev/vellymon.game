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
 * Generate a deterministic UUID from a vellymon library ID.
 *
 * Format: 00be1100-{id_hex}-4000-8000-{id_hex_padded_12}
 *
 * Uses only valid hex characters so PostgreSQL accepts it as a uuid.
 * The "0be11" prefix is a nod to "vellymon" in hex-safe form.
 * Deterministic: same ID always produces the same UUID.
 */
function idToUuid(id: number): string {
  const hex4 = id.toString(16).padStart(4, "0");
  const hex12 = id.toString(16).padStart(12, "0");
  return `00be1100-${hex4}-4000-8000-${hex12}`;
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
    imageUrl: t.imageUrl,
    specialPowerId: t.specialPowerId,
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
