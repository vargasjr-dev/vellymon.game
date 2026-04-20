/**
 * Doomsprout — "Bloom Burst"
 *
 * When below 50% HP, Doomsprout's attacks deal +8 bonus damage.
 * The desperate bloom unleashes everything at once.
 *
 * Hook: onAfterCommand (attack)
 * Effect: bonus_damage +8 when HP < 50%
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "bloom-burst",
  name: "Bloom Burst",
  description:
    "When below 50% HP, attacks deal +8 bonus damage. Desperate bloom.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      if (ctx.command.type !== "attack") return [];
      if (ctx.self.hp > ctx.self.maxHp / 2) return [];
      const enemyTeam = ctx.state.teams[ctx.team === 1 ? 1 : 0];
      const target = enemyTeam.active.find((v) => !v.isKO);
      if (!target) return [];
      return [{ type: "bonus_damage", targetId: target.uuid, amount: 8 }];
    },
  },
});
