/**
 * Fungipal — "Spore Harvest"
 *
 * On turn start, Fungipal gains +1 bonus energy from the ground.
 * A friendly fungus that feeds the team's economy.
 *
 * Hook: onTurnStart
 * Effect: energy +1 to Fungipal's team
 *
 * Design: Fungipal is pure support (HP 82, ATK 8, SPD 6). Low
 * attack but tanky enough to survive. Spore Harvest makes it an
 * accumulation win condition enabler — park Fungipal on the board
 * and it passively fuels the team. Every turn alive = +1 energy
 * toward that 120 accumulation threshold.
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
    "On turn start, generates +1 bonus energy for the team. A living economy engine.",
  hooks: {
    onTurnStart: (ctx: HookContext): PowerEffect[] => {
      // Only works while Fungipal is alive and on the board
      if (ctx.self.hp <= 0) return [];
      if (!ctx.self.position) return [];

      return [
        {
          type: "energy",
          teamId: ctx.team,
          amount: 1,
        },
      ];
    },
  },
});
