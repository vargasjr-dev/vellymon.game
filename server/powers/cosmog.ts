/**
 * Cosmog — "Warp Strike"
 *
 * Attacks can target any vellymon on the board regardless of range.
 * Cosmic teleportation bypasses distance restrictions.
 *
 * Hook: onAttack
 * Effect: override range check to always succeed
 *
 * Design rationale: Cosmog is balanced (HP 90, ATK 10, SPD 4) and
 * "the most mysterious vellymon of all." Warp Strike turns Cosmog
 * into a global threat — no one is safe regardless of positioning.
 * On an 8×5 grid where range normally matters, ignoring distance
 * is a massive tactical advantage. Opponents can't hide behind
 * tanks or stay out of range. However, Cosmog's ATK is only 10
 * (average for balanced), so the damage per hit is moderate.
 * The power rewards smart target selection over raw damage.
 */

import {
  registerPower,
  type AttackHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "warp-strike",
  name: "Warp Strike",
  description:
    "Attacks can target any vellymon on the board regardless of range. Cosmic teleportation.",
  hooks: {
    onAttack: (ctx: AttackHookContext): PowerEffect[] => {
      return [
        {
          type: "overrideRange",
          targetId: ctx.self.uuid,
          range: 99, // Effectively unlimited
        },
      ];
    },
  },
});
