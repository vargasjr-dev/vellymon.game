/**
 * Core game state types for the vellymon engine.
 *
 * These types define the shape of game state that all engine modules
 * (win conditions, energy, commands, board) operate on.
 */

import type { SpaceType } from "./config";

// ─── Positions & Board ───────────────────────────────────────────────────────

export type Position = {
  x: number;
  y: number;
};

export type BoardSpace = {
  position: Position;
  type: SpaceType;
  /** Which team this spawn belongs to (1 or 2), only for spawn spaces */
  team?: 1 | 2;
  /** Occupation counter: negative = team 1, positive = team 2. 0 = neutral */
  occupationCounter?: number;
};

// ─── Vellymon State ──────────────────────────────────────────────────────────

export type Attack = {
  name: string;
  damage: number;
  energyCost: number;
  range: number;
};

export type VellymonState = {
  uuid: string;
  name: string;
  /** Current HP (0 = KO'd) */
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  attacks: Attack[];
  /** Current board position (null if KO'd and not yet replaced, or on bench) */
  position: Position | null;
  /** Whether this vellymon is KO'd */
  isKO: boolean;
  /** Pre-assigned spawn position for bench entry */
  spawnPosition: Position;
  /** Optional special power ID — references the power registry */
  specialPowerId?: string;
  /** Avatar image URL (e.g. /vellymon/aerobolt.png) */
  imageUrl?: string;
};

// ─── Team State ──────────────────────────────────────────────────────────────

export type TeamState = {
  /** Team identifier (1 or 2) */
  id: 1 | 2;
  /** Player user ID */
  userId: string;
  /** Team name */
  name: string;
  /** Team energy pool */
  energy: number;
  /** Active vellymons on the board */
  active: VellymonState[];
  /** Bench vellymons waiting to enter (ordered) */
  bench: VellymonState[];
  /** KO'd vellymons (no longer in play) */
  knocked: VellymonState[];
};

// ─── Game State ──────────────────────────────────────────────────────────────

export type WinCondition = "elimination" | "occupation" | "accumulation" | "concession";

export type WinResult = {
  winner: 1 | 2;
  condition: WinCondition;
};

export type GameState = {
  /** Current turn number (starts at 1) */
  turn: number;
  /** The two teams */
  teams: [TeamState, TeamState];
  /** Board layout — flat array of spaces */
  board: BoardSpace[];
  /** Board dimensions */
  boardWidth: number;
  boardHeight: number;
  /** Match result (null if game still in progress) */
  result: WinResult | null;
  /** Match UUID */
  matchUuid: string;
  /** Game phase */
  phase: "setup" | "playing" | "ended";
};
