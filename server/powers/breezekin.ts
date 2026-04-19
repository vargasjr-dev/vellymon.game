/**
 * Breezekin — "Tailwind"
 *
 * When Breezekin moves, its next attack deals +3 bonus damage.
 * Wind at your back. Position into power.
 *
 * Hook: onAfterCommand (move only)
 * Effect: buff self "tailwind" (+3 ATK) for 1 turn
 *
 * Design rationale: Breezekin is balanced (HP 75, ATK 13, SPD 5)
 * and described as "light on its feet, steady aim." Tailwind
 * rewards tactical repositioning — move to a good position, then
 * unleash a wind-boosted strike (16 effective ATK). Encourages
 * a move→attack rhythm rather than standing still and trading
 * blows. Synergizes with the balanced archetype's versatility:
 * enough HP to survive while positioning, enough speed to
 * execute the two-turn combo reliably.
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "tailwind",
  name: "Tailwind",
  description:
    "After moving, next attack deals +3 bonus damage. Wind at your back.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      // Only trigger on move commands
      if (ctx.command.type !== "move") return [];

      return [
        {
          type: "buff",
          targetId: ctx.self.uuid,
          stat: "attack",
          amount: 3,
          duration: 1,
        },
      ];
    },
  },
});
