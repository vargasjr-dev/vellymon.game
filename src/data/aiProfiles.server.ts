/**
 * Server-side data accessors for aiProfile and related match history.
 */
import { db } from "../../data/db";
import { aiProfile, matchSnapshot } from "../../data/schema";
import { eq, or, desc, and, isNotNull } from "drizzle-orm";

export type AiProfile = typeof aiProfile.$inferSelect;

/** All profiles, newest first. */
export async function listAiProfiles(): Promise<AiProfile[]> {
  return db.select().from(aiProfile).orderBy(desc(aiProfile.createdAt));
}

/** One profile by ID, or null. */
export async function getAiProfile(id: string): Promise<AiProfile | null> {
  const [row] = await db.select().from(aiProfile).where(eq(aiProfile.id, id));
  return row ?? null;
}

/** Create a profile. Throws if ID already exists. */
export async function createAiProfile(data: {
  id: string;
  name: string;
  teamNames: string[];
  aiDifficulty: "easy" | "medium" | "hard";
  description?: string;
}): Promise<AiProfile> {
  const [row] = await db
    .insert(aiProfile)
    .values(data)
    .returning();
  return row;
}

/** Delete a profile. Cascades: matchSnapshot rows get p1/p2 set to null. */
export async function deleteAiProfile(id: string): Promise<void> {
  await db.delete(aiProfile).where(eq(aiProfile.id, id));
}

export type ProfileMatch = {
  id: string;
  uploadedAt: Date;
  status: string;
  p1ProfileId: string | null;
  p2ProfileId: string | null;
  /** Parsed from gameState JSON */
  winner: 1 | 2 | null;
  turns: number;
};

/**
 * All matches that involved a given profile (as p1 or p2), newest first.
 * Returns lightweight rows — no full gameState blob.
 */
export async function getMatchesForProfile(profileId: string): Promise<ProfileMatch[]> {
  const rows = await db
    .select({
      id: matchSnapshot.id,
      uploadedAt: matchSnapshot.uploadedAt,
      status: matchSnapshot.status,
      p1ProfileId: matchSnapshot.p1ProfileId,
      p2ProfileId: matchSnapshot.p2ProfileId,
      gameState: matchSnapshot.gameState,
    })
    .from(matchSnapshot)
    .where(
      or(
        eq(matchSnapshot.p1ProfileId, profileId),
        eq(matchSnapshot.p2ProfileId, profileId),
      ),
    )
    .orderBy(desc(matchSnapshot.uploadedAt));

  return rows.map((r) => {
    const gs = r.gameState as { result?: { winner?: 1 | 2 }; turn?: number } | null;
    return {
      id: r.id,
      uploadedAt: r.uploadedAt,
      status: r.status,
      p1ProfileId: r.p1ProfileId,
      p2ProfileId: r.p2ProfileId,
      winner: gs?.result?.winner ?? null,
      turns: gs?.turn ?? 0,
    };
  });
}

/**
 * Head-to-head record between two profiles.
 * Returns { wins, losses, draws } from p1's perspective.
 */
export async function getHeadToHead(
  p1Id: string,
  p2Id: string,
): Promise<{ wins: number; losses: number; draws: number }> {
  const rows = await db
    .select({
      p1ProfileId: matchSnapshot.p1ProfileId,
      p2ProfileId: matchSnapshot.p2ProfileId,
      gameState: matchSnapshot.gameState,
    })
    .from(matchSnapshot)
    .where(
      or(
        and(eq(matchSnapshot.p1ProfileId, p1Id), eq(matchSnapshot.p2ProfileId, p2Id)),
        and(eq(matchSnapshot.p1ProfileId, p2Id), eq(matchSnapshot.p2ProfileId, p1Id)),
      ),
    );

  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const r of rows) {
    const gs = r.gameState as { result?: { winner?: 1 | 2 } } | null;
    const winner = gs?.result?.winner ?? null;
    if (!winner) {
      draws++;
    } else if (
      (r.p1ProfileId === p1Id && winner === 1) ||
      (r.p2ProfileId === p1Id && winner === 2)
    ) {
      wins++;
    } else {
      losses++;
    }
  }

  return { wins, losses, draws };
}
