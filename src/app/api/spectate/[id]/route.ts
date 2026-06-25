/**
 * Spectate API route — serves match state for the read-only spectator view.
 *
 * Reads from two sources in order:
 *  1. `.vellymon/[id].json` on the filesystem — for CLI-created local matches
 *  2. Database — for uploaded matches (matchSnapshot table)
 *
 * No auth required — spectating is public.
 */

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { db } from "../../../../../data/db";
import { matchSnapshot, gameSession } from "../../../../../data/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Sanitize: allow alphanumeric + hyphens (UUIDs) to prevent path traversal
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
  }

  // ── 1. Try local .vellymon file (CLI / dev mode) ──────────────────────────
  try {
    const filePath = join(process.cwd(), ".vellymon", `${id}.json`);
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as {
      gameState: unknown;
      turnHistory?: unknown[];
      turnSnapshots?: unknown[];
      turnLogs?: unknown[];
    };

    return NextResponse.json({
      gameState: data.gameState,
      status: "completed",
      turnSnapshots: data.turnSnapshots ?? [],
      turnLogs: data.turnLogs ?? [],
      turnHistory: data.turnHistory ?? [],
    });
  } catch {
    // File not found — fall through to DB
  }

  // ── 2. DB fallback — matchSnapshot table (for CLI-uploaded matches) ────────
  try {
    const [row] = await db
      .select()
      .from(matchSnapshot)
      .where(eq(matchSnapshot.id, id));

    if (row) {
      return NextResponse.json({
        gameState: row.gameState,
        status: row.status,
        turnSnapshots: (row.turnSnapshots as unknown[]) ?? [],
        turnLogs: (row.turnLogs as unknown[]) ?? [],
        turnHistory: [],
      });
    }
  } catch {
    // DB unavailable — fall through
  }

  // ── 3. gameSession fallback — web practice/ranked matches ─────────────────
  try {
    const [row] = await db
      .select()
      .from(gameSession)
      .where(eq(gameSession.uuid, id));

    if (row) {
      const meta = row.metadata as {
        gameState?: unknown;
        turnHistory?: unknown[];
      } | null;
      return NextResponse.json({
        gameState: meta?.gameState ?? null,
        status: "completed",
        turnSnapshots: [],
        turnLogs: [],
        turnHistory: meta?.turnHistory ?? [],
      });
    }
  } catch {
    // DB unavailable — fall through
  }

  return NextResponse.json({ error: "Match not found" }, { status: 404 });
}
