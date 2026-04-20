/**
 * Gleamoss — "Photosynthesis"
 *
 * When Gleamoss harvests, the team gains +2 bonus energy instead
 * of the normal harvest amount. Sunlight supercharges collection.
 *
 * Hook: onAfterCommand
 * Effect: energy +2 bonus when Gleamoss harvests
 *
 * Design: Gleamoss is fast support (HP 65, ATK 5, SPD 8). Lowest
 * attack in the game but high speed means it acts early — rush
 * to energy tiles and harvest before opponents can contest.
 * Photosynthesis makes every harvest worth significantly more,
 * accelerating the accumulation win condition.
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "photosynthesis",
  name: "Photosynthesis",
  description:
    "Harvests grant +2 bonus energy. Sunlight supercharges collection.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      // Only triggers on Gleamoss's own harvest commands
      if (ctx.command.type !== "harvest") return [];
      if (ctx.command.vellymonId !== ctx.self.uuid) return [];

      return [
        {
          type: "energy",
          teamId: ctx.team,
          amount: 2,
        },
      ];
    },
  },
});
