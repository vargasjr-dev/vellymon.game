/**
 * POST /api/admin/matches/simulate
 *
 * Runs a fully-simulated profile-vs-profile (or team-vs-team) match server-side
 * and streams turn-by-turn events via Server-Sent Events (SSE).
 *
 * Body: {
 *   p1: { type: "profile", id: string } | { type: "random" }
 *   p2: { type: "profile", id: string } | { type: "random" }
 *   maxTurns: number      (1-50, default 15)
 *   startingEnergy: number  (1-500, default 120)
 *   winningEnergy: number   (1-2000, default 500)
 * }
 *
 * SSE events:
 *   { type: "turn", turn: number, team1Alive: number, team2Alive: number, energy1: number, energy2: number }
 *   { type: "done", matchId: string, spectateUrl: string, winner: string | null, turns: number }
 *   { type: "error", message: string }
 */

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { db } from "../../../../../../data/db";
import { aiProfile, matchSnapshot } from "../../../../../../data/schema";
import { eq } from "drizzle-orm";
import { VELLYMON_LIBRARY } from "../../../../../../server/vellymonLibrary";
import { buildTeamSetup } from "../../../../../../server/matchSetup";
import "../../../../../../server/powers"; // register all special powers
import {
  initializeGame,
  startTurn,
  resolveTurn,
  isGameActive,
  getWinner,
  type TurnLog,
} from "../../../../../../server/engine";
import { submitCommands } from "../../../../../../server/turnTimer";
import { generateAICommands } from "../../../../../../server/ai-opponent";
import type { GameState } from "../../../../../../server/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type ParticipantConfig =
  | { type: "profile"; id: string }
  | { type: "random" };

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!isAdmin(session)) {
    return new Response("Forbidden", { status: 403 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { p1: ParticipantConfig; p2: ParticipantConfig; maxTurns?: number; startingEnergy?: number; winningEnergy?: number };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const maxTurns = Math.min(50, Math.max(1, body.maxTurns ?? 15));
  const startingEnergy = body.startingEnergy !== undefined
    ? Math.min(500, Math.max(1, body.startingEnergy))
    : undefined;
  const winningEnergy = body.winningEnergy !== undefined
    ? Math.min(2000, Math.max(1, body.winningEnergy))
    : undefined;

  // ── Match rules context (surfaced in AI profile system prompts) ──────────
  // Describes the custom match parameters so LLM-driven profiles know the rules.
  function buildMatchRulesContext(): string {
    const effectiveStarting = startingEnergy ?? 120;
    const effectiveWinning = winningEnergy ?? 500;
    return [
      `Match rules:`,
      `- Max turns: ${maxTurns}`,
      `- Starting energy per team: ${effectiveStarting}`,
      `- Accumulation win threshold: ${effectiveWinning} energy`,
    ].join("\n");
  }

  // ── Resolve participant teams ─────────────────────────────────────────────
  async function resolveTeamNames(
    config: ParticipantConfig,
  ): Promise<{ name: string; teamNames: string[]; profileId?: string; systemPrompt?: string }> {
    if (config.type === "random") {
      const picked = shuffle(VELLYMON_LIBRARY).slice(0, 8);
      return { name: "Random Team", teamNames: picked.map((v) => v.name) };
    }
    const [row] = await db
      .select()
      .from(aiProfile)
      .where(eq(aiProfile.id, config.id));
    if (!row) throw new Error(`Profile not found: ${config.id}`);
    // Prepend match rules to the profile's system prompt so LLM-driven
    // profiles know the current match parameters (energy thresholds, max turns).
    const systemPrompt = [buildMatchRulesContext(), row.description].filter(Boolean).join("\n\n");
    return {
      name: row.name,
      teamNames: row.teamNames as string[],
      profileId: row.id,
      systemPrompt,
    };
  }

  let p1Info: Awaited<ReturnType<typeof resolveTeamNames>>;
  let p2Info: Awaited<ReturnType<typeof resolveTeamNames>>;
  try {
    [p1Info, p2Info] = await Promise.all([
      resolveTeamNames(body.p1),
      resolveTeamNames(body.p2),
    ]);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Setup error" }),
      { status: 400 },
    );
  }

  // ── Build team setups ─────────────────────────────────────────────────────
  function resolveTemplates(names: string[]) {
    return names.map((name) => {
      const t = VELLYMON_LIBRARY.find(
        (v) => v.name.toLowerCase() === name.toLowerCase(),
      );
      if (!t) throw new Error(`Unknown vellymon: "${name}"`);
      return t;
    });
  }

  const setup1 = buildTeamSetup(resolveTemplates(p1Info.teamNames), 1);
  setup1.teamName = p1Info.name;
  const setup2 = buildTeamSetup(resolveTemplates(p2Info.teamNames), 2);
  setup2.teamName = p2Info.name;

  // ── SSE Stream ────────────────────────────────────────────────────────────
  const matchId = shortId();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        const gs = initializeGame(matchId, setup1, setup2, undefined, { startingEnergy, winningEnergy });
        const turnLogs: TurnLog[] = [];
        const turnSnapshots: GameState[] = [
          JSON.parse(JSON.stringify(gs)) as GameState,
        ];

        while (isGameActive(gs) && gs.turn < maxTurns) {
          const timer = startTurn(gs);
          // TODO: replace with LLM runner once profile.description → board state → Haiku
          submitCommands(timer, 1, generateAICommands(gs, 1, "medium"));
          submitCommands(timer, 2, generateAICommands(gs, 2, "medium"));

          const turnLog = resolveTurn(gs, timer);
          turnLogs.push(turnLog);
          turnSnapshots.push(JSON.parse(JSON.stringify(gs)) as GameState);

          const [t1, t2] = gs.teams;
          send({
            type: "turn",
            turn: gs.turn,
            team1Alive: t1.active.filter((v) => !v.isKO).length,
            team2Alive: t2.active.filter((v) => !v.isKO).length,
            energy1: t1.energy,
            energy2: t2.energy,
            winner: gs.result ? getWinner(gs)?.name ?? null : null,
          });

          if (!isGameActive(gs)) break;
        }

        // ── Save snapshot to DB ───────────────────────────────────────────
        await db.insert(matchSnapshot).values({
          id: matchId,
          gameState: gs as unknown as Record<string, unknown>,
          turnSnapshots: turnSnapshots as unknown as Record<string, unknown>[],
          turnLogs: turnLogs as unknown as Record<string, unknown>[],
          status: "completed",
          p1ProfileId: p1Info.profileId ?? null,
          p2ProfileId: p2Info.profileId ?? null,
          triggeredByUserId: session!.user.id,
        });

        const winner = getWinner(gs);
        send({
          type: "done",
          matchId,
          spectateUrl: `/matches/${matchId}/spectate`,
          winner: winner?.name ?? null,
          turns: gs.turn,
        });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Simulation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
