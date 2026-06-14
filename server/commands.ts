/**
 * Command set for vellymon matches.
 *
 * Four action slots per vellymon per turn (Pokémon-style):
 * - Move — move one space in a cardinal direction (free)
 * - Attack 1 — use first attack in a direction (costs energy)
 * - Attack 2 — use second attack in a direction (costs energy)
 * - Harvest — gather energy from adjacent space in a direction (free, must be harvestable)
 *
 * All actions are directional — player picks an action, then a direction.
 * Attacks scan along the direction for the first enemy within range.
 * Harvest targets the adjacent tile; blocked if an enemy occupies it.
 *
 * One command per vellymon per turn.
 * At 0 team energy, Attacks are unavailable.
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

export type Direction = "up" | "down" | "left" | "right";

export type MoveCommand = {
  type: "move";
  vellymonUuid: string;
  direction: Direction;
};

export type AttackCommand = {
  type: "attack";
  vellymonUuid: string;
  attackIndex: number;
  direction: Direction;
};

export type HarvestCommand = {
  type: "harvest";
  vellymonUuid: string;
  direction: Direction;
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
  /** UUID of the vellymon that was hit (attack only, absent on whiff) */
  targetUuid?: string;
  /** Name of the attack used (attack only, e.g. "Snipe", "Strike") */
  attackName?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function directionToOffset(direction: Direction): Position {
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

/**
 * Snapshot-aware variant: find the vellymon that occupied `pos` at the START
 * of the turn (before any moves resolved).  Returns the LIVE VellymonState
 * object so that damage can still be applied to the correct entity, but only
 * matches against pre-turn positions to prevent movers from being hit when
 * they stepped into the attacker's line of fire mid-turn.
 */
function getVellymonAtPositionFromSnapshot(
  state: GameState,
  pos: Position,
  snapshot: Map<string, Position | null>,
): VellymonState | undefined {
  for (const team of state.teams) {
    for (const v of team.active) {
      if (v.isKO) continue;
      const snapPos = snapshot.get(v.uuid);
      if (snapPos && snapPos.x === pos.x && snapPos.y === pos.y) {
        return v; // live object, snapshot position
      }
    }
  }
  return undefined;
}

/**
 * Scan along a direction from a position for the first enemy within range.
 * Returns the position of the first enemy found, or null if none.
 *
 * When `positionSnapshot` is provided, occupancy is checked against
 * start-of-turn positions instead of live positions — this prevents a mon that
 * moved INTO the attack path during the same turn from being erroneously hit.
 */
function scanForTarget(
  state: GameState,
  from: Position,
  direction: Direction,
  range: number,
  ownTeam: TeamState,
  positionSnapshot?: Map<string, Position | null>,
): { position: Position; target: VellymonState } | null {
  const offset = directionToOffset(direction);

  for (let dist = 1; dist <= range; dist++) {
    const pos: Position = {
      x: from.x + offset.x * dist,
      y: from.y + offset.y * dist,
    };

    // Out of bounds — stop scanning
    if (
      pos.x < 0 ||
      pos.x >= state.boardWidth ||
      pos.y < 0 ||
      pos.y >= state.boardHeight
    ) {
      break;
    }

    // Void space — stop scanning (can't shoot through walls)
    const space = getSpace(state.board, pos);
    if (!space || space.type === "void") break;

    // Check for any vellymon at this position (snapshot-aware when provided)
    const occupant = positionSnapshot
      ? getVellymonAtPositionFromSnapshot(state, pos, positionSnapshot)
      : getVellymonAtPosition(state, pos);

    if (occupant) {
      // Skip own team (don't friendly-fire, but also stop scanning — can't shoot through allies)
      const isOwnTeam = ownTeam.active.some((v) => v.uuid === occupant.uuid);
      if (isOwnTeam) break;
      return { position: pos, target: occupant };
    }
  }

  return null;
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

      // No target check here — attacking into empty space is allowed and costs
      // energy (whiff penalty). resolveAttack handles the no-hit case.
      return null;
    }

    case "harvest": {
      const offset = directionToOffset(command.direction);
      const targetPos: Position = {
        x: vellymon.position.x + offset.x,
        y: vellymon.position.y + offset.y,
      };

      // Bounds check
      if (
        targetPos.x < 0 ||
        targetPos.x >= state.boardWidth ||
        targetPos.y < 0 ||
        targetPos.y >= state.boardHeight
      ) {
        return "Harvest target out of bounds";
      }

      const space = getSpace(state.board, targetPos);
      if (!space || space.type !== "harvestable") {
        return "Target space is not harvestable";
      }

      // Check for enemy blocking
      const blocker = getVellymonAtPosition(state, targetPos);
      if (blocker) {
        const isOwnTeam = team.active.some((v) => v.uuid === blocker.uuid);
        if (!isOwnTeam) {
          return "Harvest blocked by enemy";
        }
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

  // Attack available whenever the team has energy — whiffing is allowed (costs energy)
  if (hasEnergy(team)) {
    available.push("attack");
  }

  // Harvest is always shown — direction validation happens at resolution
  available.push("harvest");

  return available;
}

// ─── Resolution ──────────────────────────────────────────────────────────────

/**
 * Resolve a single Move command.
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
 * Scans along the direction for the first enemy within the attack's range.
 */
export function resolveAttack(
  command: AttackCommand,
  team: TeamState,
  state: GameState,
  positionSnapshot?: Map<string, Position | null>,
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

  // Scan for first enemy in direction within range.
  // Use start-of-turn snapshot so that a mon which moved INTO the attack path
  // during this same turn doesn't get erroneously hit.
  const hit = scanForTarget(
    state,
    vellymon.position,
    command.direction,
    attack.range,
    team,
    positionSnapshot,
  );

  if (!hit) {
    // Energy spent but no target — whiffed
    return {
      command,
      success: true,
      energyDelta: -attack.energyCost,
      damageDealt: 0,
      attackName: attack.name,
    };
  }

  // Deal damage
  const damage = attack.damage + vellymon.attack;
  hit.target.hp = Math.max(0, hit.target.hp - damage);
  const ko = hit.target.hp === 0;

  if (ko) {
    hit.target.isKO = true;
    hit.target.position = null;
  }

  return {
    command,
    success: true,
    energyDelta: -attack.energyCost,
    damageDealt: damage,
    targetKO: ko,
    targetUuid: hit.target.uuid,
    attackName: attack.name,
  };
}

/**
 * Resolve a single Harvest command.
 * Harvests the adjacent tile in the given direction.
 * Fails if blocked by an enemy or target isn't harvestable.
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

  const offset = directionToOffset(command.direction);
  const targetPos: Position = {
    x: vellymon.position.x + offset.x,
    y: vellymon.position.y + offset.y,
  };

  const space = getSpace(state.board, targetPos);
  if (!space || space.type !== "harvestable") {
    return {
      command,
      success: false,
      reason: "Target not harvestable",
    };
  }

  // Check for enemy blocking the harvest tile
  const blocker = getVellymonAtPosition(state, targetPos);
  if (blocker) {
    const isOwnTeam = team.active.some((v) => v.uuid === blocker.uuid);
    if (!isOwnTeam) {
      return {
        command,
        success: false,
        reason: "Harvest blocked by enemy",
      };
    }
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
  positionSnapshot?: Map<string, Position | null>,
): CommandResult {
  switch (command.type) {
    case "move":
      return resolveMove(command, team, state);
    case "attack":
      return resolveAttack(command, team, state, positionSnapshot);
    case "harvest":
      return resolveHarvest(command, team, state);
  }
}
