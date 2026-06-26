/**
 * GET /api/llm-requests?matchId=X&turn=Y&teamId=Z
 *
 * Returns the stored LLM request/response log for a given (match, turn, team).
 * Used by the spectate/watch debug UI to show what the AI was thinking.
 *
 * No auth required — spectating is public and logs contain no sensitive data.
 */

import { NextResponse } from "next/server";
import { db } from "../../../../data/db";
import { llmRequest } from "../../../../data/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  const turnStr = searchParams.get("turn");
  const teamIdStr = searchParams.get("teamId");

  if (!matchId || !turnStr || !teamIdStr) {
    return NextResponse.json(
      { error: "matchId, turn, and teamId are required" },
      { status: 400 },
    );
  }

  const turn = parseInt(turnStr, 10);
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(turn) || isNaN(teamId) || (teamId !== 1 && teamId !== 2)) {
    return NextResponse.json({ error: "Invalid turn or teamId" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(llmRequest)
    .where(
      and(
        eq(llmRequest.matchId, matchId),
        eq(llmRequest.turn, turn),
        eq(llmRequest.teamId, teamId),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "No LLM log found for this turn" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    matchId: row.matchId,
    turn: row.turn,
    teamId: row.teamId,
    profileId: row.profileId,
    model: row.model,
    systemPrompt: row.systemPrompt,
    userMessage: row.userMessage,
    rawResponse: row.rawResponse,
    commands: row.commands,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
  });
}
