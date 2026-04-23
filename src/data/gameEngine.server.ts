/**
 * Game engine integration — bridges the DB match data with the engine.
 *
 * Uses HTTP polling instead of WebSocket. Game state is stored in the
 * gameSession.metadata JSON column. Commands are stored there too until
 * both players submit, then the turn auto-resolves.
 */

import { db } from "../../data/db";
import { gameSession, gamePlayer, teamSlot, team, vellymonInstance } from "../../data/schema";
import { eq, asc } from "drizzle-orm";
import {
  VELLYMON_LIBRARY,
  type VellymonTemplate,
} from "../../server/vellymonLibrary";
import { calculateDamage } from "../../server/archetypes";
import {
  initializeGame,
  startTurn,
  resolveTurn,
  isGameActive,
  type TeamSetup,
  type VellymonSetup,
  type TurnLog,
} from "../../server/engine";
import {
  submitCommands as submitTimerCommands,
  bothTeamsReady,
  isExpired,
  type TurnTimerState,
} from "../../server/turnTimer";
import { getDefaultSpawnPositions } from "../../server/board";
import { GAME_CONFIG } from "../../server/config";
import type { GameState } from "../../server/types";
import type { Command } from "../../server/commands";

// ─── Vellymon lookup ─────────────────────────────────────────────────────────

/** Map from model UUID → VellymonTemplate for fast lookup */
const templateByModelUuid = new Map<string, VellymonTemplate>();

// Build UUID → template map (same UUID format as enums/vellymons.ts)
function idToUuid(id: number): string {
  const hex = id.toString(16).padStart(4, "0");
  const padded = id.toString(16).padStart(12, "0");
  return `00be1100-${hex}-4000-8000-${padded}`;
}

for (const v of VELLYMON_LIBRARY) {
  templateByModelUuid.set(idToUuid(v.id), v);
}

function getTemplate(modelUuid: string): VellymonTemplate {
  const t = templateByModelUuid.get(modelUuid);
  if (!t) throw new Error(`Unknown vellymon model: ${modelUuid}`);
  return t;
}

// ─── Metadata Shape ──────────────────────────────────────────────────────────

/** Snapshot of board + team state at a point in time (for replay) */
type TurnSnapshot = {
  turn: number;
  /** Deep copy of board state before this turn resolved */
  boardBefore: GameState["board"];
  /** Deep copy of team states before this turn resolved */
  teamsBefore: Array<{ id: 1 | 2; name: string; energy: number; active: Array<{ uuid: string; name: string; hp: number; maxHp: number; position: { x: number; y: number } | null; isKO: boolean }>; benchCount: number; knockedCount: number }>;
  /** The turn's resolution log */
  log: TurnLog;
};

type MatchMetadata = {
  gameState: GameState;
  timer: TurnTimerState | null;
  /** Commands keyed by team ID (1 or 2) */
  pendingCommands: Record<string, Command[]>;
  /** Most recent turn log (for backwards compat) */
  turnLog: unknown | null;
  /** Full turn history with snapshots (for history UI + future replay) */
  turnHistory: TurnSnapshot[];
};

// ─── Initialize ──────────────────────────────────────────────────────────────

/**
 * Load teams from DB and initialize the game engine for a match.
 */
export async function initializeMatchGame(matchUuid: string): Promise<void> {
  // Load players
  const players = await db
    .select({
      userId: gamePlayer.userId,
      teamUuid: gamePlayer.teamUuid,
    })
    .from(gamePlayer)
    .where(eq(gamePlayer.gameSessionUuid, matchUuid))
    .orderBy(asc(gamePlayer.joinedAt));

  if (players.length < 2) throw new Error("Need 2 players to start");

  // Build team setups
  const team1Setup = await buildTeamSetup(players[0].userId, players[0].teamUuid, 1);
  const team2Setup = await buildTeamSetup(players[1].userId, players[1].teamUuid, 2);

  // Initialize game state
  const gameState = initializeGame(matchUuid, team1Setup, team2Setup);
  const timer = startTurn(gameState);

  const metadata: MatchMetadata = {
    gameState,
    timer,
    pendingCommands: {},
    turnLog: null,
    turnHistory: [],
  };

  await db
    .update(gameSession)
    .set({ metadata, status: "playing" })
    .where(eq(gameSession.uuid, matchUuid));
}

async function buildTeamSetup(
  userId: string,
  teamUuid: string,
  teamId: 1 | 2,
): Promise<TeamSetup> {
  // Load team slots with vellymon instances
  const slots = await db
    .select({
      slotIndex: teamSlot.slotIndex,
      isActive: teamSlot.isActive,
      modelUuid: vellymonInstance.modelUuid,
    })
    .from(teamSlot)
    .innerJoin(vellymonInstance, eq(teamSlot.vellymonInstanceUuid, vellymonInstance.uuid))
    .where(eq(teamSlot.teamUuid, teamUuid))
    .orderBy(asc(teamSlot.slotIndex));

  const spawns = getDefaultSpawnPositions(
    teamId,
    GAME_CONFIG.board.width,
    GAME_CONFIG.board.height,
  );

  // First 4 slots = active, rest = bench
  const active: VellymonSetup[] = [];
  const bench: VellymonSetup[] = [];

  for (const slot of slots) {
    const template = getTemplate(slot.modelUuid);
    const setup: VellymonSetup = {
      uuid: `${teamId}-${slot.slotIndex}`,
      name: template.name,
      maxHp: template.hp,
      speed: template.speed,
      attack: template.attack,
      attacks: template.attacks.map((a) => ({
        name: a.name,
        damage: calculateDamage(a, template.attack),
        energyCost: a.energyCost,
        range: a.range,
      })),
      spawnPosition: spawns[slot.slotIndex % spawns.length],
      imageUrl: template.imageUrl,
    };

    if (slot.slotIndex < 4) {
      active.push(setup);
    } else {
      bench.push(setup);
    }
  }

  // Load team name
  const [teamRow] = await db
    .select({ name: team.name })
    .from(team)
    .where(eq(team.uuid, teamUuid));

  return {
    userId,
    teamName: teamRow?.name ?? `Team ${teamId}`,
    active,
    bench,
  };
}

