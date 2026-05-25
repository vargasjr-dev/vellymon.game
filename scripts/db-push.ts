/**
 * Programmatic drizzle-kit schema push — no TTY / interactive prompts.
 * Uses drizzle-kit/api's pushSchema() which returns SQL statements and an
 * apply() callback, so we can inspect and execute without any CLI interaction.
 *
 * Run: bun run scripts/db-push.ts
 * (Requires DATABASE_URL in env, e.g. via .env.local)
 */

import { pushSchema } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../data/schema";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

console.log("🔍 Comparing schema to database...");

const { hasDataLoss, warnings, statementsToExecute, apply } = await pushSchema(
  schema as Record<string, unknown>,
  db as any
);

if (statementsToExecute.length === 0) {
  console.log("✅ Schema is already in sync — nothing to do.");
  process.exit(0);
}

console.log(`\n📋 Statements to execute (${statementsToExecute.length}):`);
statementsToExecute.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

if (warnings.length > 0) {
  console.log("\n⚠️  Warnings:");
  warnings.forEach((w) => console.log(`  - ${w}`));
}

if (hasDataLoss) {
  console.error(
    "\n🚨 Data loss detected — refusing to apply automatically in CI."
  );
  console.error(
    "   Review the statements above and apply manually if safe to do so."
  );
  process.exit(1);
}

console.log("\n🚀 Applying...");
await apply();
console.log("✅ Schema synced successfully.");
