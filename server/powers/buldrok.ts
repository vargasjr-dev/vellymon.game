/**
 * Buldrok — "Stone Skin"
 *
 * Buldrok takes 2 less damage from all attacks (minimum 1).
 * Ancient stone armor — nearly indestructible.
 *
 * Hook: onReceiveDamage
 * Effect: reduce incoming damage by 2
 *
 * Design rationale: Buldrok is THE wall — highest HP in the game
 * (120) with the lowest SPD (1). Stone Skin stacks with the massive
 * HP pool to make Buldrok absurdly durable. Every attack does 2 less
 * damage, which is huge against low-ATK supports and balanced units
 * (13 ATK → 11 effective) but less impactful against glass cannons
 * (20 ATK → 18). This creates natural counter-play: you need heavy
 * hitters to break through, not chip damage. The minimum 1 ensures
 * Buldrok can never become truly invulnerable.
 */

import {
  registerPower,
  type DamageHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "stone-skin",
  name: "Stone Skin",
  description:
    "Takes 2 less damage from all attacks (minimum 1). Ancient stone armor.",
  hooks: {
    onReceiveDamage: (ctx: DamageHookContext): PowerEffect[] => {
      if (ctx.damage <= 0) return [];

      const reduction = Math.min(2, ctx.damage - 1); // Never reduce below 1
      if (reduction <= 0) return [];

      return [
        {
          type: "damageReduction",
          targetId: ctx.self.uuid,
          amount: reduction,
        },
      ];
    },
  },
});
