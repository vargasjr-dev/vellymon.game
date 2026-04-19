/**
 * Barrikade — "Iron Curtain"
 *
 * When Barrikade is attacked, the attacker loses 2 SPD next turn.
 * Hit the wall, slow down.
 *
 * Hook: onReceiveDamage
 * Effect: debuff attacker SPD -2 (1 turn)
 *
 * Design rationale: Barrikade is the tankiest unit (HP 102, SPD 2) and
 * "blocks everything." Iron Curtain punishes aggressive opponents who
 * try to burst through — their speed drops, making them vulnerable to
 * flanking or letting Barrikade's allies catch up. Forces opponents to
 * think twice before engaging the wall head-on. The SPD debuff is
 * thematic (you slam into a barricade, you stagger) and strategic
 * (slower enemies can't reposition easily).
 */

import {
  registerPower,
  type DamageHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "iron-curtain",
  name: "Iron Curtain",
  description:
    "When attacked, the attacker loses 2 SPD next turn. Hit the wall, slow down.",
  hooks: {
    onReceiveDamage: (ctx: DamageHookContext): PowerEffect[] => {
      // Only trigger when actually taking damage from another vellymon
      if (ctx.damage <= 0 || !ctx.attackerId) return [];

      return [
        {
          type: "debuff",
          targetId: ctx.attackerId,
          stat: "speed",
          amount: -2,
          duration: 1,
        },
      ];
    },
  },
});
