/**
 * Dewdrop — "Cleansing Mist"
 *
 * At the start of each turn, Dewdrop cleanses the lowest-HP ally,
 * restoring 3 HP. If Dewdrop is the lowest-HP ally, it heals itself.
 *
 * Hook: onTurnStart
 * Effect: heals lowest-HP ally for 3 HP
 *
 * Design rationale: Dewdrop is pure support (HP 70, ATK 5, SPD 7)
 * with the lowest attack in the roster. Cleansing Mist makes it
 * a triage healer — always patching the most damaged teammate.
 * Keeps the team alive while others deal damage.
 */

import { registerPower } from "../specialPowers";

registerPower({
  id: "cleansing-mist",
  name: "Cleansing Mist",
  description:
    "Each turn, Dewdrop heals the lowest-HP ally for 3 HP.",
  hook: "onTurnStart",
  apply({ actor, allies, battleState }) {
    // Find the ally (or self) with the lowest current HP
    const allFriendlies = [actor, ...allies];
    let lowest = allFriendlies[0];
    for (const unit of allFriendlies) {
      if (unit.currentHp < lowest.currentHp) {
        lowest = unit;
      }
    }

    const healAmount = 3;
    const maxHp = lowest.maxHp ?? lowest.currentHp + healAmount;
    const oldHp = lowest.currentHp;
    lowest.currentHp = Math.min(lowest.currentHp + healAmount, maxHp);
    const healed = lowest.currentHp - oldHp;

    if (healed > 0) {
      battleState.log.push(
        `${actor.name}'s Cleansing Mist heals ${lowest.name} for ${healed} HP!`,
      );
    }

    return { actor, allies, battleState };
  },
});
