/**
 * Daily Quest service — assignment, progress reading, and reward claiming.
 *
 * Three quests are assigned per player per day (one per category: battles/wins/performance).
 * Assignment is seeded by userId + date so the same 3 quests are always returned for
 * a given player on a given day, even across multiple calls.
 *
 * Quests reset at midnight UTC — date key format: "YYYY-MM-DD".
 */

import { db } from "../data/db";
import { userQuestProgress } from "../data/schema";
import { eq, and } from "drizzle-orm";
import {
  DAILY_QUESTS,
  QUEST_IDS_BY_CATEGORY,
  QUESTS_PER_DAY,
  type DailyQuest,
  type QuestCategory,
} from "./quests";
import { awardXP } from "./seasons";
import { grantCredits } from "./currency";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestWithProgress = DailyQuest & {
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
  completedAt: Date | null;
  /** UTC date string this quest belongs to — "YYYY-MM-DD" */
  date: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's UTC date as "YYYY-MM-DD" */
export function todayUTC(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Deterministic hash of a string — returns a non-negative 32-bit integer.
 * Used to seed per-user per-day quest selection.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // keep 32-bit
  }
  return Math.abs(hash);
}

/**
 * Pick a quest ID from a category, seeded by userId + date + category.
 * Stable: same user on same day always gets the same quest per category.
 */
function pickQuestId(userId: string, date: string, category: QuestCategory): string {
  const seed = simpleHash(`${userId}:${date}:${category}`);
  const ids = QUEST_IDS_BY_CATEGORY[category];
  return ids[seed % ids.length];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get today's 3 daily quests for a user, lazily creating rows if they don't exist yet.
 *
 * One quest per category (battles, wins, performance) — seeded for consistency.
 * Returns the quests with live progress data.
 */
export async function getTodayQuests(userId: string): Promise<QuestWithProgress[]> {
  const date = todayUTC();

  // Load existing progress rows for today
  const existing = await db
    .select()
    .from(userQuestProgress)
    .where(and(eq(userQuestProgress.userId, userId), eq(userQuestProgress.date, date)));

  const existingIds = new Set(existing.map((r) => r.questId));

  // Determine which of the 3 assigned quest IDs are missing
  const categories: QuestCategory[] = ["battles", "wins", "performance"];
  const assignedIds = categories.map((cat) => pickQuestId(userId, date, cat));

  const toInsert = assignedIds.filter((id) => !existingIds.has(id));

  if (toInsert.length > 0) {
    await db.insert(userQuestProgress).values(
      toInsert.map((questId) => ({ userId, questId, date })),
    );
  }

  // Re-fetch to get all rows (including freshly inserted ones)
  const allRows = toInsert.length > 0
    ? await db
        .select()
        .from(userQuestProgress)
        .where(and(eq(userQuestProgress.userId, userId), eq(userQuestProgress.date, date)))
    : existing;

  // Build QuestWithProgress by joining catalog data with progress rows
  const result: QuestWithProgress[] = [];
  for (const questId of assignedIds) {
    const quest = DAILY_QUESTS.find((q) => q.id === questId);
    if (!quest) continue;
    const row = allRows.find((r) => r.questId === questId);
    result.push({
      ...quest,
      progress: row?.progress ?? 0,
      completed: row?.completed ?? false,
      rewardClaimed: row?.rewardClaimed ?? false,
      completedAt: row?.completedAt ?? null,
      date,
    });
  }

  return result;
}

/**
 * Claim the reward for a completed daily quest.
 *
 * Idempotent — calling twice returns 0 on the second call.
 * Awards XP via the active season and credits via the currency system.
 *
 * @returns { xpAwarded, creditsAwarded } — both 0 if already claimed or not completed
 */
export async function claimQuestReward(
  userId: string,
  questId: string,
  date: string,
): Promise<{ xpAwarded: number; creditsAwarded: number }> {
  const [row] = await db
    .select()
    .from(userQuestProgress)
    .where(
      and(
        eq(userQuestProgress.userId, userId),
        eq(userQuestProgress.questId, questId),
        eq(userQuestProgress.date, date),
      ),
    )
    .limit(1);

  // Guard: must be completed and not yet claimed
  if (!row || !row.completed || row.rewardClaimed) {
    return { xpAwarded: 0, creditsAwarded: 0 };
  }

  const quest = DAILY_QUESTS.find((q) => q.id === questId);
  if (!quest) return { xpAwarded: 0, creditsAwarded: 0 };

  // Mark as claimed first (optimistic — prevents double-claim race)
  await db
    .update(userQuestProgress)
    .set({ rewardClaimed: true })
    .where(
      and(
        eq(userQuestProgress.userId, userId),
        eq(userQuestProgress.questId, questId),
        eq(userQuestProgress.date, date),
      ),
    );

  // Grant XP and credits in parallel
  await Promise.all([
    awardXP(userId, quest.xpReward, "daily_quest"),
    grantCredits(userId, quest.creditsReward, "daily_quest", `Daily quest: ${quest.name}`),
  ]);

  return { xpAwarded: quest.xpReward, creditsAwarded: quest.creditsReward };
}
