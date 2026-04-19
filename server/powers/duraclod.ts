/**
 * Duraclod — "Fortify"
 *
 * At the end of each turn, if Duraclod didn't move, it gains
 * a 4-damage shield that absorbs the next incoming hit.
 * Standing ground makes the clod even harder to break.
 *
 * Hook: onTurnEnd
 * Effect: grants 4-point damage shield if stationary
 *
 * Design rationale: Duraclod is a tank (HP 92, ATK 12, SPD 2)
 * with the slowest speed tier. Fortify rewards planting it on
 * a key tile — occupation becomes a siege. Moving breaks the
 * shield, creating a meaningful positioning decision.
 */

import { registerPower } from "../specialPowers";

registerPower({
  id: "fortify",
  name: "Fortify",
  description:
    "If Duraclod didn't move this turn, it gains a 4-damage shield.",
  hook: "onTurnEnd",
  apply({ actor, battleState }) {
    // Check if Duraclod moved this turn
    const moved = actor.movedThisTurn ?? false;

    if (!moved) {
      const currentShield = actor.shield ?? 0;
      actor.shield = currentShield + 4;

      battleState.log.push(
        `${actor.name} fortifies! Shield absorbs next 4 damage.`,
      );
    }

    return { actor, battleState };
  },
});
