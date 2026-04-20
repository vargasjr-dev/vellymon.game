/**
 * Tidalmini — "Tidal Splash"
 *
 * At the end of each turn, Tidalmini's miniature wave
 * splashes all active allies, healing each for 2 HP.
 * Harmless to enemies, restorative to friends.
 *
 * Hook: onTurnEnd
 * Effect: heal 2 HP to each active ally on team
 *
 * Design: Tidalmini is a support (HP 80, ATK 5, SPD 6).
 * The LOWEST ATK in the entire game — truly harmless.
 * But 2 HP team heal per turn is strong sustain (double
 * Lumisprout's 1 HP team heal). High HP for a support
 * means it sticks around. Pure healer fantasy.
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "tidal_splash",
  name: "Tidal Splash",
  description:
    "Each turn end, splashes all allies for 2 HP healing. Harmlessly restorative.",
  hooks: {
    onTurnEnd: (ctx: HookContext): PowerEffect[] => {
      const teamState = ctx.state.teams[ctx.team - 1];
      const allies = teamState.active.filter(
        (v) => !v.isKO
      );

      return allies.map((ally) => ({
        type: "heal" as const,
        targetId: ally.uuid,
        amount: 2,
      }));
    },
  },
});
