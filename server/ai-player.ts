/**
 * AI player dispatcher — routes command generation to the profile's chosen
 * player model.  "claude" uses the Anthropic JSON-command interface
 * (ai-llm.ts); "jev" uses the TypeSafe System One Choice interface (ai-jev.ts).
 */

import type { GameState } from "./types";
import type { Command } from "./commands";
import { generateLlmAICommands } from "./ai-llm";
import { generateJevAICommands } from "./ai-jev";

export type AIPlayerModel = "claude" | "jev";

export type AIPlayerOptions = {
  matchId: string;
  turn: number;
  profileId?: string;
  /** Which player model drives this team. Defaults to "claude". */
  model?: AIPlayerModel;
  /** Claude path: full system prompt (match rules + profile strategy). */
  systemPrompt?: string;
  /** Jev path: profile strategy text injected into question instructions. */
  strategy?: string;
};

export function isAIPlayerModel(value: string | null | undefined): value is AIPlayerModel {
  return value === "claude" || value === "jev";
}

export async function generateAIPlayerCommands(
  state: GameState,
  aiTeamId: 1 | 2,
  opts: AIPlayerOptions,
): Promise<Command[]> {
  if (opts.model === "jev") {
    return generateJevAICommands(state, aiTeamId, {
      matchId: opts.matchId,
      turn: opts.turn,
      profileId: opts.profileId,
      strategy: opts.strategy,
    });
  }
  return generateLlmAICommands(state, aiTeamId, {
    matchId: opts.matchId,
    turn: opts.turn,
    profileId: opts.profileId,
    systemPrompt: opts.systemPrompt,
  });
}
