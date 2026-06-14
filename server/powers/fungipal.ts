/**
 * Fungipal — "Spore Harvest"
 *
 * On turn start, generates +1 energy for the team.
 * A living economy engine.
 *
 * Hook: onTurnStart
 * Effect: energy +1 to team
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "spore-harvest",
  name: "Spore Harvest",
  description:
    "On turn start, generates +1 bonus energy for the team.",
  hooks: {
    onTurnStart: (ctx: HookContext): PowerEffect[] => {
      if (ctx.self.hp <= 0 || !ctx.self.position) return [];
      return [{ type: "energy", team: ctx.team, amount: 1 }];
    },
  },
});
