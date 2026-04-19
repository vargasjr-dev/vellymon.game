/**
 * Aerobolt — "Shockwave Surfer"
 *
 * After Aerobolt lands an attack, it generates a shockwave that
 * drains 1 energy from the opponent's team. Speed creates pressure.
 *
 * Hook: onAfterCommand (attack only)
 * Effect: -1 energy to opposing team
 *
 * Design rationale: Aerobolt is a speedster (spd 8) that attacks early
 * in resolution order. This power makes fast, aggressive play pay off
 * by taxing the opponent's energy economy every time Aerobolt connects.
 * At 1 energy per hit, it's a steady drain — not a burst. Synergizes
 * with the Accumulation win condition (race to 120 energy).
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "shockwave-surfer",
  name: "Shockwave Surfer",
  description:
    "After attacking, drains 1 energy from the opposing team. Speed creates pressure.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      // Only trigger on attacks (not moves or harvests)
      if (ctx.command.type !== "attack") return [];

      // Drain 1 energy from the opposing team
      const opponentTeam = ctx.team === 1 ? 2 : 1;
      return [
        {
          type: "energy",
          team: opponentTeam,
          amount: -1,
        },
      ];
    },
  },
});