// ─── Read State ──────────────────────────────────────────────────────────────

export async function getMatchGameState(matchUuid: string) {
  const [match] = await db
    .select({ metadata: gameSession.metadata, status: gameSession.status })
    .from(gameSession)
    .where(eq(gameSession.uuid, matchUuid));

  if (!match?.metadata) return null;
  const meta = match.metadata as MatchMetadata;

  return {
    gameState: meta.gameState,
    turnLog: meta.turnLog,
    turnHistory: meta.turnHistory ?? [],
    status: match.status,
  };
}

// ─── Submit Commands ─────────────────────────────────────────────────────────

export async function submitMatchCommands(
  matchUuid: string,
  userId: string,
  commands: Command[],
  overrideTeamId?: 1 | 2,
) {
  const [match] = await db
    .select({ metadata: gameSession.metadata })
    .from(gameSession)
    .where(eq(gameSession.uuid, matchUuid));

  if (!match?.metadata) throw new Error("Game not initialized");
  const meta = match.metadata as MatchMetadata;
  const { gameState, timer } = meta;

  if (!timer) throw new Error("No active turn");

  // Determine which team this user is on
  // overrideTeamId is used for admin play-both-sides matches
  let teamId: 1 | 2;
  if (overrideTeamId) {
    teamId = overrideTeamId;
  } else {
    const teamIndex = gameState.teams.findIndex((t) => t.userId === userId);
    if (teamIndex === -1) throw new Error("User is not in this match");
    teamId = (teamIndex + 1) as 1 | 2;
  }

  // Store commands in timer
  submitTimerCommands(timer, teamId, commands);
  meta.pendingCommands[String(teamId)] = commands;

  // Check if both teams have submitted
  const shouldResolve = bothTeamsReady(timer) || isExpired(timer);
  if (shouldResolve) {
    // Snapshot board state BEFORE resolving (for history/replay)
    const snapshot: TurnSnapshot = {
      turn: gameState.turn,
      boardBefore: JSON.parse(JSON.stringify(gameState.board)),
      teamsBefore: gameState.teams.map((t) => ({
        id: t.id,
        name: t.name,
        energy: t.energy,
        active: t.active.map((v) => ({
          uuid: v.uuid,
          name: v.name,
          hp: v.hp,
          maxHp: v.maxHp,
          position: v.position ? { ...v.position } : null,
          isKO: v.isKO,
        })),
        benchCount: t.bench.length,
        knockedCount: t.knocked.length,
      })),
      log: null as unknown as TurnLog, // filled after resolve
    };

    // Resolve the turn
    const turnLog = resolveTurn(gameState, timer);
    meta.turnLog = turnLog;
    snapshot.log = turnLog;

    // Append to history
    if (!meta.turnHistory) meta.turnHistory = [];
    meta.turnHistory.push(snapshot);
    meta.pendingCommands = {};

    if (isGameActive(gameState)) {
      // Start next turn
      meta.timer = startTurn(gameState);
    } else {
      // Game over
      meta.timer = null;
      await db
        .update(gameSession)
        .set({ metadata: meta, status: "completed" })
        .where(eq(gameSession.uuid, matchUuid));
      return { resolved: true, turnLog, gameOver: true };
    }
  }

  await db
    .update(gameSession)
    .set({ metadata: meta })
    .where(eq(gameSession.uuid, matchUuid));

  return {
    resolved: shouldResolve,
    turnLog: meta.turnLog,
    gameOver: false,
  };
}

// ─── Concede ─────────────────────────────────────────────────────────────────

/**
 * Player concedes — opponent wins immediately via "concession" condition.
 */
export async function concedeMatch(
  matchUuid: string,
  userId: string,
  overrideTeamId?: 1 | 2,
) {
  const [match] = await db
    .select({ metadata: gameSession.metadata })
    .from(gameSession)
    .where(eq(gameSession.uuid, matchUuid));

  if (!match?.metadata) throw new Error("Game not initialized");
  const meta = match.metadata as MatchMetadata;
  const { gameState } = meta;

  if (gameState.result) throw new Error("Game is already over");

  // Determine which team is conceding
  let concedingTeamId: 1 | 2;
  if (overrideTeamId) {
    concedingTeamId = overrideTeamId;
  } else {
    const teamIndex = gameState.teams.findIndex((t) => t.userId === userId);
    if (teamIndex === -1) throw new Error("User is not in this match");
    concedingTeamId = (teamIndex + 1) as 1 | 2;
  }

  // The OTHER team wins
  const winnerId: 1 | 2 = concedingTeamId === 1 ? 2 : 1;

  gameState.result = { winner: winnerId, condition: "concession" };
  gameState.phase = "ended";
  meta.timer = null;

  await db
    .update(gameSession)
    .set({ metadata: meta, status: "completed" })
    .where(eq(gameSession.uuid, matchUuid));

  const winnerTeam = gameState.teams[winnerId - 1];
  return { winner: winnerTeam.name, winnerId, condition: "concession" as const };
}
