/**
 * Aquaplex — "Adaptive Flow"
 *
 * When Aquaplex harvests energy, it also heals 3 HP.
 * Water nourishes — sustain through adaptation.
 *
 * Hook: onAfterCommand (harvest only)
 * Effect: heal self 3 HP
 *
 * Design rationale: Aquaplex is balanced (HP 73, ATK 12, SPD 5) and
 * "adapts to any situation." Harvest already gains energy for the team;
 * this power adds personal sustain, making Aquaplex hard to wear down.
 * Encourages a patient, resource-focused playstyle that outlasts
 * aggressive opponents. The heal is small (3 HP) but compounds over
 * many turns — classic balanced archetype value.
 */

import {
  registerPower,
  type CommandHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "adaptive-flow",
  name: "Adaptive Flow",
  description:
    "When harvesting energy, also heals 3 HP.",
  hooks: {
    onAfterCommand: (ctx: CommandHookContext): PowerEffect[] => {
      // Only trigger on harvest commands
      if (ctx.command.type !== "harvest") return [];

      return [
        {
          type: "heal",
          targetId: ctx.self.uuid,
          amount: 3,
        },
      ];
    },
  },
});
