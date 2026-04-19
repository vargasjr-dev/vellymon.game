/**
 * Blastova — "Supernova Burst"
 *
 * Blastova's first attack each match deals +5 bonus damage.
 * A living supernova — bright, hot, and short-lived.
 *
 * Hook: onDealDamage
 * Effect: +5 damage on first attack, then exhausted
 *
 * Design rationale: Blastova is pure glass cannon (HP 45, ATK 20, SPD 4)
 * and described as "short-lived." Supernova Burst rewards aggressive
 * opening plays — land one massive hit before the fragile body
 * crumbles. The +5 bonus on top of ATK 20 makes the first strike
 * devastating (25 effective). After that, Blastova is still dangerous
 * at base ATK 20 but has lost the element of surprise. Encourages
 * opponents to avoid being the first target.
 */

import {
  registerPower,
  type DamageHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "supernova-burst",
  name: "Supernova Burst",
  description:
    "First attack each match deals +5 bonus damage. Bright, hot, short-lived.",
  hooks: {
    onDealDamage: (ctx: DamageHookContext): PowerEffect[] => {
      // Check if this is Blastova's first attack (no prior attacks logged)
      const hasAttackedBefore = ctx.self.attackCount && ctx.self.attackCount > 1;
      if (hasAttackedBefore) return [];

      return [
        {
          type: "bonusDamage",
          targetId: ctx.targetId,
          amount: 5,
        },
      ];
    },
  },
});
