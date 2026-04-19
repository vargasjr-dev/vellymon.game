/**
 * Doomsprout — "Bloom Burst"
 *
 * When Doomsprout's HP drops below 50%, its next attack deals
 * double damage. The desperate bloom unleashes everything at once.
 *
 * Hook: onAttack
 * Effect: doubles attack damage when below 50% HP
 *
 * Design rationale: Doomsprout is glass cannon (HP 58, ATK 17, SPD 4)
 * with devastating base attack. Bloom Burst turns its fragility into
 * a weapon — the lower it goes, the more dangerous it becomes.
 * Opponents face a dilemma: finish it fast or risk a 34-damage nuke.
 */

import { registerPower } from "../specialPowers";

registerPower({
  id: "bloom-burst",
  name: "Bloom Burst",
  description:
    "When below 50% HP, Doomsprout's next attack deals double damage.",
  hook: "onAttack",
  apply({ actor, damage, battleState }) {
    const maxHp = actor.maxHp ?? actor.currentHp;
    const threshold = Math.floor(maxHp / 2);

    if (actor.currentHp <= threshold) {
      const boostedDamage = damage * 2;
      battleState.log.push(
        `${actor.name}'s Bloom Burst! Desperate bloom deals ${boostedDamage} damage! (was ${damage})`,
      );
      return { actor, damage: boostedDamage, battleState };
    }

    return { actor, damage, battleState };
  },
});
