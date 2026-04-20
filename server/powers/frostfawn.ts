/**
 * Frostfawn — "Frost Grace"
 *
 * At end of turn, Frostfawn heals 4 HP. Graceful patience.
 *
 * Hook: onTurnEnd
 * Effect: heal self 4 HP
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "frost-grace",
  name: "Frost Grace",
  description:
    "At end of turn, heals 4 HP. Grace over aggression.",
  hooks: {
    onTurnEnd: (ctx: HookContext): PowerEffect[] => {
      if (ctx.self.hp >= ctx.self.maxHp) return [];
      return [{ type: "heal", targetId: ctx.self.uuid, amount: 4 }];
    },
  },
});
