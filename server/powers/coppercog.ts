/**
 * Coppercog — "Overclock"
 *
 * Every third attack deals double damage.
 * Mechanical gears winding up to a devastating release.
 *
 * Hook: onAttack
 * Effect: track attack count, double damage on every 3rd hit
 *
 * Design rationale: Coppercog is balanced (HP 80, ATK 12, SPD 4)
 * and made of "spinning copper gears." Overclock rewards patience
 * and positioning — two normal attacks (12 dmg each) then a massive
 * third strike (24 dmg). Total over 3 hits: 48 vs baseline 36.
 * Opponents must decide: tank the burst, or retreat before the
 * third hit lands? Creates a rhythmic, predictable-but-dangerous
 * pattern that skilled players can both exploit and counter.
 */

import {
  registerPower,
  type AttackHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "overclock",
  name: "Overclock",
  description:
    "Every third attack deals double damage. Gears wind up then release.",
  hooks: {
    onAttack: (ctx: AttackHookContext): PowerEffect[] => {
      // Track hits via the vellymon's power state counter
      const hitCount = (ctx.self.powerState?.hitCount ?? 0) + 1;

      const effects: PowerEffect[] = [
        {
          type: "updatePowerState",
          targetId: ctx.self.uuid,
          state: { hitCount: hitCount % 3 },
        },
      ];

      // Every 3rd hit: double damage
      if (hitCount % 3 === 0) {
        effects.push({
          type: "damageBonus",
          targetId: ctx.target.uuid,
          amount: ctx.baseDamage, // Double = base + bonus equal to base
        });
      }

      return effects;
    },
  },
});
