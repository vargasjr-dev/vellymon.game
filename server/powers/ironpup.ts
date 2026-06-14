/**
 * Ironpup — "Loyal Guard"
 *
 * When Ironpup takes damage, it bites back for 2 damage AND
 * heals 1 HP. A scrappy pup that never backs down — every
 * hit it takes gets answered with teeth and determination.
 *
 * Hook: onDamaged
 * Effect: 2 bonus_damage to attacker + heal self 1 HP
 *
 * Design: Ironpup is balanced (HP 70, ATK 14, SPD 5). Good
 * all-round stats. Loyal Guard makes attacking Ironpup costly
 * — 2 chip damage + 1 self-heal means each hit costs the
 * attacker 3 effective HP of value. Forces opponents to choose
 * between efficient targets. Pairs well with Buldrok (Stone
 * Skin) but the effects stack differently — Ironpup retaliates,
 * Buldrok absorbs.
 */

import {
  registerPower,
  type DamagedHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "loyal-guard",
  name: "Loyal Guard",
  description:
    "When hit, bites back for 2 damage and heals 1 HP.",
  hooks: {
    onDamaged: (ctx: DamagedHookContext): PowerEffect[] => {
      if (ctx.self.hp <= 0) return [];
      if (ctx.damage <= 0) return [];

      return [
        {
          type: "bonus_damage",
          targetId: ctx.attacker.uuid,
          amount: 2,
        },
        {
          type: "heal",
          targetId: ctx.self.uuid,
          amount: 1,
        },
      ];
    },
  },
});
