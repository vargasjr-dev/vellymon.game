/**
 * LLM-based AI opponent for Vellymon.
 *
 * Replaces the rule-based ai-opponent.ts when an AI profile has a system prompt.
 * One LLM call per team per turn covers all of that team's active vellymons.
 *
 * The request + raw response are persisted to the llmRequest DB table for
 * debugging in spectate/watch mode. Rows older than 7 days are pruned on insert.
 *
 * Falls back to generateAICommands (rule-based) if the LLM call or JSON parse fails.
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "../data/db";
import { llmRequest } from "../data/schema";
import { lt } from "drizzle-orm";
import type { GameState, TeamState, VellymonState, BoardSpace } from "./types";
import type { Command } from "./commands";
import { generateAICommands } from "./ai-opponent";

const MODEL = "claude-haiku-4-5";

// ─── Public API ───────────────────────────────────────────────────────────────

export type LlmAiOptions = {
  matchId: string;
  turn: number;
  profileId?: string;
  /** If provided, an LLM call is made. If absent, falls back to rule-based AI. */
  systemPrompt?: string;
};

/**
 * Generate commands for the AI team. Uses the LLM when systemPrompt is provided,
 * otherwise delegates to the rule-based generateAICommands.
 */
export async function generateLlmAICommands(
  state: GameState,
  aiTeamId: 1 | 2,
  opts: LlmAiOptions,
): Promise<Command[]> {
  if (!opts.systemPrompt) {
    return generateAICommands(state, aiTeamId);
  }

  const aiTeam = state.teams[aiTeamId - 1];
  const activeVellymons = aiTeam.active.filter((v) => !v.isKO && v.position != null);

  if (activeVellymons.length === 0) {
    return [];
  }

  const userMessage = buildUserMessage(state, aiTeam, aiTeamId);

  let rawResponse = "";
  let commands: Command[] | null = null;
  let errorMessage: string | undefined;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: opts.systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = message.content[0];
    rawResponse = block?.type === "text" ? block.text : JSON.stringify(message.content);
    commands = parseCommands(rawResponse, activeVellymons);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    rawResponse = "";
    console.error(`[ai-llm] LLM call failed (match ${opts.matchId} turn ${opts.turn}):`, err);
  }

  // Persist the request/response log (fire-and-forget pruning of old rows)
  void persistLog({
    matchId: opts.matchId,
    turn: opts.turn,
    teamId: aiTeamId,
    profileId: opts.profileId,
    systemPrompt: opts.systemPrompt,
    userMessage,
    rawResponse,
    commands,
    errorMessage,
  });

  // Fall back to rule-based if LLM failed or produced no parseable output
  if (!commands || commands.length === 0) {
    return generateAICommands(state, aiTeamId);
  }

  return commands;
}

// ─── Prompt building ──────────────────────────────────────────────────────────

export function buildSystemPrompt(profileDescription: string, matchRulesContext: string): string {
  return [
    matchRulesContext,
    profileDescription,
    "",
    "GAME MECHANICS:",
    "- Board: a grid where teams start on opposite sides (Team 1 spawns left, Team 2 spawns right).",
    "- Each turn every vellymon issues exactly one command simultaneously.",
    "- Commands: attack, move, or harvest.",
    "- Energy: shared per team. Attacks cost energy. Harvesting adjacent harvestable tiles gains energy.",
    "- Win: KO all enemy vellymons (elimination), or accumulate energy to the win threshold (accumulation).",
    "- Attacks scan in a cardinal direction — the first enemy in range takes damage.",
    "- Moves are blocked by occupied tiles, walls, and void spaces.",
    "",
    "OUTPUT FORMAT: Respond with ONLY a JSON object on a single line with no markdown:",
    '{"commands":[{"vellymonUuid":"...","type":"attack","attackIndex":0,"vec":{"dx":1,"dy":0}},{"vellymonUuid":"...","type":"move","vec":{"dx":-1,"dy":0}},{"vellymonUuid":"...","type":"harvest","vec":{"dx":0,"dy":1}}]}',
    "",
    "RULES:",
    "- Include exactly one command per vellymon listed in YOUR VELLYMONS.",
    "- vec must be a cardinal direction: {\"dx\":1,\"dy\":0}, {\"dx\":-1,\"dy\":0}, {\"dx\":0,\"dy\":1}, {\"dx\":0,\"dy\":-1}.",
    "- For attack: vec is the direction to fire; attackIndex is which attack (0-indexed).",
    "- For move: the target tile must be adjacent, in-bounds, and unoccupied.",
    "- For harvest: an adjacent tile must be harvestable.",
    "- If you are unsure, default to moving toward the nearest enemy.",
  ].join("\n");
}

