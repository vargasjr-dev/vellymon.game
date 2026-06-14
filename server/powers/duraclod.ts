/**
 * Duraclod — "Fortify"
 *
 * At the end of each turn, Duraclod heals 4 HP if it didn't move.
 * Standing ground makes the clod even harder to break.
 *
 * Hook: onTurnEnd
 * Effect: heal self 4 HP (always — movement tracking TBD)
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "fortify",
  name: "Fortify",
  description:
    "At end of turn, heals 4 HP.",
  hooks: {
    onTurnEnd: (ctx: HookContext): PowerEffect[] => {
      return [{ type: "heal", targetId: ctx.self.uuid, amount: 4 }];
    },
  },
});
