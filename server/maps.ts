/**
 * Map configurations for vellymon matches.
 *
 * Each map defines its dimensions and a string-based layout:
 *   1 = Team 1 spawn
 *   2 = Team 2 spawn
 *   . = Harvestable (yield 1 — small fern)
 *   f = Fertile (yield 2 — medium fern)
 *   r = Rich (yield 3 — large fern)
 *   h = Lush (yield 4 — glowing tree)
 *   O = Occupation point
 *   V = Void (impassable)
 *
 * Maps are registered in MAPS and looked up by ID.
 */

import type { BoardSpace, Position } from "./types";
import type { SpaceType } from "./config";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MapConfig = {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  /** Layout rows (top to bottom). Cells separated by spaces. */
  layout: string[];
};

// ─── Map Definitions ─────────────────────────────────────────────────────────

/**
 * Standard — Classic 9×5 open battlefield.
 *
 * Fertile (yield 2) tiles near the center reward aggressive positioning.
 * Rich (yield 3) tile at dead center — high-value contest point.
 *
 * ```
 * 1 . . . . . . . 2     y=0
 * 1 . O . f . . . 2     y=1
 * . . f . h . f . .     y=2  ← center row: lush middle (+4), fertile flanks
 * 1 . . . f . O . 2     y=3
 * 1 . . . . . . . 2     y=4
 * ```
 */
const STANDARD: MapConfig = {
  id: "standard",
  name: "Standard",
  description: "Classic 9×5 open battlefield",
  width: 9,
  height: 5,
  layout: [
    "1 . . . . . . . 2",
    "1 . O . f . . . 2",
    ". . f . h . f . .",
    "1 . . . f . O . 2",
    "1 . . . . . . . 2",
  ],
};

/**
 * The Choke — 9×7 with void walls creating a chokepoint.
 *
 * Fertile tiles line the chokepoint gap — harvesting near the fight is rewarding
 * but risky. Rich tile at center.
 *
 * ```
 * 1 . . . V . . . 2     y=0  ← behind void
 * . . . . V . . . .     y=1
 * 1 . O . r . . . 2     y=2  ← open row, rich near gap
 * . . f . h . f . .     y=3  ← center, lush middle (+4)
 * 1 . . . r . O . 2     y=4  ← open row, rich near gap
 * . . . . V . . . .     y=5
 * 1 . . . V . . . 2     y=6  ← behind void
 * ```
 */
const THE_CHOKE: MapConfig = {
  id: "the-choke",
  name: "The Choke",
  description: "9×7 with void walls — fight through the center",
  width: 9,
  height: 7,
  layout: [
    "1 . . . V . . . 2",
    ". . . . V . . . .",
    "1 . O . r . . . 2",
    ". . f . h . f . .",
    "1 . . . r . O . 2",
    ". . . . V . . . .",
    "1 . . . V . . . 2",
  ],
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const MAPS: Record<string, MapConfig> = {
  standard: STANDARD,
  "the-choke": THE_CHOKE,
};

export const MAP_LIST: MapConfig[] = Object.values(MAPS);

export function getMapById(id: string): MapConfig {
  const map = MAPS[id];
  if (!map) throw new Error(`Unknown map: ${id}`);
  return map;
}

// ─── Layout Parsing ──────────────────────────────────────────────────────────

type CellDef = { type: SpaceType; team?: 1 | 2; harvestYield?: number };

const CELL_MAP: Record<string, CellDef> = {
  "1": { type: "spawn", team: 1 },
  "2": { type: "spawn", team: 2 },
  ".": { type: "harvestable", harvestYield: 1 },
  f: { type: "harvestable", harvestYield: 2 },
  r: { type: "harvestable", harvestYield: 3 },
  h: { type: "harvestable", harvestYield: 4 },
  O: { type: "occupation" },
  V: { type: "void" },
};

/**
 * Parse a map layout into BoardSpace[].
 */
export function parseBoardFromMap(map: MapConfig): BoardSpace[] {
  const board: BoardSpace[] = [];

  for (let y = 0; y < map.layout.length; y++) {
    const cells = map.layout[y].split(" ");
    if (cells.length !== map.width) {
      throw new Error(
        `Map "${map.id}" row ${y}: expected ${map.width} cells, got ${cells.length}`,
      );
    }

    for (let x = 0; x < cells.length; x++) {
      const cell = CELL_MAP[cells[x]];
      if (!cell) {
        throw new Error(
          `Map "${map.id}" row ${y} col ${x}: unknown cell "${cells[x]}"`,
        );
      }

      const position: Position = { x, y };
      const space: BoardSpace = { position, type: cell.type };
      if (cell.team) space.team = cell.team;
      if (cell.type === "occupation") space.occupationCounter = 0;
      if (cell.harvestYield !== undefined) space.harvestYield = cell.harvestYield;

      board.push(space);
    }
  }

  return board;
}

/**
 * Extract spawn positions for a team from a map layout.
 */
export function getMapSpawnPositions(
  map: MapConfig,
  teamId: 1 | 2,
): Position[] {
  const marker = teamId === 1 ? "1" : "2";
  const positions: Position[] = [];

  for (let y = 0; y < map.layout.length; y++) {
    const cells = map.layout[y].split(" ");
    for (let x = 0; x < cells.length; x++) {
      if (cells[x] === marker) {
        positions.push({ x, y });
      }
    }
  }

  return positions;
}
