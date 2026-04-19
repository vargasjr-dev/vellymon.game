/**
 * Cloudpuff — "Rain Dance"
 *
 * At the start of each turn, all allies heal 1 HP.
 * A tiny cloud raining gentle nourishment over the team.
 *
 * Hook: onTurnStart
 * Effect: heal all allied vellymons by 1 HP
 *
 * Design rationale: Cloudpuff is support (HP 78, ATK 8, SPD 7) and
 * "a tiny cloud that floats just above the ground." Rain Dance is
 * classic passive support — no action required, just exist and your
 * team sustains. 1 HP per ally per turn seems small, but with 3
 * other active allies that's 3 HP of team healing every round.
 * Over a 10+ turn game, that's 30+ total HP recovered. Stacks
 * invisibly into a durability advantage that opponents only notice
 * when their targets refuse to go down.
 */

import {
  registerPower,
  type TurnHookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "rain-dance",
  name: "Rain Dance",
  description:
    "At the start of each turn, all allies heal 1 HP. Gentle rain from a tiny cloud.",
  hooks: {
    onTurnStart: (ctx: TurnHookContext): PowerEffect[] => {
      // Heal all allied vellymons (not self — cloud rains on others)
      const allies = ctx.allAllies.filter((a) => a.uuid !== ctx.self.uuid);
      if (allies.length === 0) return [];

      return allies.map((ally) => ({
        type: "heal" as const,
        targetId: ally.uuid,
        amount: 1,
      }));
    },
  },
});
