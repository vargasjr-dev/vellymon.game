/**
 * Game Engine — the orchestrator that ties all modules together.
 *
 * This is the complete turn loop:
 * 1. Initialize game state from match data
 * 2. Start turn → create timer
 * 3. Both players submit commands (or timer expires)
 * 4. Resolve commands in speed priority order
 * 5. After each priority: process KOs, bench entries, check win conditions
 * 6. Update occupation counters
 * 7. Check all win conditions
 * 8. If someone won → end game. Otherwise → next turn.
 *
 * Imports every engine module to compose the full game loop.
 */

import { GAME_CONFIG } from "./config";
// Register all special powers on engine load
import "./powers";
import type {
  GameState,
  TeamState,
  VellymonState,
  WinResult,
  Position,
} from "./types";
import { generateDefaultBoard } from "./board";
import { initializeEnergy } from "./energy";
import {
  type Command,
  type CommandResult,
  validateCommand,
  resolveCommand,
} from "./commands";
import { checkWinConditions, updateOccupationCounters } from "./winConditions";
import { processAllBenchEntries, type BenchEntry } from "./bench";
import {
  createTurnTimer,
  getFinalCommands,
  type TurnTimerState,
} from "./turnTimer";

// ─── Game Initialization ─────────────────────────────────────────────────────

export type TeamSetup = {
  userId: string;
  teamName: string;
  active: VellymonSetup[];
  bench: VellymonSetup[];
};

export type VellymonSetup = {
  uuid: string;
  name: string;
  maxHp: number;
  speed: number;
  attack: number;
  attacks: { name: string; damage: number; energyCost: number; range: number }[];
  spawnPosition: Position;
  imageUrl?: string;
};

/**
 * Create a new game state from two team setups.
 * Optionally pass a pre-built board + dimensions (for custom maps).
 */
export function initializeGame(
  matchUuid: string,
  team1Setup: TeamSetup,
  team2Setup: TeamSetup,
  boardOverride?: {
    board: GameState["board"];
    width: number;
    height: number;
  },
): GameState {
  const board = boardOverride?.board ?? generateDefaultBoard();
  const boardWidth = boardOverride?.width ?? GAME_CONFIG.board.width;
  const boardHeight = boardOverride?.height ?? GAME_CONFIG.board.height;

  const team1 = createTeamState(1, team1Setup);
  const team2 = createTeamState(2, team2Setup);

  initializeEnergy(team1);
  initializeEnergy(team2);

  return {
    turn: 0,
    teams: [team1, team2],
    board,
    boardWidth,
    boardHeight,
    result: null,
    matchUuid,
    phase: "playing",
  };
}

function createTeamState(id: 1 | 2, setup: TeamSetup): TeamState {
  return {
    id,
    userId: setup.userId,
    name: setup.teamName,
    energy: 0, // initialized by initializeEnergy
    active: setup.active.map((v) => createVellymonState(v)),
    bench: setup.bench.map((v) => createVellymonState(v)),
    knocked: [],
  };
}

function createVellymonState(setup: VellymonSetup): VellymonState {
  return {
    uuid: setup.uuid,
    name: setup.name,
    hp: setup.maxHp,
    maxHp: setup.maxHp,
    speed: setup.speed,
    attack: setup.attack,
    attacks: setup.attacks,
    position: { ...setup.spawnPosition },
    isKO: false,
    spawnPosition: { ...setup.spawnPosition },
    imageUrl: setup.imageUrl,
  };
}

// ─── Turn Loop ───────────────────────────────────────────────────────────────

export type TurnLog = {
  turn: number;
  commandResults: CommandResult[];
  benchEntries: { team1: BenchEntry[]; team2: BenchEntry[] };
  winResult: WinResult | null;
};

/**
 * Start a new turn. Advances the turn counter and creates a timer.
 * Pass timerSeconds to override the default duration (0 = no timer).
 */
