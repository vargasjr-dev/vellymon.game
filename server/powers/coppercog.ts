/**
 * Coppercog — "Overclock"
 *
 * Every attack Coppercog lands deals +4 bonus damage.
 * Mechanical gears winding into every strike.
 *
 * Hook: onAfterCommand (attack)
 * Effect: bonus_damage +4
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "overclock",
  name: "Overclock",
  description:
    "Attacks deal +4 bonus damage. Gears add force to every strike.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      if (ctx.command.type !== "attack") return [];
      const enemyTeam = ctx.state.teams[ctx.team === 1 ? 1 : 0];
      const target = enemyTeam.active.find((v) => !v.isKO);
      if (!target) return [];
      return [{ type: "bonus_damage", targetId: target.uuid, amount: 4 }];
    },
  },
});
