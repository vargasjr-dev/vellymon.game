/**
 * AI Opponent Engine for Vellymon sparring matches.
 *
 * The AI uses the same command interface as human players — it generates
 * Command[] for each of its active vellymons each turn.
 */

import type { GameState, TeamState, VellymonState, Position } from "./types";
import type { Command, Direction, MoveCommand, AttackCommand, HarvestCommand } from "./commands";
import { directionToOffset } from "./commands";
import { hasEnergy } from "./energy";
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
        for (const dir of DIRECTIONS) {
          if (findTarget(vellymon, dir, atk.range, enemyTeam, aiTeam)) {
            return {
              type: "attack",
              vellymonUuid: vellymon.uuid,
              attackIndex: i,
              direction: dir,
            };
          }
        }
      }
    }
  }

  // Priority 2: Harvest if low energy
  if (aiTeam.energy < 3) {
    for (const dir of DIRECTIONS) {
      if (canHarvest(vellymon, dir, state)) {
        return { type: "harvest", vellymonUuid: vellymon.uuid, direction: dir };
      }
    }
  }

  // Priority 3: Move toward nearest enemy
  const nearestEnemy = findNearestEnemy(vellymon, enemyTeam);
  if (nearestEnemy) {
    const dir = directionToward(vellymon.position!, nearestEnemy);
    if (dir && canMove(vellymon, dir, state)) {
      return { type: "move", vellymonUuid: vellymon.uuid, direction: dir };
    }
  }

  // Fallback: random valid move
  for (const dir of DIRECTIONS) {
    if (canMove(vellymon, dir, state)) {
      return { type: "move", vellymonUuid: vellymon.uuid, direction: dir };
    }
  }
  return { type: "move", vellymonUuid: vellymon.uuid, direction: "up" };
}

// ─── Utility Functions ───────────────────────────────────────────────────────

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

function canMove(
  vellymon: VellymonState,
  direction: Direction,
  state: GameState,
): boolean {
  if (!vellymon.position) return false;
  const offset = directionToOffset(direction);
  const target = {
    x: vellymon.position.x + offset.x,
    y: vellymon.position.y + offset.y,
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
  direction: Direction,
  state: GameState,
): boolean {
  if (!vellymon.position) return false;
  const offset = directionToOffset(direction);
  const target = {
    x: vellymon.position.x + offset.x,
    y: vellymon.position.y + offset.y,
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
  direction: Direction,
  range: number,
  enemyTeam: TeamState,
  ownTeam?: TeamState,
): VellymonState | null {
  if (!vellymon.position) return null;
  const offset = directionToOffset(direction);

  for (let r = 1; r <= range; r++) {
    const checkPos = {
      x: vellymon.position.x + offset.x * r,
      y: vellymon.position.y + offset.y * r,
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

function directionToward(from: Position, to: Position): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? "right" : dx < 0 ? "left" : null;
  } else {
    return dy > 0 ? "down" : dy < 0 ? "up" : null;
  }
}
