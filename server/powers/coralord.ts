/**
 * Coralord — "Tide Harvest"
 *
 * When Coralord harvests, the energy gained is doubled. The reef
 * pulls resources from the ocean floor that others can't reach.
 *
 * Hook: onAfterCommand (harvest)
 * Effect: energy +N to own team (where N = energy already gained this harvest)
 *
 * Design: Coralord is a mid-tank (HP 95, ATK 11, SPD 3). Tide Harvest
 * rewards positioning near harvestable spaces — a single harvest becomes
 * a power play. Forces opponents to contest Coralord's harvest tiles
 * aggressively or fall behind on energy economy.
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "tide-harvest",
  name: "Tide Harvest",
  description: "Harvesting doubles the energy received.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      if (ctx.command.type !== "harvest") return [];
      if (!ctx.commandResult?.success) return [];
      const gained = ctx.commandResult.energyDelta ?? 0;
      if (gained <= 0) return [];
      return [{ type: "energy", team: ctx.team, amount: gained }];
    },
  },
});
