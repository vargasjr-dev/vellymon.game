#!/usr/bin/env bun
/**
 * auto-match.ts — plays a full AI vs AI vellymon match and uploads it.
 *
 * Strategy:
 *   - Each active vellymon picks the best action each turn:
 *     1. Attack if an enemy is in range
 *     2. Move toward the nearest enemy
 *     3. Harvest if energy is low and standing on a harvestable space
 *   - Max 15 turns then force-end
 */

import { resolve, join } from "node:path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { VELLYMON_LIBRARY } from "../server/vellymonLibrary";
import { buildTeamSetup } from "../server/matchSetup";
import {
  initializeGame,
  startTurn,
  resolveTurn,
  isGameActive,
  getWinner,
  type TurnLog,
} from "../server/engine";
import { submitCommands } from "../server/turnTimer";
import type { GameState, VellymonState, BoardSpace } from "../server/types";
import type { Command } from "../server/commands";
import type { TurnTimerState } from "../server/turnTimer";

// ─── State dir ───────────────────────────────────────────────────────────────

const STATE_DIR = resolve(import.meta.dir, "../.vellymon");
if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ─── AI: pick best command for a vellymon ────────────────────────────────────

const DIRS = ["up", "down", "left", "right"] as const;
type Dir = typeof DIRS[number];

function moveDir(pos: { x: number; y: number }, dir: Dir): { x: number; y: number } {
  const d = { x: pos.x, y: pos.y };
  if (dir === "up") d.y -= 1;
  if (dir === "down") d.y += 1;
  if (dir === "left") d.x -= 1;
  if (dir === "right") d.x += 1;
  return d;
}

function isOnBoard(pos: { x: number; y: number }, gs: GameState): boolean {
  return pos.x >= 0 && pos.x < gs.boardWidth && pos.y >= 0 && pos.y < gs.boardHeight;
}

function pickCommand(vm: VellymonState, teamId: 1 | 2, gs: GameState): Command {
  const myPos = vm.position!;
  const enemyTeam = gs.teams.find((t) => t.id !== teamId)!;
  const enemies = enemyTeam.active.filter((e) => !e.isKO && e.position);
  const myTeam = gs.teams.find((t) => t.id === teamId)!;

  // 1. Attack if any enemy is in range and we have enough energy
  if (enemies.length > 0 && vm.attacks.length > 0 && myTeam.energy >= vm.attacks[0].energyCost) {
    const attack = vm.attacks[0];
    for (const e of enemies) {
      if (!e.position) continue;
      if (dist(myPos, e.position) <= attack.range) {
        const dx = e.position.x - myPos.x;
        const dy = e.position.y - myPos.y;
        const dir: Dir =
          Math.abs(dx) >= Math.abs(dy)
            ? dx > 0 ? "right" : "left"
            : dy > 0 ? "down" : "up";
        return { type: "attack", vellymonUuid: vm.uuid, attackIndex: 0, direction: dir };
      }
    }
  }

  // 2. Harvest if energy is low and standing on a harvestable space
  const mySpace = gs.board.find(
    (s: BoardSpace) => s.position.x === myPos.x && s.position.y === myPos.y,
  );
  const maxAttackCost = vm.attacks[0]?.energyCost ?? 10;
  if (myTeam.energy < maxAttackCost * 2 && mySpace?.type === "harvestable") {
    for (const dir of DIRS) {
      const neighbor = moveDir(myPos, dir);
      if (isOnBoard(neighbor, gs)) {
        return { type: "harvest", vellymonUuid: vm.uuid, direction: dir };
      }
    }
  }

  // 3. Move toward the nearest enemy
  if (enemies.length > 0) {
    const nearest = enemies.reduce((best, e) =>
      e.position && dist(myPos, e.position) < dist(myPos, best.position!) ? e : best,
    );
    if (nearest.position) {
      const dx = nearest.position.x - myPos.x;
      const dy = nearest.position.y - myPos.y;
      const dir: Dir =
        Math.abs(dx) >= Math.abs(dy)
          ? dx > 0 ? "right" : "left"
          : dy > 0 ? "down" : "up";
      const next = moveDir(myPos, dir);
      if (isOnBoard(next, gs)) {
        return { type: "move", vellymonUuid: vm.uuid, direction: dir };
      }
    }
  }

  // 4. Fallback: advance in team direction
  const defaultDir: Dir = teamId === 1 ? "right" : "left";
  const next = moveDir(myPos, defaultDir);
  if (isOnBoard(next, gs)) return { type: "move", vellymonUuid: vm.uuid, direction: defaultDir };
  return { type: "move", vellymonUuid: vm.uuid, direction: "down" };
}

