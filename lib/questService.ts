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
import { userQuestProgress, matchStats } from "../data/schema";
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

// ─── Match progress hook ──────────────────────────────────────────────────────

/**
 * Update quest progress for a user after a match completes.
 *
 * Called fire-and-forget from matchProgression.ts after writeMatchStats commits.
 * Lazy-inits today's quests if not yet assigned (handles players who play before
 * visiting /quests for the first time).
 *
 * @param userId    — the player whose quests to update
 * @param matchUuid — the completed game session UUID
 */
export async function updateQuestProgressOnMatch(
  userId: string,
  matchUuid: string,
): Promise<void> {
  const date = todayUTC();

  // Lazy-init today's quests and get current progress state
  const todayQuests = await getTodayQuests(userId);
  const incomplete = todayQuests.filter((q) => !q.completed);
  if (incomplete.length === 0) return;

  // Fetch this match's stats row
  const [match] = await db
    .select()
    .from(matchStats)
    .where(
      and(
        eq(matchStats.userId, userId),
        eq(matchStats.gameSessionUuid, matchUuid),
      ),
    )
    .limit(1);

  if (!match) return;

  const won = match.result === "win";
  const isSparring = match.isSparring;
  const isRanked = !isSparring;
  const isHardAIWin = won && isSparring && match.aiDifficulty === "hard";

  // Determine progress delta per incomplete quest
  type Update = { quest: QuestWithProgress; delta: number };
  const updates: Update[] = [];

  for (const quest of incomplete) {
    let delta = 0;

    switch (quest.id) {
      case "play_1":
      case "play_3":
      case "play_5":
        delta = 1; // any completed match
        break;
      case "ranked_match":
        if (isRanked) delta = 1;
        break;
      case "try_sparring":
        if (isSparring) delta = 1;
        break;
      case "win_1":
        if (won) delta = 1;
        break;
      case "win_2_ranked":
        if (won && isRanked) delta = 1;
        break;
      case "beat_hard_ai":
        if (isHardAIWin) delta = 1;
        break;
      case "ko_5":
        if (match.enemyKOs >= 5) delta = 1;
        break;
      case "perfect_win":
        if (won && match.ownKOs === 0) delta = 1;
        break;
    }

    if (delta > 0) updates.push({ quest, delta });
  }

  if (updates.length === 0) return;

  // Apply all updates in parallel
  await Promise.all(
    updates.map(({ quest, delta }) => {
      const newProgress = Math.min(quest.progress + delta, quest.target);
      const nowCompleted = newProgress >= quest.target;
      return db
        .update(userQuestProgress)
        .set({
          progress: newProgress,
          completed: nowCompleted,
          ...(nowCompleted ? { completedAt: new Date() } : {}),
        })
        .where(
          and(
            eq(userQuestProgress.userId, userId),
            eq(userQuestProgress.questId, quest.id),
            eq(userQuestProgress.date, date),
          ),
        );
    }),
  );
}
