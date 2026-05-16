/**
 * Spectate API route — serves match state for the read-only spectator view.
 *
 * Reads from two sources in order:
 *  1. `.vellymon/[id].json` on the filesystem — for CLI-created local matches
 *  2. Database — for web-created matches (TODO when DB spectate is needed)
 *
 * No auth required — spectating is public.
 */

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { db } from "../../../../../data/db";
import { matchSnapshot } from "../../../../../data/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Sanitize: only allow alphanumeric match IDs to prevent path traversal
  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
  }

  // ── 1. Try local .vellymon file (CLI / dev mode) ──────────────────────────
  try {
    const filePath = join(process.cwd(), ".vellymon", `${id}.json`);
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as {
      gameState: unknown;
      turnHistory?: unknown[];
    };

    return NextResponse.json({
      gameState: data.gameState,
      status: "playing",
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
        turnHistory: [],
      });
    }
  } catch {
    // DB unavailable — fall through
  }

  return NextResponse.json({ error: "Match not found" }, { status: 404 });
}
