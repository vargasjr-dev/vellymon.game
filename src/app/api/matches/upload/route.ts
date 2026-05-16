/**
 * Match upload API — accepts a CLI match state and stores it in the DB
 * so the spectate view works from the deployed site.
 *
 * Auth: Bearer token checked against VELLYMON_UPLOAD_API_KEY env var.
 *
 * POST /api/matches/upload
 * Body: { id: string, gameState: object, status?: string }
 * Returns: { ok: true, id: string, spectateUrl: string }
 */

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { db } from "../../../../../data/db";
import { matchSnapshot } from "../../../../../data/schema";

// ── Auto-create table ────────────────────────────────────────────────────────
// DATABASE_URL is a runtime-only env var on Vercel, so drizzle-kit push
// can't run reliably at build time. Create the table lazily on first upload.
async function ensureMatchSnapshotTable() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS "matchSnapshot" (
      "id"          text        PRIMARY KEY,
      "gameState"   json        NOT NULL,
      "status"      varchar(32) NOT NULL DEFAULT 'playing',
      "uploadedAt"  timestamp   NOT NULL DEFAULT now(),
      "updatedAt"   timestamp   NOT NULL DEFAULT now()
    )
  `;
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const apiKey = process.env.VELLYMON_UPLOAD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Upload API not configured (VELLYMON_UPLOAD_API_KEY not set)" },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token !== apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { id?: string; gameState?: unknown; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, gameState, status = "playing" } = body;

  if (!id || typeof id !== "string" || !/^[a-zA-Z0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Missing or invalid match id" }, { status: 400 });
  }
  if (!gameState || typeof gameState !== "object") {
    return NextResponse.json({ error: "Missing gameState" }, { status: 400 });
  }

  // ── Upsert ────────────────────────────────────────────────────────────────
  try {
    await ensureMatchSnapshotTable();
    await db
      .insert(matchSnapshot)
      .values({ id, gameState, status })
      .onConflictDoUpdate({
        target: matchSnapshot.id,
        set: { gameState, status, updatedAt: new Date() },
      });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "DB upsert failed", detail: msg }, { status: 500 });
  }

  const origin = req.headers.get("origin") ?? req.headers.get("host") ?? "vellymon.game";
  const spectateUrl = `${origin.startsWith("http") ? "" : "https://"}${origin}/matches/${id}/spectate`;

  return NextResponse.json({ ok: true, id, spectateUrl });
}
