/**
 * One-time backfill: assign triggeredByUserId on all profile-vs-profile
 * matchSnapshot rows that were run from the admin panel before the field existed.
 *
 * Run with:
 *   bun --env-file=.env.local scripts/backfill-simulation-owner.ts <userId>
 *
 * Example:
 *   bun --env-file=.env.local scripts/backfill-simulation-owner.ts i9boKPydovcbuvFFlL7sLwRXti7bdb1i
 */

import { db } from "../data/db";
import { matchSnapshot } from "../data/schema";
import { isNull, isNotNull } from "drizzle-orm";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: bun --env-file=.env.local scripts/backfill-simulation-owner.ts <userId>");
  process.exit(1);
}

// Preview first
const targets = await db
  .select({ id: matchSnapshot.id, p1ProfileId: matchSnapshot.p1ProfileId, uploadedAt: matchSnapshot.uploadedAt })
  .from(matchSnapshot)
  .where(isNull(matchSnapshot.triggeredByUserId));

const profileTargets = targets.filter((r) => r.p1ProfileId !== null);
console.log(`Found ${profileTargets.length} profile snapshot(s) with null triggeredByUserId:`);
for (const r of profileTargets) {
  console.log(`  ${r.id}  p1=${r.p1ProfileId}  ${r.uploadedAt.toISOString()}`);
}

if (profileTargets.length === 0) {
  console.log("Nothing to backfill.");
  process.exit(0);
}

console.log(`\nBackfilling triggeredByUserId = "${userId}"...`);

// Update only rows that have a p1ProfileId and no triggeredByUserId yet
import { and } from "drizzle-orm";
const result = await db
  .update(matchSnapshot)
  .set({ triggeredByUserId: userId })
  .where(and(isNull(matchSnapshot.triggeredByUserId), isNotNull(matchSnapshot.p1ProfileId)));

console.log("Done.");
