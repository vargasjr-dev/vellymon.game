/**
 * Coralord — "Reef Armor"
 *
 * Heals 2 HP at the end of each turn. Coral slowly regenerates.
 *
 * Hook: onTurnEnd
 * Effect: self-heal 2 HP
 *
 * Design rationale: Coralord is a tank (HP 95, ATK 11, SPD 3)
 * and "king of the shallows" — a coral reef creature that
 * regenerates naturally. Reef Armor is straightforward sustain:
 * 2 HP per turn on a 95 HP body makes Coralord extremely hard
 * to kill through attrition. Over 10 turns that's 20 HP recovered,
 * effectively giving Coralord 115+ effective HP.
 *
 * Counter-play: burst damage (glass cannons) or energy denial
 * to win before regeneration accumulates. Chip damage is useless.
 */

import {
  registerPower,
  type TurnHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "reef-armor",
  name: "Reef Armor",
  description: "Heals 2 HP at the end of each turn. Coral slowly regenerates.",
  hooks: {
    onTurnEnd: (ctx: TurnHookContext): PowerEffect[] => {
      return [
        {
          type: "heal",
          targetId: ctx.self.uuid,
          amount: 2,
        },
      ];
    },
  },
});
