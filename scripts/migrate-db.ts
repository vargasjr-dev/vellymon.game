/**
 * Data migration script — run once with: bun scripts/migrate-db.ts
 *
 * Migration 1: Rename power ID first_strike → blood_rush in all matchSnapshot
 *              gameState and turnSnapshot blobs.
 *
 * Migration 2: Convert legacy direction strings ("up"|"down"|"left"|"right")
 *              in matchSnapshot turnLogs commandResults to Vec2 {dx, dy}.
 *              After this runs, normalizeCommand() and normalizeVec() compat
 *              shims can be deleted from the codebase.
 *
 * Direction mapping (game space: y increases downward):
 *   "up"    → { dx:  0, dy: -1 }
 *   "down"  → { dx:  0, dy:  1 }
 *   "left"  → { dx: -1, dy:  0 }
 *   "right" → { dx:  1, dy:  0 }
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(
  "postgresql://neondb_owner:npg_kUXuv0mYPAG9@ep-quiet-darkness-ai8g7hzy-pooler.c-4.us-east-1.aws.neon.tech/neondb",
);

type Vec2 = { dx: number; dy: number };

const DIRECTION_TO_VEC: Record<string, Vec2> = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeCommandInLog(cmd: Record<string, unknown>): boolean {
  if (typeof cmd.direction === "string") {
    const vec = DIRECTION_TO_VEC[cmd.direction];
    if (vec) {
      cmd.vec = vec;
      delete cmd.direction;
      return true;
    }
  }
  return false;
}

function walkAndNormalizeTurnLogs(turnLogs: unknown[]): boolean {
  let changed = false;
  for (const turn of turnLogs) {
    const t = turn as Record<string, unknown>;
    const results = t.commandResults as Array<Record<string, unknown>> | undefined;
    if (!results) continue;
    for (const cr of results) {
      const cmd = cr.command as Record<string, unknown> | undefined;
      if (cmd && normalizeCommandInLog(cmd)) changed = true;
    }
  }
  return changed;
}

function renamePowerId(obj: unknown, from: string, to: string): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  let changed = false;
  if (Array.isArray(obj)) {
    for (const item of obj) changed = renamePowerId(item, from, to) || changed;
  } else {
    const o = obj as Record<string, unknown>;
    for (const key of Object.keys(o)) {
      if (key === "specialPowerId" && o[key] === from) {
        o[key] = to;
        changed = true;
      } else {
        changed = renamePowerId(o[key], from, to) || changed;
      }
    }
  }
  return changed;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const rows = await sql`SELECT id, "gameState", "turnSnapshots", "turnLogs" FROM "matchSnapshot"`;
console.log(`Loaded ${rows.length} matchSnapshot rows.`);

let powerFixed = 0;
let dirFixed = 0;

for (const row of rows) {
  const updates: Record<string, string> = {};

  // Migration 1: first_strike → blood_rush in gameState + turnSnapshots
  const gs = row.gameState as Record<string, unknown>;
  const ts = (row.turnSnapshots ?? []) as unknown[];

  const gsChanged = renamePowerId(gs, "first_strike", "blood_rush");
  const tsChanged = renamePowerId(ts, "first_strike", "blood_rush");

  if (gsChanged || tsChanged) {
    if (gsChanged) updates.gameState = JSON.stringify(gs);
    if (tsChanged) updates.turnSnapshots = JSON.stringify(ts);
    powerFixed++;
  }

  // Migration 2: direction strings → Vec2 in turnLogs
  const tl = (row.turnLogs ?? []) as unknown[];
  const tlChanged = walkAndNormalizeTurnLogs(tl);

  if (tlChanged) {
    updates.turnLogs = JSON.stringify(tl);
    dirFixed++;
  }

  if (Object.keys(updates).length > 0) {
    // Build per-column updates — neon tagged-template client doesn't support .unsafe()
    // so we issue separate UPDATE statements per changed column.
    const id = row.id as string;
    if (updates.gameState !== undefined)
      await sql`UPDATE "matchSnapshot" SET "gameState" = ${updates.gameState}::json WHERE id = ${id}`;
    if (updates.turnSnapshots !== undefined)
      await sql`UPDATE "matchSnapshot" SET "turnSnapshots" = ${updates.turnSnapshots}::json WHERE id = ${id}`;
    if (updates.turnLogs !== undefined)
      await sql`UPDATE "matchSnapshot" SET "turnLogs" = ${updates.turnLogs}::json WHERE id = ${id}`;
    console.log(`  Updated row ${row.id} — power:${gsChanged || tsChanged} dir:${tlChanged}`);
  }
}

console.log(`\nDone.`);
console.log(`  first_strike → blood_rush: ${powerFixed} rows`);
console.log(`  direction → Vec2:          ${dirFixed} rows`);
