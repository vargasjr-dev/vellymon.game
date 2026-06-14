/**
 * Buldrok — "Stone Skin"
 *
 * Buldrok heals 2 HP whenever it takes damage (tough stone armor).
 * Minimum damage still applies — it can't fully negate attacks.
 *
 * Hook: onDamaged
 * Effect: heal self 2 HP
 */

import {
  registerPower,
  type DamagedHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "stone-skin",
  name: "Stone Skin",
  description:
    "Heals 2 HP whenever hit.",
  hooks: {
    onDamaged: (ctx: DamagedHookContext): PowerEffect[] => {
      if (ctx.damage <= 0) return [];
      return [{ type: "heal", targetId: ctx.self.uuid, amount: 2 }];
    },
  },
});
