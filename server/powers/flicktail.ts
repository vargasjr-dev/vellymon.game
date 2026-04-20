/**
 * Flicktail — "Evasive Flick"
 *
 * After Flicktail moves, it gains a block effect on its current
 * position — the next attack targeting this space misses.
 * The tail flick redirects attention away.
 *
 * Hook: onAfterCommand
 * Effect: block on Flicktail's position after moving
 *
 * Design: Flicktail is the ultimate glass cannon speedster
 * (HP 50, ATK 10, SPD 10). Lowest HP in the game but max speed.
 * Evasive Flick rewards constant movement — park and you die,
 * keep moving and you're untouchable. The skill ceiling is high.
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "evasive-flick",
  name: "Evasive Flick",
  description:
    "After moving, blocks the next attack targeting this space. Keep moving, stay alive.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      // Only triggers on Flicktail's own move commands
      if (ctx.command.type !== "move") return [];
      if (ctx.command.vellymonId !== ctx.self.uuid) return [];

      // Block the space Flicktail landed on
      const pos = ctx.self.position;
      if (!pos) return [];

      return [
        {
          type: "block",
          position: { row: pos.row, col: pos.col },
        },
      ];
    },
  },
});
