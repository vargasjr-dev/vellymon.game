/**
 * Duskfin — "Twilight Veil"
 *
 * At dusk (turns 5+), Duskfin gains +2 ATK and +1 SPD.
 * The longer the match, the more dangerous it becomes.
 *
 * Hook: onTurnStart
 * Effect: after turn 5, permanently boosts ATK by 2 and SPD by 1
 *
 * Design rationale: Duskfin is balanced (HP 83, ATK 13, SPD 4)
 * with a late-game scaling fantasy. Early game it's average;
 * past turn 5 it becomes a 15 ATK / 5 SPD threat. Rewards
 * patient play and punishes opponents who don't close early.
 */

import { registerPower } from "../specialPowers";

registerPower({
  id: "twilight-veil",
  name: "Twilight Veil",
  description:
    "After turn 5, Duskfin gains +2 ATK and +1 SPD permanently.",
  hook: "onTurnStart",
  apply({ actor, battleState }) {
    const currentTurn = battleState.turnNumber ?? 0;

    if (currentTurn >= 5 && !actor.twilightActive) {
      actor.attack = (actor.attack ?? 13) + 2;
      actor.speed = (actor.speed ?? 4) + 1;
      actor.twilightActive = true;

      battleState.log.push(
        `${actor.name}'s Twilight Veil activates! ATK +2, SPD +1. Dusk has fallen.`,
      );
    }

    return { actor, battleState };
  },
});