export function startTurn(
  state: GameState,
  timerSeconds?: number,
): TurnTimerState {
  state.turn += 1;
  return createTurnTimer(state.turn, timerSeconds);
}

/**
 * Resolve a full turn once both players have submitted (or timer expired).
 *
 * Resolution order:
 * 1. Collect all commands from both teams
 * 2. Sort by vellymon speed (highest first)
 * 3. Resolve each command in speed order
 * 4. Process KOs and bench entries
 * 5. Update occupation counters
 * 6. Check win conditions
 */
export function resolveTurn(
  state: GameState,
  timer: TurnTimerState,
): TurnLog {
  const [team1, team2] = state.teams;

  // Get final commands (submitted or auto-generated defaults)
  const team1ActiveUuids = team1.active
    .filter((v) => !v.isKO)
    .map((v) => v.uuid);
  const team2ActiveUuids = team2.active
    .filter((v) => !v.isKO)
    .map((v) => v.uuid);

  const { team1: t1Commands, team2: t2Commands } = getFinalCommands(
    timer,
    team1ActiveUuids,
    team2ActiveUuids,
  );

  // Validate commands — invalid ones get logged with failure reason
  type TaggedCommand = {
    command: Command;
    team: TeamState;
    speed: number;
    validationError: string | null;
  };

  const tagCommands = (cmds: Command[], team: TeamState): TaggedCommand[] =>
    cmds.map((cmd) => ({
      command: cmd,
      team,
      speed: getVellymonSpeed(team, cmd.vellymonUuid),
      validationError: validateCommand(cmd, team, state),
    }));

  const allCommands: TaggedCommand[] = [
    ...tagCommands(t1Commands, team1),
    ...tagCommands(t2Commands, team2),
  ];

  // Sort by speed descending (highest speed acts first)
  allCommands.sort((a, b) => b.speed - a.speed);

  // Resolve commands in speed order — invalid ones get logged as failures
  const commandResults: CommandResult[] = [];
  for (const { command, team, validationError } of allCommands) {
    if (validationError) {
      commandResults.push({
        command,
        success: false,
        reason: validationError,
      });
    } else {
      const result = resolveCommand(command, team, state);
      commandResults.push(result);
    }
  }

  // Process bench entries for KO'd vellymons
  const benchEntries = processAllBenchEntries(state);

  // Update occupation counters
  updateOccupationCounters(state);

  // Check win conditions
  const winResult = checkWinConditions(state);
  if (winResult) {
    state.result = winResult;
    state.phase = "ended";
  }

  return {
    turn: state.turn,
    commandResults,
    benchEntries,
    winResult,
  };
}

function getVellymonSpeed(team: TeamState, uuid: string): number {
  const vellymon = team.active.find((v) => v.uuid === uuid);
  return vellymon?.speed ?? 0;
}

// ─── Game Queries ────────────────────────────────────────────────────────────

/**
 * Check if the game is still in progress.
 */
export function isGameActive(state: GameState): boolean {
  return state.phase === "playing" && state.result === null;
}

/**
 * Get the winning team's state, if any.
 */
export function getWinner(state: GameState): TeamState | null {
  if (!state.result) return null;
  return state.teams[state.result.winner - 1];
}

/**
 * Get a summary of the current game state for logging.
 */
export function getGameSummary(state: GameState): string {
  const [t1, t2] = state.teams;
  const t1Active = t1.active.filter((v) => !v.isKO).length;
  const t2Active = t2.active.filter((v) => !v.isKO).length;

  let summary = `Turn ${state.turn} | `;
  summary += `${t1.name}: ${t1Active} active, ${t1.bench.length} bench, ⚡${t1.energy} | `;
  summary += `${t2.name}: ${t2Active} active, ${t2.bench.length} bench, ⚡${t2.energy}`;

  if (state.result) {
    const winner = state.teams[state.result.winner - 1];
    summary += ` | Winner: ${winner.name} (${state.result.condition})`;
  }

  return summary;
}
