/**
 * AI Opponent Engine for Vellymon sparring matches.
 *
 * The AI uses the same command interface as human players — it generates
 * Command[] for each of its active vellymons each turn.
 */

import type { GameState, TeamState, VellymonState, Position, Vec2 } from "./types";
import type { Command, MoveCommand, AttackCommand, HarvestCommand } from "./commands";
import { GAME_CONFIG } from "./config";

// ─── Core AI ─────────────────────────────────────────────────────────────────

/**
 * Generate commands for all active AI vellymons for the current turn.
 */
export function generateAICommands(
  state: GameState,
  aiTeamId: 1 | 2,
): Command[] {
  const aiTeam = state.teams[aiTeamId - 1];
  const enemyTeam = state.teams[aiTeamId === 1 ? 1 : 0];

  const activeVellymons = aiTeam.active.filter(
    (v) => !v.isKO && v.position != null,
  );

  return activeVellymons.map((v) =>
    generateMediumCommand(v, aiTeam, enemyTeam, state),
  );
}

// ─── AI Strategy ─────────────────────────────────────────────────────────────

function generateMediumCommand(
  vellymon: VellymonState,
  aiTeam: TeamState,
  enemyTeam: TeamState,
  state: GameState,
): Command {
  // Priority 1: Attack if possible
  if (aiTeam.energy > 0) {
    for (let i = 0; i < vellymon.attacks.length; i++) {
      const atk = vellymon.attacks[i];
      if (atk && aiTeam.energy >= atk.energyCost) {
        for (const vec of VECS) {
          if (findTarget(vellymon, vec, atk.range, enemyTeam, aiTeam)) {
            return {
              type: "attack",
              vellymonUuid: vellymon.uuid,
              attackIndex: i,
              vec,
            };
          }
        }
      }
    }
  }

  // Priority 2: Harvest if low energy
  if (aiTeam.energy < 3) {
    for (const vec of VECS) {
      if (canHarvest(vellymon, vec, state)) {
        return { type: "harvest", vellymonUuid: vellymon.uuid, vec };
      }
    }
  }

  // Priority 3: Move toward nearest enemy
  const nearestEnemy = findNearestEnemy(vellymon, enemyTeam);
  if (nearestEnemy) {
    const vec = vecToward(vellymon.position!, nearestEnemy);
    if (vec && canMove(vellymon, vec, state)) {
      return { type: "move", vellymonUuid: vellymon.uuid, vec };
    }
  }

  // Fallback: random valid move
  for (const vec of VECS) {
    if (canMove(vellymon, vec, state)) {
      return { type: "move", vellymonUuid: vellymon.uuid, vec };
    }
  }
  // No valid move — move up (will be blocked and logged as failed)
  return { type: "move", vellymonUuid: vellymon.uuid, vec: { dx: 0, dy: -1 } };
}

// ─── Utility Functions ───────────────────────────────────────────────────────

const VECS: Vec2[] = [
  { dx: 0, dy: -1 }, // up
  { dx: 0, dy: 1 },  // down
  { dx: -1, dy: 0 }, // left
  { dx: 1, dy: 0 },  // right
];

function canMove(
  vellymon: VellymonState,
  vec: Vec2,
  state: GameState,
): boolean {
  if (!vellymon.position) return false;
  const target = {
    x: vellymon.position.x + vec.dx,
    y: vellymon.position.y + vec.dy,
  };

  // Check bounds
  const board = state.board;
  if (!board) return false;
  const space = board.find(
    (s) => s.position.x === target.x && s.position.y === target.y,
  );
  if (!space || space.type === "void") return false;

  // Check occupation by any vellymon
  for (const team of state.teams) {
    for (const v of team.active) {
      if (
        v.position &&
        v.position.x === target.x &&
        v.position.y === target.y &&
        !v.isKO
      ) {
        return false;
      }
    }
  }

  return true;
}

function canHarvest(
  vellymon: VellymonState,
  vec: Vec2,
  state: GameState,
): boolean {
  if (!vellymon.position) return false;
  const target = {
    x: vellymon.position.x + vec.dx,
    y: vellymon.position.y + vec.dy,
  };

  const board = state.board;
  if (!board) return false;
  const space = board.find(
    (s) => s.position.x === target.x && s.position.y === target.y,
  );

  return space?.type === "harvestable";
}

function findTarget(
  vellymon: VellymonState,
  vec: Vec2,
  range: number,
  enemyTeam: TeamState,
  ownTeam?: TeamState,
): VellymonState | null {
  if (!vellymon.position) return null;

  for (let r = 1; r <= range; r++) {
    const checkPos = {
      x: vellymon.position.x + vec.dx * r,
      y: vellymon.position.y + vec.dy * r,
    };

    // Stop if a friendly unit blocks the line of sight (mirrors engine scanForTarget)
    if (ownTeam) {
      const friendlyBlocker = ownTeam.active.find(
        (f) =>
          !f.isKO &&
          f.uuid !== vellymon.uuid &&
          f.position?.x === checkPos.x &&
          f.position?.y === checkPos.y,
      );
      if (friendlyBlocker) return null;
    }

    for (const enemy of enemyTeam.active) {
      if (
        !enemy.isKO &&
        enemy.position &&
        enemy.position.x === checkPos.x &&
        enemy.position.y === checkPos.y
      ) {
        return enemy;
      }
    }
  }

  return null;
}

function findNearestEnemy(
  vellymon: VellymonState,
  enemyTeam: TeamState,
): Position | null {
  if (!vellymon.position) return null;

  let nearest: Position | null = null;
  let nearestDist = Infinity;

  for (const enemy of enemyTeam.active) {
    if (enemy.isKO || !enemy.position) continue;
    const dist =
      Math.abs(enemy.position.x - vellymon.position.x) +
      Math.abs(enemy.position.y - vellymon.position.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = enemy.position;
    }
  }

  return nearest;
}

/** Return the cardinal Vec2 pointing most directly from `from` toward `to`. */
function vecToward(from: Position, to: Position): Vec2 | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) return { dx: 1, dy: 0 };
    if (dx < 0) return { dx: -1, dy: 0 };
    return null;
  } else {
    if (dy > 0) return { dx: 0, dy: 1 };
    if (dy < 0) return { dx: 0, dy: -1 };
    return null;
  }
}
