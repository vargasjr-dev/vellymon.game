/**
 * Blinkatt — "Phase Shift"
 *
 * After attacking, Blinkatt gains +5 SPD next turn — blink in,
 * strike, blink out before the counterattack lands.
 *
 * Hook: onAfterCommand (attack)
 * Effect: speed_mod +5 on self
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "phase-shift",
  name: "Phase Shift",
  description:
    "After attacking, gains +5 SPD next turn.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      if (ctx.command.type !== "attack") return [];
      return [{ type: "speed_mod", vellymonId: ctx.self.uuid, amount: 5 }];
    },
  },
});
