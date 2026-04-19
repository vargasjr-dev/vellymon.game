/**
 * Blinkatt — "Phase Shift"
 *
 * After attacking, Blinkatt becomes untargetable for 1 turn.
 * Blinks in, strikes, blinks out.
 *
 * Hook: onAfterCommand (attack only)
 * Effect: buff self "phaseShift" (untargetable) for 1 turn
 *
 * Design rationale: Blinkatt is the fastest unit (SPD 10) but
 * fragile (HP 42). Phase Shift rewards aggressive hit-and-run —
 * attack first thanks to max speed, then phase out before the
 * counterattack lands. Opponents must predict Blinkatt's position
 * and time their attacks for the gap between shifts. Creates a
 * rhythm: strike → phase out → vulnerable → strike → phase out.
 * The untargetable window is just 1 turn, forcing constant motion.
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
    "After attacking, becomes untargetable for 1 turn. Blink in, strike, blink out.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      // Only trigger on attack commands
      if (ctx.command.type !== "attack") return [];

      return [
        {
          type: "buff",
          targetId: ctx.self.uuid,
          stat: "untargetable",
          amount: 1,
          duration: 1,
        },
      ];
    },
  },
});
