/**
 * Programmatic drizzle-kit schema push — no TTY / interactive prompts.
 * Uses drizzle-kit/api's pushSchema() with @neondatabase/serverless in
 * WebSocket mode so it works in GHA and any Node/Bun environment.
 *
 * Run: bun run scripts/db-push.ts
 * (Requires DATABASE_URL in env, e.g. via .env.local)
 */

import { pushSchema } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../data/schema";

// Enable WebSocket mode for Node.js / GHA environments
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

console.log("🔍 Comparing schema to database...");

const { hasDataLoss, warnings, statementsToExecute, apply } = await pushSchema(
  schema as Record<string, unknown>,
  db as any
);

if (statementsToExecute.length === 0) {
  console.log("✅ Schema is already in sync — nothing to do.");
  await pool.end();
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
  await pool.end();
  process.exit(1);
}

console.log("\n🚀 Applying...");
await apply();
console.log("✅ Schema synced successfully.");
await pool.end();
