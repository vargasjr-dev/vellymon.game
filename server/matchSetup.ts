/**
 * matchSetup.ts — shared team setup builder for CLI matches and scripts.
 *
 * Lives in server/ so both cli/vellymon.ts and scripts/auto-match.ts
 * use the same logic with no duplication. Spawn positions always come
 * from the map — the same map the board is built from.
 */

import { GAME_CONFIG } from "./config";
import { getMapSpawnPositions, type MapConfig } from "./maps";

import type { VellymonTemplate } from "./vellymonLibrary";
import type { TeamSetup, VellymonSetup } from "./engine";

/**
 * Build a TeamSetup from an array of vellymon templates.
 *
 * - First `activeSlots` templates become active starters on correct spawn positions.
 * - Remaining templates go to bench.
 * - Spawn positions come from the map layout (getMapSpawnPositions).
 */
export function buildTeamSetup(
  templates: VellymonTemplate[],
  teamId: 1 | 2,
  map: MapConfig,
): TeamSetup {
  const spawns = getMapSpawnPositions(map, teamId);

  const vellymons: VellymonSetup[] = templates.map((t, i) => ({
    uuid: `${teamId}-${i}`,
    name: t.name,
    maxHp: t.hp,
    speed: t.speed,
    baseSpeed: t.speed,
    attack: t.attack,
    attacks: t.attacks.map((a) => ({
      key: a.key,
      name: a.name,
      damage: a.damage,
      energyCost: a.energyCost,
      range: a.range,
      ...(a.arcOver ? { arcOver: true } : {}),
    })),
    spawnPosition: spawns[i % spawns.length],
    specialPowerId: t.specialPowerId,
    imageUrl: t.imageUrl,
  }));

  const active = vellymons.slice(0, GAME_CONFIG.teams.activeSlots);
  const bench = vellymons.slice(GAME_CONFIG.teams.activeSlots);
  const teamName = `Team ${teamId} (${active.map((v) => v.name).join(", ")})`;

  return { userId: `cli-player-${teamId}`, teamName, active, bench };
}
