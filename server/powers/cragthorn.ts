/**
 * Cragthorn — "Thorns"
 *
 * Attackers take 3 damage when they hit Cragthorn.
 * Thorny rock formations punish melee contact.
 *
 * Hook: onReceiveDamage
 * Effect: reflect 3 damage back to attacker
 *
 * Design rationale: Cragthorn is tank (HP 110, ATK 10, SPD 1)
 * and "covered in thorny rock formations." Thorns is the classic
 * damage reflection — every attack against Cragthorn costs the
 * attacker 3 HP. Combined with 110 HP, this means an attacker
 * dealing 15 damage per hit needs ~8 hits to kill Cragthorn,
 * taking 24 reflected damage in the process. Glass cannons with
 * low HP will think twice. Pairs well with Buldrok's Stone Skin
 * on the same team — one reduces incoming damage, the other
 * punishes attackers. SPD 1 means Cragthorn can't chase, so
 * opponents can choose to ignore it (at the cost of board control).
 */

import {
  registerPower,
  type DamageHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "thorns",
  name: "Thorns",
  description:
    "Attackers take 3 damage when they hit Cragthorn. Touch at your peril.",
  hooks: {
    onReceiveDamage: (ctx: DamageHookContext): PowerEffect[] => {
      if (ctx.damage <= 0 || !ctx.attacker) return [];

      return [
        {
          type: "reflectDamage",
          targetId: ctx.attacker.uuid,
          amount: 3,
        },
      ];
    },
  },
});
