/**
 * Crimshard — "Crystal Barrage"
 *
 * First attack each turn also deals 50% bonus damage to a random
 * adjacent enemy. Red crystal shards lash out at nearby targets.
 *
 * Hook: onAttack
 * Effect: splash damage (half base damage) to one adjacent enemy
 *
 * Design rationale: Crimshard is glass cannon (HP 47, ATK 17, SPD 6)
 * with "red crystal shards orbit it like tiny daggers." Crystal Barrage
 * turns Crimshard into an AoE threat — 17 damage to the primary target
 * plus ~8 splash to a neighbor. That's 25 total damage per turn from
 * a single action, making Crimshard the highest damage-per-action
 * unit when enemies cluster. But at 47 HP, one focused attack can
 * take it out. High risk, absurdly high reward.
 */

import {
  registerPower,
  type AttackHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "crystal-barrage",
  name: "Crystal Barrage",
  description:
    "First attack each turn splashes 50% bonus damage to a random adjacent enemy. Orbiting shards lash out.",
  hooks: {
    onAttack: (ctx: AttackHookContext): PowerEffect[] => {
      // Only first attack per turn (track via powerState)
      const hasAttacked = ctx.self.powerState?.attackedThisTurn ?? false;
      if (hasAttacked) return [];

      // Find adjacent enemies
      const adjacentEnemies = ctx.nearbyEnemies?.filter(
        (e) => e.uuid !== ctx.target.uuid,
      );

      const effects: PowerEffect[] = [
        {
          type: "updatePowerState",
          targetId: ctx.self.uuid,
          state: { attackedThisTurn: true },
        },
      ];

      if (adjacentEnemies && adjacentEnemies.length > 0) {
        // Pick random adjacent enemy for splash
        const splashTarget =
          adjacentEnemies[Math.floor(Math.random() * adjacentEnemies.length)];
        effects.push({
          type: "splashDamage",
          targetId: splashTarget.uuid,
          amount: Math.floor(ctx.baseDamage / 2),
        });
      }

      return effects;
    },
  },
});
