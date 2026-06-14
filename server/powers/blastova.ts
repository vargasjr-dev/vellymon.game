/**
 * Blastova — "Supernova Burst"
 *
 * On the first turn, Blastova's attack deals +5 bonus damage.
 * A living supernova — bright, hot, and short-lived.
 *
 * Hook: onAfterCommand (attack)
 * Effect: +5 bonus_damage on turn 1
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "supernova-burst",
  name: "Supernova Burst",
  description:
    "First turn's attack deals +5 bonus damage.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      if (ctx.command.type !== "attack" || ctx.turn !== 1) return [];
      // Find the first enemy to apply bonus damage
      const enemyTeam = ctx.state.teams[ctx.team === 1 ? 1 : 0];
      const target = enemyTeam.active.find((v) => !v.isKO);
      if (!target) return [];
      return [{ type: "bonus_damage", targetId: target.uuid, amount: 5 }];
    },
  },
});
