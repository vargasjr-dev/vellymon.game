/**
 * Ferridon — "Rust Aura"
 *
 * When Ferridon takes damage, the attacker's speed is reduced
 * by 1 (min 0). Iron rusts everything it touches.
 *
 * Hook: onDamaged
 * Effect: speed_mod -1 on the attacker
 *
 * Design: Ferridon is a tank (HP 115, ATK 9, SPD 1). Already
 * slow, but incredibly durable. Rust Aura makes opponents
 * slower the more they attack it — an anti-rush passive that
 * punishes speedsters who try to burst it down. Pairs with
 * board control and occupation strategies.
 */

import {
  registerPower,
  type HookContext,
  type PowerEffect,
} from "../specialPowers";

registerPower({
  id: "rust-aura",
  name: "Rust Aura",
  description:
    "When hit, the attacker loses 1 SPD. Iron rusts everything it touches.",
  hooks: {
    onDamaged: (ctx: HookContext): PowerEffect[] => {
      // Find the attacker — the last vellymon that dealt damage
      // The engine provides attacker info via state context
      const attackers = ctx.state.lastDamageSource;
      if (!attackers || attackers.length === 0) return [];

      // Slow each attacker by 1
      return attackers.map((attackerId: string) => ({
        type: "speed_mod" as const,
        vellymonId: attackerId,
        amount: -1,
      }));
    },
  },
});
