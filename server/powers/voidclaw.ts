/**
 * Voidclaw — "Void Rend"
 *
 * After Voidclaw attacks, its void portals drain 2 energy
 * from the opponent team. Each strike tears through
 * dimensions, hitting both health and economy.
 *
 * Hook: onAfterCommand (attack)
 * Effect: energy -2 to enemy team
 *
 * Design: Voidclaw is a glass cannon (HP 45, ATK 19, SPD 5).
 * THE LOWEST HP in the entire game (45) combined with
 * TIED HIGHEST ATK (19, same as Magmorus). The ultimate
 * glass cannon. Void Rend drains 2 energy per attack —
 * double Shrednova's drain. A single Voidclaw attack is
 * devastating: 19 damage + 2 energy loss. But at 45 HP,
 * a stiff breeze knocks it out. High risk, highest reward.
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "void_rend",
  name: "Void Rend",
  description:
    "Attacks drain 2 energy from the opponent. Tears through dimensions.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      if (ctx.command.vellymonUuid !== ctx.self.uuid) return [];
      if (ctx.command.type !== "attack") return [];

      const enemyTeam = ctx.team === 1 ? 2 : 1;
      return [
        {
          type: "energy",
          team: enemyTeam as 1 | 2,
          amount: -2,
        },
      ];
    },
  },
});
