/**
 * Cosmog — "Warp Strike"
 *
 * Before attacking, Cosmog gains +3 SPD — cosmic teleportation
 * lets it strike from unexpected angles.
 *
 * Hook: onBeforeCommand (attack)
 * Effect: speed_mod +3 on self
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "warp-strike",
  name: "Warp Strike",
  description:
    "Before attacking, gains +3 SPD. Cosmic teleportation strikes from unexpected angles.",
  hooks: {
    onBeforeCommand: (ctx: CommandHookContext): PowerEffect[] => {
      if (ctx.command.type !== "attack") return [];
      return [{ type: "speed_mod", vellymonId: ctx.self.uuid, amount: 3 }];
    },
  },
});
