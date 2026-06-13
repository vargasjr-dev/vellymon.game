/**
 * matchSetup.ts — shared team setup builder for CLI matches and scripts.
 *
 * Lives in server/ so both cli/vellymon.ts and scripts/auto-match.ts
 * use the same logic with no duplication.
 */

import { GAME_CONFIG } from "./config";
import { getDefaultSpawnPositions } from "./board";

import type { VellymonTemplate } from "./vellymonLibrary";
import type { TeamSetup, VellymonSetup } from "./engine";

/**
 * Build a TeamSetup from an array of vellymon templates.
 *
 * - First `activeSlots` templates become active starters on correct spawn positions.
 * - Remaining templates go to bench.
 * - Spawn positions come from getDefaultSpawnPositions (engine-authoritative).
 */
export function buildTeamSetup(
  templates: VellymonTemplate[],
  teamId: 1 | 2,
): TeamSetup {
  const spawns = getDefaultSpawnPositions(
    teamId,
    GAME_CONFIG.board.width,
    GAME_CONFIG.board.height,
  );

  const vellymons: VellymonSetup[] = templates.map((t, i) => ({
    uuid: `${teamId}-${i}`,
    name: t.name,
    maxHp: t.hp,
    speed: t.speed,
    attack: t.attack,
    attacks: t.attacks.map((a) => ({
      key: a.key,
      name: a.name,
      damage: a.damage,
      energyCost: a.energyCost,
      range: a.range,
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