function buildUserMessage(state: GameState, aiTeam: TeamState, aiTeamId: 1 | 2): string {
  const enemyTeam = state.teams[aiTeamId === 1 ? 1 : 0];
  const harvestables = state.board
    .filter((s) => s.type === "harvestable")
    .map((s) => `(${s.position.x},${s.position.y})`)
    .join(", ");

  const lines: string[] = [
    `TURN ${state.turn} — YOUR TEAM: Team ${aiTeamId} "${aiTeam.name}" (energy: ${aiTeam.energy})`,
    "",
    "YOUR VELLYMONS:",
  ];

  const activeVellymons = aiTeam.active.filter((v) => !v.isKO && v.position != null);
  for (const v of activeVellymons) {
    const pos = v.position!;
    const attacks = v.attacks
      .map((a, i) => `[${i}] ${a.name} (cost:${a.energyCost}, dmg:${a.damage}, range:${a.range})`)
      .join(", ");
    const validActions = describeValidActions(v, aiTeam, enemyTeam, state);
    lines.push(
      `  ${v.name} (uuid: ${v.uuid}) at (${pos.x},${pos.y}) HP:${v.hp}/${v.maxHp} SPD:${v.speed}`,
      `    Attacks: ${attacks}`,
      `    Valid actions: ${validActions}`,
    );
  }

  lines.push("", `ENEMY TEAM: Team ${enemyTeam.id} "${enemyTeam.name}" (energy: ${enemyTeam.energy})`);
  const enemyActive = enemyTeam.active.filter((v) => !v.isKO && v.position != null);
  if (enemyActive.length === 0) {
    lines.push("  (no active vellymons)");
  }
  for (const v of enemyActive) {
    const pos = v.position!;
    lines.push(`  ${v.name} at (${pos.x},${pos.y}) HP:${v.hp}/${v.maxHp}`);
  }

  const koCount = enemyTeam.knocked.length + enemyTeam.active.filter((v) => v.isKO).length;
  if (koCount > 0) lines.push(`  (${koCount} KO'd)`);

  if (harvestables) {
    lines.push("", `HARVESTABLE TILES: ${harvestables}`);
  }

  lines.push("", "Output your JSON commands now:");
  return lines.join("\n");
}

const VECS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
] as const;

function describeValidActions(
  v: VellymonState,
  aiTeam: TeamState,
  enemyTeam: TeamState,
  state: GameState,
): string {
  const pos = v.position!;
  const actions: string[] = [];

  // Attacks
  for (let i = 0; i < v.attacks.length; i++) {
    const atk = v.attacks[i];
    if (!atk || aiTeam.energy < atk.energyCost) continue;
    for (const vec of VECS) {
      const dir = vecName(vec);
      // Scan for enemy in range
      let found = false;
      for (let r = 1; r <= atk.range; r++) {
        const tx = pos.x + vec.dx * r;
        const ty = pos.y + vec.dy * r;
        const space = state.board.find((s) => s.position.x === tx && s.position.y === ty);
        if (!space || space.type === "void") break;
        const enemy = enemyTeam.active.find(
          (e) => !e.isKO && e.position?.x === tx && e.position?.y === ty,
        );
        if (enemy) { found = true; break; }
        // Check friendly blocker (stops non-arc attacks)
        const friendly = aiTeam.active.find(
          (f) => f.uuid !== v.uuid && !f.isKO && f.position?.x === tx && f.position?.y === ty,
        );
        if (friendly && !atk.arcOver) break;
      }
      if (found) actions.push(`attack[${i}] ${dir} (${atk.name})`);
    }
  }

  // Moves
  for (const vec of VECS) {
    const tx = pos.x + vec.dx;
    const ty = pos.y + vec.dy;
    const space = state.board.find((s) => s.position.x === tx && s.position.y === ty);
    if (!space || space.type === "void") continue;
    const occupied = state.teams.some((t) =>
      t.active.some((a) => !a.isKO && a.position?.x === tx && a.position?.y === ty),
    );
    if (!occupied) actions.push(`move ${vecName(vec)}`);
  }

  // Harvest
  for (const vec of VECS) {
    const tx = pos.x + vec.dx;
    const ty = pos.y + vec.dy;
    const space = state.board.find((s) => s.position.x === tx && s.position.y === ty);
    if (space?.type === "harvestable") actions.push(`harvest ${vecName(vec)}`);
  }

  return actions.length > 0 ? actions.join(", ") : "none (will use fallback move)";
}

