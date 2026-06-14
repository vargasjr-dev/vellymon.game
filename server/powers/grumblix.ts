/**
 * Grumblix — "Grudge"
 *
 * When Grumblix takes damage, its next attack deals +2 bonus
 * damage. Stacks up to +6. The grumpier it gets, the harder
 * it hits.
 *
 * Hook: onDamaged
 * Effect: bonus damage accumulates (max +6), applied to attacker
 *
 * Design: Grumblix is a pure tank (HP 100, ATK 12, SPD 1).
 * Slowest in the game but massive HP and solid attack.
 * Grudge turns defense into offense — every hit makes the
 * inevitable counterattack more devastating. Opponents face
 * a dilemma: attack and fuel the grudge, or ignore the 100 HP
 * bruiser sitting on their tiles.
 */

import {
  registerPower,
  type DamagedHookContext,
  type PowerEffect,
} from "../specialPowers";

let grudgeStacks = 0;
const MAX_GRUDGE = 6;

registerPower({
  id: "grudge",
  name: "Grudge",
  description:
    "Taking damage adds +2 to next attack (max +6).",
  hooks: {
    onDamaged: (ctx: DamagedHookContext): PowerEffect[] => {
      if (ctx.self.hp <= 0) return [];

      grudgeStacks = Math.min(grudgeStacks + 2, MAX_GRUDGE);

      return [
        {
          type: "bonus_damage",
          targetId: ctx.attacker.uuid,
          amount: grudgeStacks,
        },
      ];
    },
  },
});
