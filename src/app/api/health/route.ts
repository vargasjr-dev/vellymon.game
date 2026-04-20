import { NextResponse } from "next/server";
import { db } from "../../../../data/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/health
 *
 * Post-deploy smoke test. Verifies:
 * 1. The app boots and serves requests
 * 2. The database is reachable (SELECT 1)
 *
 * Returns 200 with status details on success, 503 on failure.
 * No auth required — this is a public health check.
 */
export async function GET() {
  const start = Date.now();

  try {
    await db.execute(sql`SELECT 1`);
    const dbMs = Date.now() - start;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
          app: "ok",
          database: "ok",
          dbLatencyMs: dbMs,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const dbMs = Date.now() - start;

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {
          app: "ok",
          database: "error",
          dbLatencyMs: dbMs,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 503 },
    );
  }
}
