/**
 * Nectarb — "Sweet Nectar"
 *
 * At the start of each turn, Nectarb passively generates +1
 * energy for its team. The sweet nectar drips and converts
 * directly into pure energy.
 *
 * Hook: onTurnStart
 * Effect: energy +1
 *
 * Design: Nectarb is a support (HP 75, ATK 9, SPD 7).
 * Well-rounded stats with moderate survivability. Sweet Nectar
 * is an economy accelerator — 1 free energy per turn adds up
 * fast toward the 120 accumulation win. Unlike Gleamoss (which
 * requires harvesting), Nectarb's energy gen is completely
 * passive. Pair with harvesters for an energy-focused strategy.
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "sweet_nectar",
  name: "Sweet Nectar",
  description:
    "Passively generates +1 energy per turn. Nectar converts to pure energy.",
  hooks: {
    onTurnStart: (ctx: HookContext): PowerEffect[] => {
      if (ctx.self.hp <= 0) return [];

      return [
        {
          type: "energy",
          team: ctx.team,
          amount: 1,
        },
      ];
    },
  },
});
