/**
 * Command set for vellymon matches.
 *
 * Three commands per vellymon per turn:
 * - Move — move one space in a cardinal direction (free)
 * - Attack — use a specific attack on a target (costs energy)
 * - Harvest — gather energy from current space (free, must be harvestable)
 *
 * Spawn is removed — bench vellymons auto-enter on KO.
 * One command per vellymon per turn.
 * At 0 team energy, Attack is unavailable.
 */

import { GAME_CONFIG } from "./config";
import { spendEnergy, harvestEnergy, hasEnergy } from "./energy";
import type {
  GameState,
  TeamState,
  VellymonState,
  BoardSpace,
  Position,
} from "./types";

// ─── Command Types ───────────────────────────────────────────────────────────

export type MoveCommand = {
  type: "move";
  vellymonUuid: string;
  direction: "up" | "down" | "left" | "right";
};

export type AttackCommand = {
  type: "attack";
  vellymonUuid: string;
  attackIndex: number;
  targetPosition: Position;
};

export type HarvestCommand = {
  type: "harvest";
  vellymonUuid: string;
};

export type Command = MoveCommand | AttackCommand | HarvestCommand;

export type CommandResult = {
  command: Command;
  success: boolean;
  reason?: string;
  /** Energy change from this command (negative = spent, positive = gained) */
  energyDelta?: number;
  /** Damage dealt (attack only) */
  damageDealt?: number;
  /** Target KO'd (attack only) */
  targetKO?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function directionToOffset(
  direction: "up" | "down" | "left" | "right",
): Position {
  switch (direction) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}

function getSpace(
  board: BoardSpace[],
  pos: Position,
): BoardSpace | undefined {
  return board.find(
    (s) => s.position.x === pos.x && s.position.y === pos.y,
  );
}

function getVellymonAtPosition(
  state: GameState,
  pos: Position,
): VellymonState | undefined {
  for (const team of state.teams) {
    const found = team.active.find(
      (v) =>
        !v.isKO &&
        v.position?.x === pos.x &&
        v.position?.y === pos.y,
    );
    if (found) return found;
  }
  return undefined;
}

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a command before resolution.
 * Returns an error string if invalid, null if valid.
 */
export function validateCommand(
  command: Command,
  team: TeamState,
  state: GameState,
): string | null {
  const vellymon = team.active.find(
    (v) => v.uuid === command.vellymonUuid && !v.isKO,
  );

  if (!vellymon) {
    return "Vellymon not found or KO'd";
  }

  if (!vellymon.position) {
    return "Vellymon has no position";
  }

  switch (command.type) {
    case "move": {
      const offset = directionToOffset(command.direction);
      const target: Position = {
        x: vellymon.position.x + offset.x,
        y: vellymon.position.y + offset.y,
      };

      // Bounds check
      if (
        target.x < 0 ||
        target.x >= state.boardWidth ||
        target.y < 0 ||
        target.y >= state.boardHeight
      ) {
        return "Move out of bounds";
      }

      // Space type check
      const space = getSpace(state.board, target);
      if (!space || space.type === "void") {
        return "Cannot move to void space";
      }

      // Can't move onto spawn spaces (one-way entry)
      if (space.type === "spawn") {
        return "Cannot move onto spawn spaces";
      }

      return null;
    }

    case "attack": {
      if (!hasEnergy(team)) {
        return "No energy — cannot attack";
      }

      const attack = vellymon.attacks[command.attackIndex];
      if (!attack) {
        return "Invalid attack index";
      }

      if (team.energy < attack.energyCost) {
        return `Not enough energy (need ${attack.energyCost}, have ${team.energy})`;
      }

      // Range check
      const dist = manhattanDistance(vellymon.position, command.targetPosition);
      if (dist > attack.range) {
        return `Target out of range (range ${attack.range}, distance ${dist})`;
      }

      if (dist === 0) {
        return "Cannot attack own position";
      }

      return null;
    }

    case "harvest": {
      const space = getSpace(state.board, vellymon.position);
      if (!space || space.type !== "harvestable") {
        return "Current space is not harvestable";
      }

      return null;
    }
  }
}

/**
 * Get available commands for a vellymon (for UI).
 */
export function getAvailableCommands(
  vellymon: VellymonState,
  team: TeamState,
  state: GameState,
): ("move" | "attack" | "harvest")[] {
  if (vellymon.isKO || !vellymon.position) return [];

  const available: ("move" | "attack" | "harvest")[] = [];

  // Move is always available (validation checks bounds at resolution)
  available.push("move");

  // Attack available only if team has energy
  if (hasEnergy(team)) {
    available.push("attack");
  }

  // Harvest available only on harvestable spaces
  const space = getSpace(state.board, vellymon.position);
  if (space?.type === "harvestable") {
    available.push("harvest");
  }

  return available;
}

// ─── Resolution ──────────────────────────────────────────────────────────────

/**
 * Resolve a single Move command.
 * Collision detection is handled at the turn level (resolveCommands),
 * but basic validation is re-checked here for safety.
 */
export function resolveMove(
  command: MoveCommand,
  team: TeamState,
  state: GameState,
): CommandResult {
  const vellymon = team.active.find(
    (v) => v.uuid === command.vellymonUuid && !v.isKO,
  );
  if (!vellymon?.position) {
    return { command, success: false, reason: "Vellymon not found" };
  }

  const offset = directionToOffset(command.direction);
  const target: Position = {
    x: vellymon.position.x + offset.x,
    y: vellymon.position.y + offset.y,
  };

  const space = getSpace(state.board, target);
  if (
    !space ||
    space.type === "void" ||
    space.type === "spawn" ||
    target.x < 0 ||
    target.x >= state.boardWidth ||
    target.y < 0 ||
    target.y >= state.boardHeight
  ) {
    return { command, success: false, reason: "Invalid move target" };
  }

  // Check for collision (another vellymon already at target that isn't moving away)
  const occupant = getVellymonAtPosition(state, target);
  if (occupant) {
    return { command, success: false, reason: "Space occupied" };
  }

  vellymon.position = target;
  return { command, success: true };
}

/**
 * Resolve a single Attack command.
 */
export function resolveAttack(
  command: AttackCommand,
  team: TeamState,
  state: GameState,
): CommandResult {
  const vellymon = team.active.find(
    (v) => v.uuid === command.vellymonUuid && !v.isKO,
  );
  if (!vellymon?.position) {
    return { command, success: false, reason: "Vellymon not found" };
  }

  const attack = vellymon.attacks[command.attackIndex];
  if (!attack) {
    return { command, success: false, reason: "Invalid attack" };
  }

  if (!spendEnergy(team, attack.energyCost)) {
    return {
      command,
      success: false,
      reason: "Not enough energy",
    };
  }

  // Find target at position
  const target = getVellymonAtPosition(state, command.targetPosition);
  if (!target) {
    // Energy spent but no target — whiffed
    return {
      command,
      success: true,
      energyDelta: -attack.energyCost,
      damageDealt: 0,
    };
  }

  // Don't attack own team
  const isOwnTeam = team.active.some((v) => v.uuid === target.uuid);
  if (isOwnTeam) {
    // Energy spent but friendly fire blocked
    return {
      command,
      success: false,
      reason: "Cannot attack own team",
      energyDelta: -attack.energyCost,
    };
  }

  // Deal damage
  const damage = attack.damage + vellymon.attack;
  target.hp = Math.max(0, target.hp - damage);
  const ko = target.hp === 0;

  if (ko) {
    target.isKO = true;
    target.position = null;
  }

  return {
    command,
    success: true,
    energyDelta: -attack.energyCost,
    damageDealt: damage,
    targetKO: ko,
  };
}

/**
 * Resolve a single Harvest command.
 */
export function resolveHarvest(
  command: HarvestCommand,
  team: TeamState,
  state: GameState,
): CommandResult {
  const vellymon = team.active.find(
    (v) => v.uuid === command.vellymonUuid && !v.isKO,
  );
  if (!vellymon?.position) {
    return { command, success: false, reason: "Vellymon not found" };
  }

  const space = getSpace(state.board, vellymon.position);
  if (!space || space.type !== "harvestable") {
    return {
      command,
      success: false,
      reason: "Not on harvestable space",
    };
  }

  const gained = harvestEnergy(team, space);
  return {
    command,
    success: true,
    energyDelta: gained,
  };
}

/**
 * Resolve a single command (dispatches to type-specific resolver).
 */
export function resolveCommand(
  command: Command,
  team: TeamState,
  state: GameState,
): CommandResult {
  switch (command.type) {
    case "move":
      return resolveMove(command, team, state);
    case "attack":
      return resolveAttack(command, team, state);
    case "harvest":
      return resolveHarvest(command, team, state);
  }
}