function vecName(vec: { dx: number; dy: number }): string {
  if (vec.dx === 1) return "right";
  if (vec.dx === -1) return "left";
  if (vec.dy === 1) return "down";
  if (vec.dy === -1) return "up";
  return `(${vec.dx},${vec.dy})`;
}

// ─── Response parsing ─────────────────────────────────────────────────────────

function parseCommands(raw: string, activeVellymons: VellymonState[]): Command[] | null {
  try {
    // Extract JSON from the response (model may wrap it in markdown)
    const jsonMatch = raw.match(/\{[\s\S]*"commands"[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      commands?: Array<{
        vellymonUuid?: string;
        type?: string;
        attackIndex?: number;
        vec?: { dx?: number; dy?: number };
      }>;
    };

    if (!Array.isArray(parsed.commands)) return null;

    const validUuids = new Set(activeVellymons.map((v) => v.uuid));
    const validVecs = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    ];

    const commands: Command[] = [];
    const seen = new Set<string>();

    for (const c of parsed.commands) {
      if (!c.vellymonUuid || !validUuids.has(c.vellymonUuid)) continue;
      if (seen.has(c.vellymonUuid)) continue; // one command per mon

      const dx = typeof c.vec?.dx === "number" ? c.vec.dx : 0;
      const dy = typeof c.vec?.dy === "number" ? c.vec.dy : 0;
      const vec = validVecs.find((v) => v.dx === dx && v.dy === dy);
      if (!vec) continue;

      if (c.type === "attack" && typeof c.attackIndex === "number") {
        commands.push({ type: "attack", vellymonUuid: c.vellymonUuid, attackIndex: c.attackIndex, vec });
        seen.add(c.vellymonUuid);
      } else if (c.type === "move") {
        commands.push({ type: "move", vellymonUuid: c.vellymonUuid, vec });
        seen.add(c.vellymonUuid);
      } else if (c.type === "harvest") {
        commands.push({ type: "harvest", vellymonUuid: c.vellymonUuid, vec });
        seen.add(c.vellymonUuid);
      }
    }

    // Fill any missing mons with a default fallback move (so we always have all commands)
    for (const v of activeVellymons) {
      if (!seen.has(v.uuid)) {
        commands.push({ type: "move", vellymonUuid: v.uuid, vec: { dx: 0, dy: -1 } });
      }
    }

    return commands.length > 0 ? commands : null;
  } catch {
    return null;
  }
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function persistLog(data: {
  matchId: string;
  turn: number;
  teamId: number;
  profileId?: string;
  systemPrompt: string;
  userMessage: string;
  rawResponse: string;
  commands: Command[] | null;
  errorMessage?: string;
}): Promise<void> {
  const id = Math.random().toString(36).slice(2, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Prune old rows + insert new row in parallel
    await Promise.all([
      db.delete(llmRequest).where(lt(llmRequest.createdAt, sevenDaysAgo)),
      db.insert(llmRequest).values({
        id,
        matchId: data.matchId,
        turn: data.turn,
        teamId: data.teamId,
        profileId: data.profileId ?? null,
        model: MODEL,
        systemPrompt: data.systemPrompt,
        userMessage: data.userMessage,
        rawResponse: data.rawResponse,
        commands: data.commands as unknown as Record<string, unknown>[] | null,
        errorMessage: data.errorMessage ?? null,
      }),
    ]);
  } catch (err) {
    // Non-fatal — don't crash the game if logging fails
    console.error("[ai-llm] Failed to persist llmRequest log:", err);
  }
}
