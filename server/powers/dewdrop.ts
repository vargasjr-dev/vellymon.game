/**
 * Dewdrop — "Cleansing Mist"
 *
 * At the start of each turn, Dewdrop heals the lowest-HP ally for 3 HP.
 *
 * Hook: onTurnStart
 * Effect: heal lowest-HP ally 3 HP
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "cleansing-mist",
  name: "Cleansing Mist",
  description:
    "Each turn, heals the lowest-HP ally for 3 HP.",
  hooks: {
    onTurnStart: (ctx: HookContext): PowerEffect[] => {
      const allies = ctx.state.teams[ctx.team - 1].active.filter(
        (a) => !a.isKO,
      );
      if (allies.length === 0) return [];
      const lowest = allies.reduce((min, a) =>
        a.hp / a.maxHp < min.hp / min.maxHp ? a : min,
      );
      return [{ type: "heal", targetId: lowest.uuid, amount: 3 }];
    },
  },
});
