/**
 * Dashpaw — "Phantom Sprint"
 *
 * After attacking, Dashpaw gets a free bonus move of 1 tile.
 * Hit-and-run: strike then reposition before the enemy can retaliate.
 *
 * Hook: onAfterAttack
 * Effect: grants 1 bonus movement tile after each attack
 *
 * Design rationale: Dashpaw is a speedster (HP 45, ATK 12, SPD 9)
 * with the highest speed tier. Phantom Sprint doubles down on the
 * mobility fantasy — attack and vanish. Fragile HP means you MUST
 * use the bonus move to stay alive. Pure hit-and-run gameplay.
 *
 * THE 💯TH PR OF THE DAY. April 19, 2026.
 */

import { registerPower } from "../specialPowers";

registerPower({
  id: "phantom-sprint",
  name: "Phantom Sprint",
  description: "After attacking, Dashpaw moves 1 bonus tile for free.",
  hook: "onAfterAttack",
  apply({ actor, battleState }) {
    // Grant 1 bonus movement after each attack
    const currentMoves = actor.remainingMoves ?? 0;
    actor.remainingMoves = currentMoves + 1;

    battleState.log.push(
      `${actor.name} dashes away with Phantom Sprint! (+1 bonus move)`,
    );

    return { actor, battleState };
  },
});
