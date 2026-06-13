/**
 * AI Opponent Engine for Vellymon sparring matches.
 *
 * Three difficulty tiers:
 * - Easy: random valid moves
 * - Medium: basic priority strategy (attack > harvest > move toward enemy)
 * - Hard: optimized play (focus low-HP targets, harvest when energy-starved, position for range)
 *
 * The AI uses the same command interface as human players — it generates
 * Command[] for each of its active vellymons each turn.
 */

import type { GameState, TeamState, VellymonState, Position } from "./types";
import type { Command, Direction, MoveCommand, AttackCommand, HarvestCommand } from "./commands";
import { directionToOffset } from "./commands";
import { hasEnergy } from "./energy";
import { GAME_CONFIG } from "./config";

export type AIDifficulty = "easy" | "medium" | "hard";

// ─── Core AI ─────────────────────────────────────────────────────────────────

/**
 * Generate commands for all active AI vellymons for the current turn.
 */
export function generateAICommands(
  state: GameState,
  aiTeamId: 1 | 2,
  difficulty: AIDifficulty,
): Command[] {
  const aiTeam = state.teams[aiTeamId - 1];
  const enemyTeam = state.teams[aiTeamId === 1 ? 1 : 0];

  const activeVellymons = aiTeam.active.filter(
    (v) => !v.isKO && v.position != null,
  );

  switch (difficulty) {
    case "easy":
      return activeVellymons.map((v) =>
        generateEasyCommand(v, aiTeam, enemyTeam, state),
      );
    case "medium":
      return activeVellymons.map((v) =>
        generateMediumCommand(v, aiTeam, enemyTeam, state),
      );
    case "hard":
      return generateHardCommands(activeVellymons, aiTeam, enemyTeam, state);
  }
}

// ─── Easy AI: Random Valid Moves ─────────────────────────────────────────────

function generateEasyCommand(
  vellymon: VellymonState,
  aiTeam: TeamState,
  enemyTeam: TeamState,
  state: GameState,
): Command {
  const options: Command[] = [];

  // Add all valid move directions
  for (const dir of DIRECTIONS) {
    if (canMove(vellymon, dir, state)) {
      options.push({ type: "move", vellymonUuid: vellymon.uuid, direction: dir });
    }
  }

  // Add attack options if has energy
  if (aiTeam.energy > 0) {
    for (let i = 0; i < vellymon.attacks.length; i++) {
      const atk = vellymon.attacks[i];
      if (atk && aiTeam.energy >= atk.energyCost) {
        for (const dir of DIRECTIONS) {
          if (findTarget(vellymon, dir, atk.range, enemyTeam, aiTeam)) {
            options.push({
              type: "attack",
              vellymonUuid: vellymon.uuid,
              attackIndex: i,
              direction: dir,
            });
          }
        }
      }
    }
  }

  // Add harvest options
  for (const dir of DIRECTIONS) {
    if (canHarvest(vellymon, dir, state)) {
      options.push({ type: "harvest", vellymonUuid: vellymon.uuid, direction: dir });
    }
  }

  // Pick random option, or fallback to move
  if (options.length === 0) {
    return { type: "move", vellymonUuid: vellymon.uuid, direction: "up" };
  }
  return options[Math.floor(Math.random() * options.length)];
}

// ─── Medium AI: Priority Strategy ────────────────────────────────────────────

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

  // Fallback: random move
  return generateEasyCommand(vellymon, aiTeam, enemyTeam, state);
}

// ─── Hard AI: Optimized Play ─────────────────────────────────────────────────

function generateHardCommands(
  vellymons: VellymonState[],
  aiTeam: TeamState,
  enemyTeam: TeamState,
  state: GameState,
): Command[] {
  const commands: Command[] = [];
  let remainingEnergy = aiTeam.energy;

  // Sort vellymons by speed (fastest acts first)
  const sorted = [...vellymons].sort((a, b) => b.speed - a.speed);

  for (const vellymon of sorted) {
    const command = generateHardSingleCommand(
      vellymon,
      remainingEnergy,
      aiTeam,
      enemyTeam,
      state,
    );
    commands.push(command);

    // Track energy spent
    if (command.type === "attack") {
      const atk = vellymon.attacks[command.attackIndex];
      if (atk) remainingEnergy -= atk.energyCost;
    }
  }

  return commands;
}

function generateHardSingleCommand(
  vellymon: VellymonState,
  remainingEnergy: number,
  aiTeam: TeamState,
  enemyTeam: TeamState,
  state: GameState,
): Command {
  // Priority 1: Kill shot — attack low-HP enemies first
  const enemies = enemyTeam.active.filter((e) => !e.isKO && e.position != null);
  if (remainingEnergy > 0) {
    for (const atk of vellymon.attacks) {
      if (atk && remainingEnergy >= atk.energyCost) {
        const atkIdx = vellymon.attacks.indexOf(atk);
        for (const dir of DIRECTIONS) {
          const target = findTarget(vellymon, dir, atk.range, enemyTeam, aiTeam);
          if (target && target.hp <= atk.damage * (vellymon.attack / 100)) {
            return {
              type: "attack",
              vellymonUuid: vellymon.uuid,
              attackIndex: atkIdx,
              direction: dir,
            };
          }
        }
      }
    }

    // Priority 2: Attack strongest available target
    for (let i = 0; i < vellymon.attacks.length; i++) {
      const atk = vellymon.attacks[i];
      if (atk && remainingEnergy >= atk.energyCost) {
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

  // Priority 3: Harvest if energy-starved (< 2)
  if (remainingEnergy < 2) {
    for (const dir of DIRECTIONS) {
      if (canHarvest(vellymon, dir, state)) {
        return { type: "harvest", vellymonUuid: vellymon.uuid, direction: dir };
      }
    }
  }

  // Priority 4: Position for next turn — move into attack range of an enemy
  const nearestEnemy = findNearestEnemy(vellymon, enemyTeam);
  if (nearestEnemy) {
    const dir = directionToward(vellymon.position!, nearestEnemy);
    if (dir && canMove(vellymon, dir, state)) {
      return { type: "move", vellymonUuid: vellymon.uuid, direction: dir };
    }
  }

  // Priority 5: Harvest if possible (energy banking)
  for (const dir of DIRECTIONS) {
    if (canHarvest(vellymon, dir, state)) {
      return { type: "harvest", vellymonUuid: vellymon.uuid, direction: dir };
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
