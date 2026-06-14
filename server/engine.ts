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
import { runHook, applyEffects, type EnergyEffect } from "./specialPowers";
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
  attacks: { key: string; name: string; damage: number; energyCost: number; range: number }[];
  spawnPosition: Position;
  imageUrl?: string;
  specialPowerId?: string;
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
  energyOverrides?: {
    startingEnergy?: number;
    winningEnergy?: number;
  },
): GameState {
  const board = boardOverride?.board ?? generateDefaultBoard();
  const boardWidth = boardOverride?.width ?? GAME_CONFIG.board.width;
  const boardHeight = boardOverride?.height ?? GAME_CONFIG.board.height;

  const team1 = createTeamState(1, team1Setup);
  const team2 = createTeamState(2, team2Setup);

  initializeEnergy(team1);
  initializeEnergy(team2);

  // Apply starting energy override (after initializeEnergy sets the default)
  if (energyOverrides?.startingEnergy !== undefined) {
    team1.energy = energyOverrides.startingEnergy;
    team2.energy = energyOverrides.startingEnergy;
  }

  return {
    turn: 0,
    teams: [team1, team2],
    board,
    boardWidth,
    boardHeight,
    result: null,
    matchUuid,
    phase: "playing",
    winningEnergy: energyOverrides?.winningEnergy,
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
    specialPowerId: setup.specialPowerId,
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

// ─── Speed-Tie Resolution ────────────────────────────────────────────────────

/** Phase execution order: harvest acts first, then moves, then attacks. */
function getPhasePriority(command: Command): number {
  switch (command.type) {
    case "harvest": return 0;
    case "move":    return 1;
    case "attack":  return 2;
  }
}

/**
 * Returns the move's base damage for attacks, 0 for all other command types.
 * Lower damage goes first within the attack phase (speed-tie tiebreaker #2).
 */
function getAttackBaseDamage(command: Command, team: TeamState): number {
  if (command.type !== "attack") return 0;
  const vellymon = team.active.find((v) => v.uuid === command.vellymonUuid);
  return vellymon?.attacks[command.attackIndex]?.damage ?? 0;
}

/**
 * Applies possession-arrow tiebreaking in-place within any groups of commands
 * that are fully tied on phase + speed + baseDamage.
 *
 * The arrow is initialized randomly on the first actual tie and flips after
 * each tie group it resolves. It ONLY advances when it is the deciding
 * factor — groups with a single command leave the arrow unchanged.
 */
function resolveArrowTies(
  commands: Array<{ team: { id: 1 | 2 }; phase: number; speed: number; baseDamage: number }>,
  state: GameState,
): void {
  let i = 0;
  while (i < commands.length) {
    // Find the end of this tie group (same phase + speed + baseDamage)
    let j = i + 1;
    while (
      j < commands.length &&
      commands[j].phase === commands[i].phase &&
      commands[j].speed === commands[i].speed &&
      commands[j].baseDamage === commands[i].baseDamage
    ) {
      j++;
    }

    const groupSize = j - i;
    if (groupSize > 1) {
      // Initialize arrow randomly on first actual tie
      if (state.possessionArrow === undefined) {
        state.possessionArrow = Math.random() < 0.5 ? 1 : 2;
      }
      const arrow = state.possessionArrow;

      // Stable sort within the group: arrow team's commands go first
      const group = commands.slice(i, j);
      group.sort((a, b) => {
        const aScore = a.team.id === arrow ? 0 : 1;
        const bScore = b.team.id === arrow ? 0 : 1;
        return aScore - bScore;
      });
      commands.splice(i, groupSize, ...group);

      // Flip the arrow for the next tie
      state.possessionArrow = arrow === 1 ? 2 : 1;
    }

    i = j;
  }
}

/**
 * Resolve a full turn once both players have submitted (or timer expired).
 *
 * Resolution order:
 * 1. Collect all commands from both teams
 * 2. Sort by the three-tier priority system (see sortCommands / resolveArrowTies)
 * 3. Resolve each command in priority order
 * 4. Process KOs and bench entries
 * 5. Update occupation counters
 * 6. Check win conditions
 *
 * Priority tiers (ties cascade to the next tier):
 *   1. Phase      — harvest → move → attack
 *   2. Speed      — higher speed acts first (within the same phase)
 *   3. Base damage — lower move damage acts first (attack phase only)
 *   4. Possession arrow — alternating, random first pick, only advances on actual ties
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
    /** Execution phase: 0=harvest, 1=move, 2=attack */
    phase: number;
    /** Move's base damage (0 for non-attacks). Used as tiebreaker within attacks. */
    baseDamage: number;
    validationError: string | null;
  };

  const tagCommands = (cmds: Command[], team: TeamState): TaggedCommand[] =>
    cmds.map((cmd) => ({
      command: cmd,
      team,
      speed: getVellymonSpeed(team, cmd.vellymonUuid),
      phase: getPhasePriority(cmd),
      baseDamage: getAttackBaseDamage(cmd, team),
      validationError: validateCommand(cmd, team, state),
    }));

  const allCommands: TaggedCommand[] = [
    ...tagCommands(t1Commands, team1),
    ...tagCommands(t2Commands, team2),
  ];

  // Sort by: phase asc → speed desc → base damage asc (attacks only).
  // Commands still tied on all three criteria are broken by the possession arrow below.
  allCommands.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    if (a.speed !== b.speed) return b.speed - a.speed;
    if (a.baseDamage !== b.baseDamage) return a.baseDamage - b.baseDamage;
    return 0;
  });

  // Break remaining ties using the possession arrow (mutates state.possessionArrow).
  resolveArrowTies(allCommands, state);

  // Snapshot all vellymon positions BEFORE any commands execute.
  // Attack target scanning uses these start-of-turn positions so that a mon
  // which moves INTO an attacker's line of fire during the same turn is not
  // erroneously hit (simultaneous-command semantics).
  const positionSnapshot = new Map<string, Position | null>();
  for (const team of state.teams) {
    for (const v of team.active) {
      positionSnapshot.set(v.uuid, v.position ? { ...v.position } : null);
    }
  }

  // Resolve commands in speed order — invalid ones get logged as failures
  const commandResults: CommandResult[] = [];
  for (const { command, team, validationError } of allCommands) {
    if (validationError) {
      commandResults.push({
        command,
        success: false,
        reason: validationError,
      });
      continue;
    }

    const result = resolveCommand(command, team, state, positionSnapshot);

    // ── Special power: onAfterCommand ────────────────────────────────────────
    // Fire after any successful command. Handles attack-triggered powers
    // (e.g. Voidclaw energy drain, Shrednova energy drain).
    if (result.success) {
      const attacker = team.active.find((v) => v.uuid === command.vellymonUuid);
      if (attacker?.specialPowerId) {
        const ctx = {
          self: attacker,
          team: team.id,
          state,
          turn: state.turn,
          command: {
            type: command.type,
            vellymonUuid: command.vellymonUuid,
            direction: command.direction,
          },
        };
        const effects = runHook("onAfterCommand", attacker.specialPowerId, ctx);
        if (effects.length > 0) {
          applyEffects(effects, state);
          // Collect energy deltas for display in the action log
          const energyDeltas: Partial<Record<1 | 2, number>> = {};
          for (const effect of effects) {
            if (effect.type === "energy") {
              const e = effect as EnergyEffect;
              energyDeltas[e.team] = (energyDeltas[e.team] ?? 0) + e.amount;
            }
          }
          if (Object.keys(energyDeltas).length > 0) {
            result.powerEnergyDeltas = energyDeltas;
          }
        }
      }
    }

    commandResults.push(result);
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
