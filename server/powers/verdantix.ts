/**
 * Verdantix — "Crystal Growth"
 *
 * At the start of each turn, Verdantix's green crystal
 * structure grows — gaining +1 ATK passively. The longer
 * it stays alive, the more dangerous it becomes.
 *
 * Hook: onTurnStart
 * Effect: bonus_damage +1 on self
 *
 * Design: Verdantix is balanced (HP 78, ATK 11, SPD 5).
 * A true mid-liner with a scaling mechanic. Unlike
 * Rustleclaw (+1 SPD per turn), Verdantix grows ATK.
 * Turn 1: ATK 11. Turn 5: ATK 16. Turn 10: ATK 21.
 * A ticking time bomb — ignore it and it becomes the
 * strongest hitter on the board. The crystal entity
 * that makes every extra turn count.
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "crystal_growth",
  name: "Crystal Growth",
  description:
    "Each turn, Verdantix grows +1 ATK.",
  hooks: {
    onTurnStart: (ctx: HookContext): PowerEffect[] => {
      return [
        {
          type: "bonus_damage",
          targetId: ctx.self.uuid,
          amount: 1,
        },
      ];
    },
  },
});
