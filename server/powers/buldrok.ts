/**
 * Buldrok — "Earthen Bulwark"
 *
 * All incoming damage is reduced by 3 (minimum 1). A stone golem
 * that simply absorbs hits — no regen, just a wall that chips don't dent.
 *
 * Hook: onDamaged
 * Effect: bonus_damage -3 to self (net damage reduction of 3)
 *
 * Design: Buldrok is the tankiest mon in the game (HP 120, SPD 1).
 * Earthen Bulwark makes chip attacks almost meaningless against it
 * while preserving vulnerability to big slams. Pairs poorly with
 * fast-attack mons and punishes teams that rely on poke/snipe range.
 */

import {
  registerPower,
  type DamagedHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "earthen-bulwark",
  name: "Earthen Bulwark",
  description: "All incoming damage reduced by 3 (minimum 1).",
  hooks: {
    onDamaged: (ctx: DamagedHookContext): PowerEffect[] => {
      // Reduce damage by healing back 3 HP, capped so total damage never goes below 1
      const reduction = Math.min(3, ctx.damage - 1);
      if (reduction <= 0) return [];
      return [{ type: "heal", targetId: ctx.self.uuid, amount: reduction }];
    },
  },
});
