/**
 * Board system for vellymon matches.
 *
 * Grid-based board with configurable dimensions and four space types:
 * - Spawn — where vellymons start and bench replacements enter (one-way)
 * - Occupation — 3 tug-of-war control points (near team 1, center, near team 2)
 * - Harvestable — generates energy when harvested (every non-spawn, non-occ, non-void space)
 * - Void — impassable (for shaping maps)
 *
 * Board is represented as a flat array of BoardSpace objects.
 * Coordinates: (0,0) is top-left, x increases right, y increases down.
 * Team 1 starts on the left (low x), Team 2 on the right (high x).
 */

import { GAME_CONFIG } from "./config";
import type { BoardSpace, Position } from "./types";
import type { SpaceType } from "./config";

// ─── Board Generation ────────────────────────────────────────────────────────

/**
 * Generate the default board layout based on GAME_CONFIG dimensions.
 *
 * Default 8×5 layout:
 * ```
 * S . . . O . . S     (y=0)
 * S . . . . . . S     (y=1)
 * . . . O . . . .     (y=2)  ← center row
 * S . . . . . . S     (y=3)
 * S . . . O . . S     (y=4)
 * ```
 * S = spawn, O = occupation, . = harvestable
 * Team 1 spawns: left column (x=0)
 * Team 2 spawns: right column (x=7)
 */
export function generateDefaultBoard(): BoardSpace[] {
  const { width, height } = GAME_CONFIG.board;
  const board: BoardSpace[] = [];

  // Pre-calculate occupation point positions
  const occupationPositions = getDefaultOccupationPositions(width, height);
  const occSet = new Set(occupationPositions.map((p) => `${p.x},${p.y}`));

  // Pre-calculate spawn positions
  const team1Spawns = getDefaultSpawnPositions(1, width, height);
  const team2Spawns = getDefaultSpawnPositions(2, width, height);
  const spawnMap = new Map<string, 1 | 2>();
  for (const pos of team1Spawns) spawnMap.set(`${pos.x},${pos.y}`, 1);
  for (const pos of team2Spawns) spawnMap.set(`${pos.x},${pos.y}`, 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const position: Position = { x, y };

      let type: SpaceType = "harvestable";
      let team: 1 | 2 | undefined;

      if (spawnMap.has(key)) {
        type = "spawn";
        team = spawnMap.get(key);
      } else if (occSet.has(key)) {
        type = "occupation";
      }

      const space: BoardSpace = { position, type };
      if (team) space.team = team;
      if (type === "occupation") space.occupationCounter = 0;

      board.push(space);
    }
  }

  return board;
}

/**
 * Get default spawn positions for a team.
 * Team 1: left column (x=0), distributed vertically
 * Team 2: right column (x=width-1), distributed vertically
 */
export function getDefaultSpawnPositions(
  teamId: 1 | 2,
  width: number,
  height: number,
): Position[] {
  const spawnsPerTeam = GAME_CONFIG.board.spawnsPerTeam;
  const x = teamId === 1 ? 0 : width - 1;
  const positions: Position[] = [];

  // Distribute spawns evenly along the column
  if (spawnsPerTeam >= height) {
    // More spawns than rows — fill entire column
    for (let y = 0; y < height; y++) {
      positions.push({ x, y });
    }
  } else {
    // Space spawns evenly
    const gap = (height - 1) / (spawnsPerTeam - 1);
    for (let i = 0; i < spawnsPerTeam; i++) {
      positions.push({ x, y: Math.round(i * gap) });
    }
  }

  return positions;
}

/**
 * Get default occupation point positions.
 * 3 points spread asymmetrically between the two teams:
 * - One closer to team 1 (left side)
 * - One in the center
 * - One closer to team 2 (right side)
 *
 * For the default 8×5 board:
 *   Team 1 spawns at x=0, Team 2 at x=7
 *   Occupation at x=2 (near T1), x=4 (center), x=5 (near T2)
 *   Spread across y for diagonal interest
 */
function getDefaultOccupationPositions(
  width: number,
  height: number,
): Position[] {
  const centerY = Math.floor(height / 2);

  return [
    { x: Math.floor(width * 0.25), y: 1 },            // near team 1 side, upper
    { x: Math.floor(width * 0.5), y: centerY },        // true center
    { x: Math.floor(width * 0.75) - 1, y: height - 2 }, // near team 2 side, lower
  ];
}

// ─── Board Queries ───────────────────────────────────────────────────────────

/**
 * Get a space at a specific position.
 */
export function getSpaceAt(
  board: BoardSpace[],
  pos: Position,
): BoardSpace | undefined {
  return board.find(
    (s) => s.position.x === pos.x && s.position.y === pos.y,
  );
}

/**
 * Get all spaces of a specific type.
 */
export function getSpacesByType(
  board: BoardSpace[],
  type: SpaceType,
): BoardSpace[] {
  return board.filter((s) => s.type === type);
}

/**
 * Get all spawn spaces for a team.
 */
export function getTeamSpawns(
  board: BoardSpace[],
  teamId: 1 | 2,
): BoardSpace[] {
  return board.filter((s) => s.type === "spawn" && s.team === teamId);
}

/**
 * Get all occupation points and their current control state.
 */
export function getOccupationStatus(
  board: BoardSpace[],
): { position: Position; counter: number; controlledBy: 1 | 2 | null }[] {
  const threshold = GAME_CONFIG.occupation.ticksToControl;

  return board
    .filter((s) => s.type === "occupation")
    .map((s) => {
      const counter = s.occupationCounter ?? 0;
      let controlledBy: 1 | 2 | null = null;
      if (counter <= -threshold) controlledBy = 1;
      if (counter >= threshold) controlledBy = 2;

      return {
        position: s.position,
        counter,
        controlledBy,
      };
    });
}

/**
 * Check if a position is within board bounds.
 */
export function isInBounds(
  pos: Position,
  width: number = GAME_CONFIG.board.width,
  height: number = GAME_CONFIG.board.height,
): boolean {
  return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
}

/**
 * Get adjacent positions (cardinal directions only).
 */
export function getAdjacentPositions(pos: Position): Position[] {
  return [
    { x: pos.x, y: pos.y - 1 },   // up
    { x: pos.x, y: pos.y + 1 },   // down
    { x: pos.x - 1, y: pos.y },   // left
    { x: pos.x + 1, y: pos.y },   // right
  ];
}

/**
 * Render a text-based board visualization (for debugging/logs).
 */
export function renderBoardText(board: BoardSpace[]): string {
  const width = GAME_CONFIG.board.width;
  const height = GAME_CONFIG.board.height;
  const lines: string[] = [];

  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const space = getSpaceAt(board, { x, y });
      if (!space) {
        line += "? ";
        continue;
      }
      switch (space.type) {
        case "spawn":
          line += space.team === 1 ? "1 " : "2 ";
          break;
        case "occupation":
          line += "O ";
          break;
        case "harvestable":
          line += ". ";
          break;
        case "void":
          line += "X ";
          break;
      }
    }
    lines.push(line.trimEnd());
  }

  return lines.join("\n");
}
