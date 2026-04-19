/**
 * Coralord — "Reef Armor"
 *
 * Heals 2 HP at the end of each turn. Coral slowly regenerates.
 *
 * Hook: onTurnEnd
 * Effect: self-heal 2 HP
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "reef-armor",
  name: "Reef Armor",
  description: "Heals 2 HP at the end of each turn. Coral slowly regenerates.",
  hooks: {
    onTurnEnd: (ctx: HookContext): PowerEffect[] => {
      return [{ type: "heal", targetId: ctx.self.uuid, amount: 2 }];
    },
  },
});
