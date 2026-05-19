/**
 * Achievement catalog for vellymon.game.
 *
 * Each achievement has a static definition here. Unlock logic lives in
 * checkAndAwardAchievements() in lib/achievementService.ts.
 */

export type AchievementCategory =
  | "matches"   // playing/winning matches
  | "ranked"    // ranked progression
  | "collection" // vellymon roster
  | "social"    // profiles, usernames, etc.
  | "sparring"  // AI practice matches
  | "special";  // one-of-a-kind milestones

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: AchievementCategory;
  /**
   * Points value — cosmetic, shown on profile.
   * Common = 10, Uncommon = 25, Rare = 50, Epic = 100, Legendary = 250
   */
  points: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  // ─── Matches ───────────────────────────────────────────────────────────────
  {
    id: "first_match",
    name: "First Steps",
    description: "Play your first match.",
    icon: "🎮",
    category: "matches",
    points: 10,
  },
  {
    id: "first_win",
    name: "First Blood",
    description: "Win your first match.",
    icon: "🏆",
    category: "matches",
    points: 25,
  },
  {
    id: "win_5",
    name: "On a Roll",
    description: "Win 5 matches.",
    icon: "🔥",
    category: "matches",
    points: 25,
  },
  {
    id: "win_25",
    name: "Veteran",
    description: "Win 25 matches.",
    icon: "⚔️",
    category: "matches",
    points: 50,
  },
  {
    id: "win_100",
    name: "Champion",
    description: "Win 100 matches.",
    icon: "👑",
    category: "matches",
    points: 100,
  },
  {
    id: "ko_10",
    name: "KO Artist",
    description: "Score 10 enemy KOs in a single match.",
    icon: "💥",
    category: "matches",
    points: 50,
  },
  {
    id: "perfect_match",
    name: "Untouchable",
    description: "Win a match with zero of your own vellymons KO'd.",
    icon: "🛡️",
    category: "matches",
    points: 50,
  },

  // ─── Ranked ────────────────────────────────────────────────────────────────
  {
    id: "ranked_first",
    name: "Ranked Debut",
    description: "Play your first ranked match.",
    icon: "🥉",
    category: "ranked",
    points: 10,
  },
  {
    id: "rank_silver",
    name: "Silver Standard",
    description: "Reach Silver rank.",
    icon: "🥈",
    category: "ranked",
    points: 25,
  },
  {
    id: "rank_gold",
    name: "Gold Rush",
    description: "Reach Gold rank.",
    icon: "🥇",
    category: "ranked",
    points: 50,
  },
  {
    id: "rank_platinum",
    name: "Platinum Club",
    description: "Reach Platinum rank.",
    icon: "💠",
    category: "ranked",
    points: 50,
  },
  {
    id: "rank_diamond",
    name: "Diamond Trainer",
    description: "Reach Diamond rank.",
    icon: "💎",
    category: "ranked",
    points: 100,
  },
  {
    id: "rank_legend",
    name: "Legendary",
    description: "Reach Legend rank.",
    icon: "👑",
    category: "ranked",
    points: 250,
  },

  // ─── Sparring ──────────────────────────────────────────────────────────────
  {
    id: "sparring_first",
    name: "Training Day",
    description: "Complete your first AI sparring match.",
    icon: "🤖",
    category: "sparring",
    points: 10,
  },
  {
    id: "sparring_hard_win",
    name: "Machine Slayer",
    description: "Beat the Hard AI.",
    icon: "🔴",
    category: "sparring",
    points: 50,
  },
  {
    id: "sparring_10",
    name: "Practice Makes Perfect",
    description: "Complete 10 sparring matches.",
    icon: "🎯",
    category: "sparring",
    points: 25,
  },

  // ─── Collection ────────────────────────────────────────────────────────────
  {
    id: "roster_5",
    name: "Starter Collection",
    description: "Own 5 vellymons.",
    icon: "📦",
    category: "collection",
    points: 10,
  },
  {
    id: "roster_20",
    name: "Collector",
    description: "Own 20 vellymons.",
    icon: "🎒",
    category: "collection",
    points: 25,
  },
  {
    id: "roster_50",
    name: "Hoarder",
    description: "Own 50 vellymons.",
    icon: "🏦",
    category: "collection",
    points: 50,
  },

  // ─── Social ────────────────────────────────────────────────────────────────
  {
    id: "username_set",
    name: "Identity",
    description: "Set your username.",
    icon: "🪪",
    category: "social",
    points: 10,
  },

  // ─── Special ───────────────────────────────────────────────────────────────
  {
    id: "subscriber",
    name: "Pro Trainer",
    description: "Subscribe to Pro.",
    icon: "⭐",
    category: "special",
    points: 50,
  },
];

/** Lookup achievement by ID — returns undefined if not found */
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Total possible points in the catalog */
export const TOTAL_ACHIEVEMENT_POINTS = ACHIEVEMENTS.reduce(
  (sum, a) => sum + a.points,
  0,
);