function buildCommands(teamId: 1 | 2, gs: GameState): Command[] {
  const team = gs.teams.find((t) => t.id === teamId)!;
  return team.active.filter((v) => !v.isKO && v.position).map((v) => pickCommand(v, teamId, gs));
}

// ─── Match file type ─────────────────────────────────────────────────────────

type MatchFile = {
  id: string;
  createdAt: string;
  gameState: GameState;
  timer: TurnTimerState | null;
  pendingCommands: Record<string, Command[]>;
  turnLogs: TurnLog[];
  turnSnapshots: GameState[];
  stats: Record<string, { damageDealt: number; damageTaken: number; harvests: number; kos: number; moves: number }>;
};

// ─── Main ────────────────────────────────────────────────────────────────────

const MAX_TURNS = 15;
const id = shortId();

console.log(`\n⚔️  Auto-match ${id} — AI vs AI (max ${MAX_TURNS} turns)\n`);

const picked = shuffle(VELLYMON_LIBRARY).slice(0, 16);
const setup1 = buildTeamSetup(picked.slice(0, 8), 1);
const setup2 = buildTeamSetup(picked.slice(8, 16), 2);

console.log(`Team 1: ${setup1.teamName}`);
console.log(`Team 2: ${setup2.teamName}\n`);

const gs = initializeGame(id, setup1, setup2);

const match: MatchFile = {
  id,
  createdAt: new Date().toISOString(),
  gameState: gs,
  timer: null,
  pendingCommands: {},
  turnLogs: [],
  turnSnapshots: [JSON.parse(JSON.stringify(gs)) as GameState],
  stats: {},
};

for (const t of gs.teams) {
  for (const vm of [...t.active, ...t.bench]) {
    match.stats[vm.uuid] = { damageDealt: 0, damageTaken: 0, harvests: 0, kos: 0, moves: 0 };
  }
}

// ── Turn loop ─────────────────────────────────────────────────────────────────
while (isGameActive(gs) && gs.turn < MAX_TURNS) {
  const timer = startTurn(gs);
  submitCommands(timer, 1, buildCommands(1, gs));
  submitCommands(timer, 2, buildCommands(2, gs));

  const turnLog = resolveTurn(gs, timer);
  match.turnLogs.push(turnLog);
  match.turnSnapshots.push(JSON.parse(JSON.stringify(gs)) as GameState);

  const [t1, t2] = gs.teams;
  const alive1 = t1.active.filter((v) => !v.isKO).length;
  const alive2 = t2.active.filter((v) => !v.isKO).length;
  const winSuffix = gs.result ? ` → ${getWinner(gs)?.name} WINS (${gs.result.condition})` : "";
  console.log(`Turn ${gs.turn}: T1 ${alive1} alive (${t1.energy}⚡) | T2 ${alive2} alive (${t2.energy}⚡)${winSuffix}`);

  if (!isGameActive(gs)) break;
}

match.gameState = gs;

const outPath = join(STATE_DIR, `${id}.json`);
writeFileSync(outPath, JSON.stringify(match, null, 2));
console.log(`\n✅ Match saved → .vellymon/${id}.json`);
console.log(`   Turns played: ${gs.turn} | Snapshots: ${match.turnSnapshots.length}`);
console.log(gs.result ? `   Winner: ${getWinner(gs)?.name} (${gs.result.condition})` : "   Result: max turns reached");

// ── Upload ────────────────────────────────────────────────────────────────────
console.log("\nUploading...");

const configPath = join(STATE_DIR, "config.json");
let baseUrl = "https://vellymon.game";
let apiKey: string | undefined;
if (existsSync(configPath)) {
  try {
    const cfg = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, string>;
    if (cfg.url) baseUrl = cfg.url;
    if (cfg.apiKey) apiKey = cfg.apiKey;
  } catch { /* ignore */ }
}
apiKey = process.env.VELLYMON_UPLOAD_API_KEY ?? apiKey;

if (!apiKey) {
  console.error("❌ No API key. Set VELLYMON_UPLOAD_API_KEY or add to .vellymon/config.json");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/matches/upload`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    id: match.id,
    gameState: match.gameState,
    turnSnapshots: match.turnSnapshots,
    status: "completed",
  }),
});

if (!res.ok) {
  const body = await res.text().catch(() => "");
  console.error(`❌ Upload failed (HTTP ${res.status}): ${body}`);
  process.exit(1);
}

const result = await res.json() as { ok: boolean; spectateUrl: string };
console.log(`✅ Spectate: ${result.spectateUrl}`);
