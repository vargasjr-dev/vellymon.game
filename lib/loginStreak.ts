/**
 * Daily Login Streak — streak config, types, and catalog.
 *
 * One check-in per UTC day. Streak increments when claimed on consecutive days,
 * resets to 1 if more than one day is skipped. Subscriber perk: streak freezes
 * auto-apply when a day is missed (implemented in Phase 16 item 6).
 *
 * Milestone rewards are awarded on top of the base daily reward when the player
 * hits a streak milestone for the first time (checked by exact streak value match).
 */

// ─── Config ───────────────────────────────────────────────────────────────────

/** Base XP awarded for every successful daily check-in */
export const BASE_DAILY_XP = 25;

/** Base credits awarded for every successful daily check-in */
export const BASE_DAILY_CREDITS = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreakMilestone = {
  /** Day count that triggers this milestone */
  days: number;
  /** Bonus XP added on top of BASE_DAILY_XP */
  xpBonus: number;
  /** Bonus credits added on top of BASE_DAILY_CREDITS */
  creditsBonus: number;
  /** Short celebratory label shown in the UI */
  label: string;
  /** Emoji displayed with the milestone */
  icon: string;
};

export type LoginStreakRow = {
  currentStreak: number;
  longestStreak: number;
  lastClaimedDate: string; // "YYYY-MM-DD" UTC
  totalClaimed: number;
  streakFreezeCount: number;
  lastFreezeGrantDate: string; // "YYYY-MM-DD" UTC
};

export type DailyCheckInResult = {
  /** True when the player already claimed today and the call was a no-op */
  alreadyClaimed: boolean;
  /** Updated streak count after this claim */
  newStreak: number;
  /** XP awarded this claim (base + milestone bonus) */
  xpAwarded: number;
  /** Credits awarded this claim (base + milestone bonus) */
  creditsAwarded: number;
  /** Set when this claim hit a streak milestone */
  milestoneHit?: StreakMilestone;
  /** Set when a streak freeze was consumed to save a broken streak */
  usedFreeze?: boolean;
  /** Updated freeze count after this claim (for subscriber display) */
  freezeCount?: number;
};

// ─── Milestone catalog ────────────────────────────────────────────────────────

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 3,
    xpBonus: 75,
    creditsBonus: 20,
    label: "Warming Up",
    icon: "🔥",
  },
  {
    days: 7,
    xpBonus: 200,
    creditsBonus: 50,
    label: "One Week Strong",
    icon: "🔥🔥",
  },
  {
    days: 14,
    xpBonus: 400,
    creditsBonus: 100,
    label: "Two Weeks",
    icon: "🔥🔥🔥",
  },
  {
    days: 21,
    xpBonus: 600,
    creditsBonus: 150,
    label: "Three Weeks",
    icon: "💥🔥💥",
  },
  {
    days: 30,
    xpBonus: 1000,
    creditsBonus: 250,
    label: "Monthly Legend",
    icon: "🏆",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's UTC date as "YYYY-MM-DD" — same pattern as quest service */
export function todayUTCDate(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns yesterday's UTC date as "YYYY-MM-DD" */
export function yesterdayUTCDate(): string {
  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
  const y = yesterday.getUTCFullYear();
  const m = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(yesterday.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Return the milestone that matches this exact streak value, or undefined.
 * Milestones only trigger once — on the exact day count, not on every day above it.
 */
export function getMilestoneForStreak(streak: number): StreakMilestone | undefined {
  return STREAK_MILESTONES.find((m) => m.days === streak);
}

/**
 * Return the next milestone the player hasn't hit yet, or undefined if
 * they're past all milestones.
 */
export function getNextMilestone(streak: number): StreakMilestone | undefined {
  return STREAK_MILESTONES.find((m) => m.days > streak);
}

/** Default streak row for players with no record yet */
export const DEFAULT_STREAK_ROW: LoginStreakRow = {
  currentStreak: 0,
  longestStreak: 0,
  lastClaimedDate: "",
  totalClaimed: 0,
  streakFreezeCount: 0,
  lastFreezeGrantDate: "",
};
