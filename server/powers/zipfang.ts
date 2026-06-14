/**
 * Zipfang — "First Strike"
 *
 * At the start of each turn, Zipfang's blinding speed
 * gives it +2 bonus damage on its next attack. It always
 * gets the first bite, and it always hurts.
 *
 * Hook: onTurnStart
 * Effect: bonus_damage +2 on self
 *
 * Design: Zipfang is a speedster (HP 40, ATK 12, SPD 10).
 * TIED FASTEST in the entire game (SPD 10, with Joltmink).
 * Second-lowest HP (40, only Voidclaw is lower at 45).
 * First Strike adds +2 ATK per turn — a scaling speedster
 * that hits first AND harder every round. Like Verdantix's
 * Crystal Growth but on a glass-fast frame. The final
 * vellymon in the library, and a fitting closer: pure
 * speed, pure aggression, pure fragility.
 *
 * 64th and FINAL vellymon enrichment. ⚔️
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "first_strike",
  name: "First Strike",
  description:
    "Each turn, Zipfang gains +2 ATK.",
  hooks: {
    onTurnStart: (ctx: HookContext): PowerEffect[] => {
      return [
        {
          type: "bonus_damage",
          targetId: ctx.self.uuid,
          amount: 2,
        },
      ];
    },
  },
});
