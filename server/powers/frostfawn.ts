/**
 * Frostfawn — "Frost Grace"
 *
 * At end of turn, if Frostfawn did NOT attack, it heals 4 HP.
 * Graceful and deceptively tough — patience is its weapon.
 *
 * Hook: onTurnEnd
 * Effect: heal self 4 HP if no attack command was issued
 *
 * Design: Frostfawn is balanced (HP 72, ATK 12, SPD 6). Frost
 * Grace rewards repositioning and harvesting turns over constant
 * aggression. A survivalist that outlasts opponents by choosing
 * when NOT to fight. Pairs well with occupation strategies.
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "frost-grace",
  name: "Frost Grace",
  description:
    "If Frostfawn didn't attack this turn, heals 4 HP. Grace over aggression.",
  hooks: {
    onTurnEnd: (ctx: HookContext): PowerEffect[] => {
      // Check if this vellymon attacked this turn
      const commands = ctx.state.currentTurnCommands ?? [];
      const attacked = commands.some(
        (cmd: any) =>
          cmd.type === "attack" && cmd.vellymonId === ctx.self.uuid,
      );

      if (attacked) return [];

      // Heal self if below max HP
      if (ctx.self.hp >= (ctx.self.maxHp ?? 72)) return [];

      return [
        {
          type: "heal",
          targetId: ctx.self.uuid,
          amount: 4,
        },
      ];
    },
  },
});
