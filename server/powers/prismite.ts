/**
 * Prismite — "Prismatic Shield"
 *
 * When Prismite takes damage, it refracts the energy and heals
 * itself for 2 HP. The rainbow patterns absorb and convert
 * incoming force into restorative light.
 *
 * Hook: onDamaged
 * Effect: heal self 2 HP
 *
 * Design: Prismite is balanced (HP 88, ATK 12, SPD 4). Tanky
 * for a balanced type with strong ATK. Prismatic Shield gives
 * it sustain under fire — every hit heals 2, effectively
 * reducing damage taken. At ATK 12 it also hits hard in return.
 * A beautiful bruiser that outlasts opponents through passive
 * damage mitigation. Different from Mosswall (flat regen) and
 * Ironpup (counter-attack) — Prismite is pure damage reduction.
 */

import {
  registerPower,
  type DamagedHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "prismatic_shield",
  name: "Prismatic Shield",
  description:
    "When damaged, heals self for 2 HP.",
  hooks: {
    onDamaged: (ctx: DamagedHookContext): PowerEffect[] => {
      return [
        {
          type: "heal",
          targetId: ctx.self.uuid,
          amount: 2,
        },
      ];
    },
  },
});
