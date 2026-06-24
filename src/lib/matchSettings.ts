/**
 * Match settings types and constants — shared between server and client.
 */

export type MatchMode = "casual" | "ranked";

export type MatchSettings = {
  timerSeconds: 0 | 30 | 90;
  mapId: string;
  mode: MatchMode;
  /** Energy each team starts with. Defaults to GAME_CONFIG.energy.starting (20). */
  startingEnergy?: number;
  /** Energy threshold to win via Accumulation. Defaults to GAME_CONFIG.energy.accumulationWinThreshold (120). */
  winningEnergy?: number;
};

export const TIMER_OPTIONS = [
  { value: 0 as const, label: "No Timer", description: "Unlimited time per turn" },
  { value: 30 as const, label: "30s", description: "Standard competitive" },
  { value: 90 as const, label: "90s", description: "Extended time" },
];

export const MAP_OPTIONS = [
  {
    id: "standard",
    name: "Standard",
    dimensions: "9×5",
    description: "Classic open battlefield",
  },
  {
    id: "the-choke",
    name: "The Choke",
    dimensions: "9×7",
    description: "Void walls force a center chokepoint",
  },
];

export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  timerSeconds: 0,
  mapId: "standard",
  mode: "casual",
};

export const RANKED_MATCH_SETTINGS: MatchSettings = {
  timerSeconds: 30,
  mapId: "standard",
  mode: "ranked",
};
