/**
 * Cragthorn — "Thorns"
 *
 * Attackers take 3 damage when they hit Cragthorn.
 * Thorny rock formations punish melee contact.
 *
 * Hook: onDamaged
 * Effect: bonus_damage 3 to attacker
 */

import {
  registerPower,
  type DamagedHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "thorns",
  name: "Thorns",
  description:
    "Attackers take 3 damage when they hit Cragthorn.",
  hooks: {
    onDamaged: (ctx: DamagedHookContext): PowerEffect[] => {
      if (ctx.damage <= 0 || !ctx.attacker) return [];
      return [{ type: "bonus_damage", targetId: ctx.attacker.uuid, amount: 3 }];
    },
  },
});
